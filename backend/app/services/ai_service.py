"""
AI Service — streams responses from Claude or falls back to a mock streamer.
"""
import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation import Message, MessageRole, Conversation
from app.models.knowledge import DocumentChunk, Document

logger = logging.getLogger(__name__)

# Mock responses keyed by topic detection
MOCK_RESPONSES = {
    "default": (
        "I'm KnowledgeForge AI, your intelligent knowledge assistant. "
        "I can help you search through your documents, answer questions based on your knowledge base, "
        "and provide insights from your uploaded content. "
        "Since no Anthropic API key is configured, I'm running in demo mode. "
        "To enable full AI capabilities, please add your ANTHROPIC_API_KEY to the environment variables. "
        "What would you like to explore in your knowledge base today?"
    ),
    "hello": (
        "Hello! I'm KnowledgeForge AI, your intelligent knowledge copilot. "
        "I'm here to help you navigate and extract insights from your document library. "
        "I can answer questions, summarize documents, find relevant information, "
        "and help you discover connections across your knowledge base. "
        "What can I help you with today?"
    ),
    "help": (
        "Here's what I can help you with:\n\n"
        "**Document Q&A** — Ask questions about any document in your knowledge base and I'll find the relevant sections.\n\n"
        "**Knowledge Search** — Search across all your documents simultaneously with semantic understanding.\n\n"
        "**Summarization** — Get concise summaries of long documents or entire collections.\n\n"
        "**Research Assistance** — I'll gather information from multiple sources to answer complex questions.\n\n"
        "**Gap Analysis** — I can identify what topics are missing from your knowledge base.\n\n"
        "What would you like to explore?"
    ),
    "document": (
        "I can help you work with your documents! Here's how:\n\n"
        "1. **Upload documents** via the Knowledge section — I support PDF, DOCX, and text files.\n"
        "2. **Ask questions** directly in this chat — I'll search your documents for relevant answers.\n"
        "3. **Browse chunks** — Each document is split into searchable chunks for precise retrieval.\n\n"
        "Once your documents are indexed, I can provide accurate citations and source references with every answer. "
        "Would you like to upload a document now, or do you have a specific question about your existing content?"
    ),
    "search": (
        "Great question about search! KnowledgeForge uses semantic search to find the most relevant content in your knowledge base.\n\n"
        "Unlike keyword search, semantic search understands the **meaning** behind your query. "
        "For example, searching for 'revenue growth' will also find documents about 'sales increase' or 'financial performance improvement'.\n\n"
        "You can also:\n"
        "- Filter by document type, collection, or date range\n"
        "- Save frequent searches for quick access\n"
        "- View trending searches across your team\n\n"
        "Try the Search tab to explore your knowledge base!"
    ),
}


def _detect_topic(message: str) -> str:
    """Simple keyword detection to vary mock responses."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["hello", "hi", "hey", "greet"]):
        return "hello"
    if any(w in msg_lower for w in ["help", "what can", "capabilities", "feature"]):
        return "help"
    if any(w in msg_lower for w in ["document", "upload", "pdf", "file"]):
        return "document"
    if any(w in msg_lower for w in ["search", "find", "look", "query"]):
        return "search"
    return "default"


# Keywords that signal the user wants real-time / current information
_WEB_SEARCH_KEYWORDS = {
    "latest", "current", "today", "now", "recent", "news", "trending",
    "live", "breaking", "update", "yesterday", "this week", "this month",
    "2025", "2026", "real-time", "just announced", "new release",
}


def _needs_web_search(query: str, kb_sources: list) -> bool:
    """Return True when the query should be augmented with a web search.

    Rules (in priority order):
    1. Time-sensitive keywords (latest, now, today, news…) → always search web.
    2. KB returned no chunks at all → search web.
    3. KB returned only low-relevance filler (score ≤ 0.4) — i.e. no chunk
       actually keyword-matched the query → search web as fallback.
    """
    query_lower = query.lower()
    if any(kw in query_lower for kw in _WEB_SEARCH_KEYWORDS):
        return True
    if not kb_sources:
        return True
    # Fill-only chunks all have score 0.4; keyword-matched chunks score > 0.4
    has_relevant_match = any(s.get("relevanceScore", 0) > 0.4 for s in kb_sources)
    return not has_relevant_match


async def _tavily_web_search(query: str, max_results: int = 5) -> list:
    """Call the Tavily Search API and return sources in the same shape as KB sources."""
    import httpx

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": settings.TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
        "search_depth": "basic",
        "include_answer": False,
        "include_raw_content": False,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.warning(f"Tavily web search failed: {e}")
        return []

    sources = []
    for result in data.get("results", []):
        sources.append({
            "id": str(uuid.uuid4()),
            "documentId": str(uuid.uuid4()),
            "documentName": result.get("title", "Web Result"),
            "documentType": "web",
            "pageNumber": None,
            "chunkText": result.get("content", "")[:300],
            "relevanceScore": round(float(result.get("score", 0.7)), 3),
            "url": result.get("url"),
            "connectorType": "web_search",
            "sourceType": "web",
        })
    return sources


async def _google_web_search(query: str, max_results: int = 5) -> list:
    """Call Google Custom Search API and return sources in the same shape as KB/Tavily sources."""
    import httpx

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": settings.GOOGLE_API_KEY,
        "cx": settings.GOOGLE_CSE_ID,
        "q": query,
        "num": min(max_results, 10),  # Google CSE max is 10 per request
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.warning(f"Google web search failed: {e}")
        return []

    sources = []
    for item in data.get("items", []):
        snippet = item.get("snippet", "")
        sources.append({
            "id": str(uuid.uuid4()),
            "documentId": str(uuid.uuid4()),
            "documentName": item.get("title", "Google Result"),
            "documentType": "web",
            "pageNumber": None,
            "chunkText": snippet[:300],
            "relevanceScore": 0.75,
            "url": item.get("link"),
            "connectorType": "google_search",
            "sourceType": "web",
        })
    return sources


_STOP_WORDS = {
    "what", "which", "where", "when", "who", "how", "why", "the", "are",
    "was", "were", "has", "have", "had", "this", "that", "these", "those",
    "can", "does", "did", "will", "would", "could", "should", "may", "might",
    "and", "but", "for", "with", "about", "from", "into", "more", "than",
    "its", "their", "your", "our", "his", "her", "any", "all", "not", "you",
    "tell", "give", "show", "find", "get", "make", "just", "like", "some",
    "there", "also", "well", "then", "say", "ask", "want", "need", "use",
    "please", "help", "know", "does", "she", "they", "them", "him", "her",
}


async def _search_relevant_chunks(
    query: str, db: AsyncSession, limit: int = 8, user_id: Optional[uuid.UUID] = None
) -> list:
    """Retrieve document chunks for RAG context.

    Strategy:
    1. Always load the first 3 chunks of EVERY indexed document so the AI has
       full knowledge base coverage regardless of query keywords.
    2. Boost keyword-matched chunks to the front (higher relevance score).
    This ensures no document is invisible to the AI.
    """
    from sqlalchemy import or_

    try:
        words = [
            w.strip().lower() for w in query.split()
            if len(w.strip()) > 2 and w.strip().lower() not in _STOP_WORDS
        ]

        # ── Step 1: Keyword-matched chunks (boosted relevance) ──────────────
        matched_sources: list = []
        covered_docs: set = set()

        if words:
            filters = [DocumentChunk.content.ilike(f"%{w}%") for w in words[:8]]
            name_filters = [Document.name.ilike(f"%{w}%") for w in words[:4]]
            kw_q = (
                select(DocumentChunk, Document)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(or_(*filters, *name_filters))
            )
            if user_id:
                kw_q = kw_q.where(Document.user_id == user_id, Document.status == "indexed")
            kw_q = kw_q.order_by(Document.created_at.desc(), DocumentChunk.chunk_index.asc())
            kw_q = kw_q.limit(limit * 6)

            kw_result = await db.execute(kw_q)
            seen_kw: dict[str, int] = {}
            for chunk, doc in kw_result.all():
                doc_id = str(doc.id)
                if seen_kw.get(doc_id, 0) >= 5:
                    continue
                seen_kw[doc_id] = seen_kw.get(doc_id, 0) + 1
                covered_docs.add(doc_id)
                chunk_lower = chunk.content.lower()
                matched = [w for w in words if w in chunk_lower]
                rel = round(len(matched) / max(len(words), 1), 3)
                matched_sources.append({
                    "id": str(uuid.uuid4()),
                    "documentId": doc_id,
                    "documentName": doc.original_name or doc.name,
                    "documentType": doc.file_type,
                    "pageNumber": None,
                    "chunkText": chunk.content,
                    "relevanceScore": min(0.95, round(0.5 + rel * 0.5, 3)),
                    "url": None,
                    "connectorType": None,
                    "sourceType": "knowledge_base",
                })

        # ── Step 2: Fill in uncovered docs (up to 5 extra docs, 2 chunks each) ──
        # Only run if keyword search didn't cover many documents already
        fill_sources: list = []
        if len(covered_docs) < 8:
            fill_q = (
                select(DocumentChunk, Document)
                .join(Document, DocumentChunk.document_id == Document.id)
            )
            if user_id:
                fill_q = fill_q.where(Document.user_id == user_id, Document.status == "indexed")
            fill_q = fill_q.order_by(Document.created_at.desc(), DocumentChunk.chunk_index.asc())
            fill_q = fill_q.limit(60)  # bounded — max 30 docs × 2 chunks

            fill_result = await db.execute(fill_q)
            seen_fill: dict[str, int] = {}
            extra_docs = 0
            for chunk, doc in fill_result.all():
                doc_id = str(doc.id)
                if doc_id in covered_docs:
                    continue
                if extra_docs >= 5 and doc_id not in seen_fill:
                    continue  # cap at 5 extra docs
                if seen_fill.get(doc_id, 0) >= 2:
                    continue
                if doc_id not in seen_fill:
                    extra_docs += 1
                seen_fill[doc_id] = seen_fill.get(doc_id, 0) + 1
                fill_sources.append({
                    "id": str(uuid.uuid4()),
                    "documentId": doc_id,
                    "documentName": doc.original_name or doc.name,
                    "documentType": doc.file_type,
                    "pageNumber": None,
                    "chunkText": chunk.content,
                    "relevanceScore": 0.4,
                    "url": None,
                    "connectorType": None,
                    "sourceType": "knowledge_base",
                })

        # Keyword-matched first (high relevance), then fill (coverage)
        return matched_sources + fill_sources

    except Exception as e:
        logger.warning(f"Chunk search failed: {e}")
        return []


async def _list_user_documents(user_id: uuid.UUID, db: AsyncSession) -> list:
    """Return a detailed inventory of all indexed documents for a specific user."""
    try:
        result = await db.execute(
            select(Document)
            .where(Document.user_id == user_id, Document.status == "indexed")
            .order_by(Document.created_at.desc())
            .limit(200)
        )
        docs = result.scalars().all()
        inventory = []
        for doc in docs:
            size_note = ""
            if doc.file_size:
                if doc.file_size >= 1_048_576:
                    size_note = f"{doc.file_size / 1_048_576:.1f} MB"
                else:
                    size_note = f"{doc.file_size // 1024} KB"
            entry = {
                "id": str(doc.id),
                "name": doc.original_name or doc.name,
                "type": doc.file_type,
                "status": doc.status,
                "wordCount": doc.word_count or 0,
                "pageCount": doc.page_count or 0,
                "fileSize": size_note,
                "uploadedAt": doc.created_at.strftime("%Y-%m-%d") if doc.created_at else "",
                "tags": doc.tags or [],
            }
            inventory.append(entry)
        return inventory
    except Exception as e:
        logger.warning(f"Document inventory query failed: {e}")
        return []


async def _mock_stream(user_message: str) -> AsyncGenerator[str, None]:
    """Stream a mock response word by word with a small delay."""
    topic = _detect_topic(user_message)
    response = MOCK_RESPONSES.get(topic, MOCK_RESPONSES["default"])
    words = response.split(" ")

    for i, word in enumerate(words):
        # Add space before word (except first)
        chunk = (" " if i > 0 else "") + word
        yield chunk
        await asyncio.sleep(0.04)


def _build_user_content(text: str, images: Optional[List[str]]) -> object:
    """
    Return a plain string when there are no images, or a multimodal list when
    images are present (supported by both OpenAI vision and Claude 3+).
    """
    if not images:
        return text
    parts: List[dict] = [{"type": "text", "text": text}]
    for data_uri in images:
        parts.append({"type": "image_url", "image_url": {"url": data_uri}})
    return parts


async def _claude_stream(
    messages_payload: List[dict],
    model: str,
    system_prompt: Optional[str],
) -> AsyncGenerator[str, None]:
    """Stream from Anthropic Claude API."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    kwargs = {
        "model": model,
        "max_tokens": 2048,
        "messages": messages_payload,
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    async with client.messages.stream(**kwargs) as stream:
        async for text in stream.text_stream:
            yield text


async def _openai_stream(
    messages_payload: List[dict],
    model: str,
    system_prompt: Optional[str],
) -> AsyncGenerator[str, None]:
    """Stream from OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    openai_messages = []
    if system_prompt:
        openai_messages.append({"role": "system", "content": system_prompt})
    openai_messages.extend(messages_payload)

    # Map Claude model names to OpenAI equivalents; use gpt-4o for vision
    openai_model = model
    if "claude" in model.lower():
        openai_model = "gpt-4o-mini"

    # If any user message has image_url parts, upgrade to gpt-4o (vision capable)
    has_images = any(
        isinstance(m.get("content"), list) and
        any(p.get("type") == "image_url" for p in m["content"])
        for m in openai_messages
    )
    if has_images and openai_model == "gpt-4o-mini":
        openai_model = "gpt-4o"

    stream = await client.chat.completions.create(
        model=openai_model,
        messages=openai_messages,
        max_tokens=2048,
        stream=True,
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content
        if text:
            yield text


async def get_simple_response(prompt: str) -> str:
    """Non-streaming single AI call — used for recap generation etc."""
    if settings.has_anthropic_key:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text
    elif settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        return res.choices[0].message.content or ""
    return "Meeting recap generation requires an AI API key."


async def stream_chat_response(
    conversation_id: uuid.UUID,
    messages: List[Message],
    model: str,
    db: AsyncSession,
    user_message_content: str,
    system_prompt: Optional[str] = None,
    images: Optional[List[str]] = None,
    user_id: Optional[uuid.UUID] = None,
    use_web_search: bool = False,
) -> AsyncGenerator[dict, None]:
    """
    Main streaming generator. Yields dicts that will be serialized to SSE frames.

    Sequence:
      1. sources chunk (RAG citations)
      2. delta chunks (content pieces)
      3. done chunk (with saved message_id)
    """
    start_time = time.time()

    # --- 0. Fetch document inventory so Claude knows what's in the KB ------
    doc_inventory: list = []
    if user_id:
        doc_inventory = await _list_user_documents(user_id, db)

    # --- 1. Search knowledge base (scoped to this user) ---
    kb_sources = await _search_relevant_chunks(user_message_content, db, user_id=user_id)

    # --- 1b. Decide whether to also query the web ---
    web_sources: list = []
    should_search_web = use_web_search or _needs_web_search(user_message_content, kb_sources)

    if should_search_web:
        logger.info("Web search triggered (forced=%s) for query: %s", use_web_search, user_message_content[:80])
        search_tasks = []
        if settings.has_tavily_key:
            search_tasks.append(_tavily_web_search(user_message_content))
        if settings.has_google_search:
            search_tasks.append(_google_web_search(user_message_content))

        if search_tasks:
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    web_sources.extend(r)
            # De-duplicate by URL
            seen_urls: set = set()
            deduped = []
            for s in web_sources:
                url = s.get("url") or s["id"]
                if url not in seen_urls:
                    seen_urls.add(url)
                    deduped.append(s)
            web_sources = deduped
        else:
            logger.info("Web search requested but neither TAVILY_API_KEY nor GOOGLE_API_KEY+GOOGLE_CSE_ID are configured")

    sources = kb_sources + web_sources
    yield {"type": "sources", "sources": sources}

    # --- 2. Build context for the AI ---
    messages_payload = []
    for i, msg in enumerate(messages):
        role = msg.role.value if hasattr(msg.role, "value") else msg.role
        if role not in ("user", "assistant"):
            continue
        # Attach images to the last user message (the one just sent)
        is_last = i == len(messages) - 1
        if role == "user" and is_last and images:
            content = _build_user_content(msg.content, images)
        else:
            content = msg.content
        messages_payload.append({"role": role, "content": content})

    # Build system prompt with RAG context from both KB and web sources
    effective_system = system_prompt or (
        "You are KnowledgeForge AI, a helpful AI assistant and knowledge copilot. "
        "You have two capabilities: (1) searching the user's private knowledge base of uploaded documents, "
        "and (2) answering any general question using your broad training knowledge.\n\n"
        "## STRICT rules — never break these:\n"
        "1. NEVER say a question is 'outside your scope' or that you 'cannot help' with it. "
        "You are a general-purpose AI assistant that ALWAYS tries to answer.\n"
        "2. NEVER tell the user to go check an external news site (Reuters, BBC, AP, etc.) instead of answering. "
        "Always give the best answer you can first, then optionally mention where to get more.\n"
        "3. NEVER refuse a question just because it is not in the knowledge base. "
        "Answer from your training knowledge and say so briefly.\n"
        "4. For current events or real-time questions: answer with what you know from your training data "
        "(state your knowledge cutoff if relevant), summarise the situation, "
        "and let the user know they can select the 'Web' tab in the chat for live search results.\n"
        "5. If web search results are provided below, use them as the primary source for time-sensitive questions "
        "and cite the URLs.\n\n"
        "## Answering priority:\n"
        "- Knowledge base excerpts provided → cite them and answer from them.\n"
        "- Web search results provided → use them for current/live information.\n"
        "- Neither available → answer confidently from your training knowledge.\n\n"
        "Be concise, accurate, and professional. Do not use emojis or filler phrases."
    )

    # Include document inventory so the AI knows ALL files in the user's KB
    if doc_inventory:
        lines = []
        for d in doc_inventory:
            meta_parts = []
            if d["wordCount"]:
                meta_parts.append(f"{d['wordCount']} words")
            if d["pageCount"]:
                meta_parts.append(f"{d['pageCount']} pages")
            if d["fileSize"]:
                meta_parts.append(d["fileSize"])
            if d["uploadedAt"]:
                meta_parts.append(f"uploaded {d['uploadedAt']}")
            if d["tags"]:
                meta_parts.append(f"tags: {', '.join(d['tags'])}")
            if d["type"] == "video" and d["wordCount"] < 5:
                meta_parts.append("no transcript — visual analysis requires Google Gemini key")
            meta = f" ({'; '.join(meta_parts)})" if meta_parts else ""
            lines.append(f"- [{d['type'].upper()}] {d['name']}{meta}")
        inventory_text = "\n".join(lines)
        effective_system += (
            f"\n\n## User's Knowledge Base ({len(doc_inventory)} document(s)):\n{inventory_text}\n\n"
            "When the user asks 'what files do I have', 'list my documents', or asks about a specific "
            "document by name or type, refer to this inventory. "
            "If a video has no transcript, explain that audio/visual transcription requires an AI key."
        )

    if kb_sources:
        # Cap context at 20 chunks to avoid oversized prompts
        capped = kb_sources[:20]
        context_text = "\n\n".join(
            f"[Source: {s['documentName']} ({s['documentType'].upper()})]\n{s['chunkText']}"
            for s in capped
        )
        effective_system += (
            f"\n\n## Relevant content from the knowledge base ({len(capped)} excerpt(s)):\n"
            f"{context_text}\n\n"
            "When the user's question relates to the above content, base your answer on it "
            "and cite which document(s) the information comes from."
        )
    if web_sources:
        web_context = "\n\n".join(
            f"[Web — {s['documentName']}]({s['url']})\n{s['chunkText']}" for s in web_sources
        )
        effective_system += (
            f"\n\n## Real-time web search results:\n{web_context}\n\n"
            "Use these results for up-to-date information. "
            "Always mention when information comes from a web source and include the URL."
        )

    # --- 3. Stream content ---
    full_content = ""
    token_count = 0

    try:
        if settings.has_anthropic_key:
            # Normalize to a valid Claude model if the user picked an OpenAI model
            claude_model = model if model.startswith("claude") else "claude-sonnet-4-6"
            ai_gen = _claude_stream(messages_payload, claude_model, effective_system)
        elif settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
            ai_gen = _openai_stream(messages_payload, model, effective_system)
        else:
            ai_gen = _mock_stream(user_message_content)

        async for text_chunk in ai_gen:
            full_content += text_chunk
            token_count += len(text_chunk.split())
            yield {"type": "delta", "delta": text_chunk}

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield {"type": "error", "error": str(e)}
        return

    # --- 4. Save assistant message to DB ---
    processing_time_ms = int((time.time() - start_time) * 1000)
    assistant_msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.assistant,
        content=full_content,
        model=model,
        sources=sources,
        token_count=token_count,
        processing_time_ms=processing_time_ms,
    )
    db.add(assistant_msg)

    # Update conversation metadata
    try:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.message_count = (conv.message_count or 0) + 1
            conv.last_message = full_content[:200]
            conv.last_message_at = datetime.now(timezone.utc)
            conv.updated_at = datetime.now(timezone.utc)
    except Exception as e:
        logger.warning(f"Failed to update conversation metadata: {e}")

    await db.flush()

    # --- 5. Done chunk ---
    yield {"type": "done", "messageId": str(assistant_msg.id)}
