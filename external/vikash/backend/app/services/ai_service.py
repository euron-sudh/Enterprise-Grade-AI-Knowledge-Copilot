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
    """Return True when the query should trigger a Tavily web search.

    Rules (in priority order):
    1. If the query contains time-sensitive keywords → always search the web.
    2. If the knowledge base returned no results → fall back to web search.
    """
    query_lower = query.lower()
    is_time_sensitive = any(kw in query_lower for kw in _WEB_SEARCH_KEYWORDS)
    return is_time_sensitive or len(kb_sources) == 0


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


async def _search_relevant_chunks(
    query: str, db: AsyncSession, limit: int = 5
) -> list:
    """Full-text search over document chunks. Searches all meaningful words,
    ordered by most recently uploaded document so the latest attachment is prioritised."""
    from sqlalchemy import or_

    try:
        words = [w.strip() for w in query.split() if len(w.strip()) > 2]
        if not words:
            return []

        # Build OR filter across all query words
        filters = [DocumentChunk.content.ilike(f"%{w}%") for w in words[:6]]
        result = await db.execute(
            select(DocumentChunk, Document)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(or_(*filters))
            .order_by(Document.created_at.desc(), DocumentChunk.chunk_index.asc())
            .limit(limit)
        )
        rows = result.all()

        sources = []
        for chunk, doc in rows:
            sources.append({
                "id": str(uuid.uuid4()),
                "documentId": str(doc.id),
                "documentName": doc.name,
                "documentType": doc.file_type,
                "pageNumber": None,
                "chunkText": chunk.content[:300],
                "relevanceScore": round(0.7 + (0.3 * (1 / (chunk.chunk_index + 1))), 3),
                "url": None,
                "connectorType": None,
                "sourceType": "knowledge_base",
            })
        return sources
    except Exception as e:
        logger.warning(f"Chunk search failed: {e}")
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
) -> AsyncGenerator[dict, None]:
    """
    Main streaming generator. Yields dicts that will be serialized to SSE frames.

    Sequence:
      1. sources chunk (RAG citations)
      2. delta chunks (content pieces)
      3. done chunk (with saved message_id)
    """
    start_time = time.time()

    # --- 1. Search knowledge base ---
    kb_sources = await _search_relevant_chunks(user_message_content, db)

    # --- 1b. Decide whether to also query the web ---
    web_sources: list = []
    used_web_search = False
    if settings.has_tavily_key and _needs_web_search(user_message_content, kb_sources):
        logger.info("Web search triggered for query: %s", user_message_content[:80])
        web_sources = await _tavily_web_search(user_message_content)
        used_web_search = True

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
        "You are KnowledgeForge AI, an intelligent knowledge management assistant. "
        "You help users search, analyze, and extract insights from their document library. "
        "Be concise, accurate, and helpful."
    )
    if kb_sources:
        context_text = "\n\n".join(
            f"[Knowledge Base — {s['documentName']}]\n{s['chunkText']}" for s in kb_sources
        )
        effective_system += (
            f"\n\nRelevant context from the knowledge base:\n{context_text}\n\n"
            "Use this context to answer the user's question when relevant. Cite the document names."
        )
    if web_sources:
        web_context = "\n\n".join(
            f"[Web — {s['documentName']}]({s['url']})\n{s['chunkText']}" for s in web_sources
        )
        effective_system += (
            f"\n\nReal-time web search results:\n{web_context}\n\n"
            "Use the web results to provide up-to-date information. "
            "Always mention when information comes from a web source and include the URL."
        )

    # --- 3. Stream content ---
    full_content = ""
    token_count = 0

    try:
        if settings.has_anthropic_key:
            ai_gen = _claude_stream(messages_payload, model, effective_system)
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
