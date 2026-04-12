"""
Voice router — transcription, speech synthesis, and voice session management.
"""
import uuid
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.voice import (
    CreateVoiceSessionRequest,
    TranscriptionResponse,
    VoiceOut,
    VoiceSessionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Available voices
VOICES = [
    VoiceOut(id="alloy", name="Alloy", language="en", provider="openai"),
    VoiceOut(id="echo", name="Echo", language="en", provider="openai"),
    VoiceOut(id="fable", name="Fable", language="en", provider="openai"),
    VoiceOut(id="onyx", name="Onyx", language="en", provider="openai"),
    VoiceOut(id="nova", name="Nova", language="en", provider="openai"),
    VoiceOut(id="shimmer", name="Shimmer", language="en", provider="openai"),
    VoiceOut(id="fr-default", name="French (Default)", language="fr", provider="browser"),
    VoiceOut(id="de-default", name="German (Default)", language="de", provider="browser"),
    VoiceOut(id="es-default", name="Spanish (Default)", language="es", provider="browser"),
]


@router.get("/voices")
async def list_voices(current_user: User = Depends(get_current_user)):
    return VOICES


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    from app.config import settings

    # Read audio file
    content = await audio.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty",
        )

    # If OpenAI key is set, use Whisper
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            import io

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            audio_file = io.BytesIO(content)
            audio_file.name = audio.filename or "audio.webm"

            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            # Estimate duration (rough: 16KB/s for typical audio)
            duration = len(content) / (16 * 1024)
            return TranscriptionResponse(
                text=transcript.text,
                language="en",
                durationSeconds=round(duration, 2),
            )
        except Exception as e:
            logger.warning(f"Whisper transcription failed: {e}")

    # Mock transcription
    mock_text = (
        "This is a mock transcription. To enable real speech-to-text, "
        "please configure your OPENAI_API_KEY in the environment variables."
    )
    duration = len(content) / (16 * 1024)
    return TranscriptionResponse(
        text=mock_text,
        language="en",
        durationSeconds=round(max(1.0, duration), 2),
    )


class SynthesizeRequest(BaseModel):
    text: str
    persona: str = "alloy"
    language: str = "en"


@router.post("/synthesize")
async def synthesize_speech(
    body: SynthesizeRequest,
    current_user: User = Depends(get_current_user),
):
    """Convert text to speech using OpenAI TTS or browser-compatible fallback."""
    from app.config import settings

    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            # Map persona to valid OpenAI TTS voice
            valid_voices = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
            voice = body.persona if body.persona in valid_voices else "alloy"

            response = await client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=body.text[:4096],
            )
            audio_bytes = response.content

            return StreamingResponse(
                iter([audio_bytes]),
                media_type="audio/mpeg",
                headers={"Content-Disposition": "inline; filename=speech.mp3"},
            )
        except Exception as e:
            logger.warning(f"TTS synthesis failed: {e}")

    # Fallback: return a special header telling the client to use browser TTS
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"use_browser_tts": True, "text": body.text},
    )


class AskRequest(BaseModel):
    question: str
    model: str = "gpt-4o-mini"


class AskSource(BaseModel):
    documentName: str
    documentType: str
    chunkText: str


class AskResponse(BaseModel):
    answer: str
    sources: list[AskSource] = []


@router.post("/ask", response_model=AskResponse)
async def voice_ask(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Answer a voice question using RAG + AI, returns plain text for TTS plus cited sources."""
    from app.config import settings
    from app.services.ai_service import (
        _search_relevant_chunks,
        _list_user_documents,
        _is_recent_document_query,
        _get_recent_document_sources,
        _needs_web_search,
        _tavily_web_search,
        _google_web_search,
        _select_final_sources,
        _is_inventory_query,
        _wants_single_document,
        _wants_uploaded_only,
    )

    is_recent_q = _is_recent_document_query(body.question)
    is_inventory_q = _is_inventory_query(body.question)
    single_doc_intent = is_recent_q and _wants_single_document(body.question)

    # 1. Search relevant document chunks (scoped to this user) + inventory
    forced_source_filter = "upload" if _wants_uploaded_only(body.question) else None

    if is_recent_q:
        kb_sources = await _get_recent_document_sources(
            db,
            current_user.id,
            body.question,
            source_filter=forced_source_filter,
            limit=1 if single_doc_intent else 8,
        )
    else:
        kb_sources = await _search_relevant_chunks(body.question, db, user_id=current_user.id)

    # 1b. Add web search for recent/current queries or when KB has no strong matches.
    web_sources: list[dict] = []
    # For file inventory/recency prompts, keep answers grounded in user KB and
    # avoid mixing unrelated web results unless explicitly requested elsewhere.
    should_search_web = False if (is_recent_q or is_inventory_q) else _needs_web_search(body.question, kb_sources)
    if should_search_web:
        if settings.has_google_search:
            try:
                web_sources.extend(await _google_web_search(body.question, max_results=5))
            except Exception as e:
                logger.warning(f"Google voice web search failed: {e}")
        if settings.has_tavily_key:
            try:
                web_sources.extend(await _tavily_web_search(body.question, max_results=5))
            except Exception as e:
                logger.warning(f"Tavily voice web search failed: {e}")

        # De-duplicate web results by URL/title
        deduped: list[dict] = []
        seen: set[str] = set()
        for s in web_sources:
            key = (s.get("url") or s.get("documentName") or s.get("id") or "").strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            deduped.append(s)
        web_sources = deduped

    sources = _select_final_sources(
        kb_sources,
        web_sources,
        max_kb=1 if single_doc_intent else 3,
        max_web=0 if (is_recent_q or is_inventory_q) else 3,
    )

    # Deterministic path for "last/recent uploaded document" so voice answers
    # with one concrete file instead of broad or speculative summaries.
    if single_doc_intent and forced_source_filter == "upload":
        if sources:
            top = sources[0]
            snippet = (top.get("chunkText") or "").strip()
            if len(snippet) > 340:
                snippet = snippet[:340].rstrip() + "..."
            answer = (
                f"Your most recent uploaded document is {top.get('documentName', 'the latest file')}. "
                f"Here is a quick summary: {snippet or 'I could not extract a readable preview yet.'}"
            )
            return AskResponse(
                answer=answer,
                sources=[
                    AskSource(
                        documentName=top.get("documentName", "Document"),
                        documentType=top.get("documentType", "unknown"),
                        chunkText=top.get("chunkText", ""),
                    )
                ],
            )

        return AskResponse(
            answer=(
                "I could not find any uploaded documents yet. "
                "Please upload a file in Knowledge Base and try again."
            ),
            sources=[],
        )
    doc_inventory = await _list_user_documents(current_user.id, db)
    
    system_prompt = (
        "You are KnowledgeForge Voice Assistant. Answer the user's question clearly "
        "using the provided knowledge base and web context. "
        "Your response will be read aloud by text-to-speech, so avoid markdown, "
        "bullet points, asterisks, or special symbols. "
        "If asked what files or documents are available, list them by name. "
        "Always mention which source(s) your answer comes from. "
        "Never refuse current-events questions; if web sources are provided, use them first."
    )

    # Only include full document inventory if user explicitly asks for it (inventory query)
    # Otherwise, keep prompt focused on the question at hand
    if is_inventory_q and doc_inventory:
        inv_lines = []
        for d in doc_inventory:
            parts = [d["name"]]
            if d["wordCount"]:
                parts.append(f"{d['wordCount']} words")
            if d["pageCount"]:
                parts.append(f"{d['pageCount']} pages")
            if d["uploadedAt"]:
                parts.append(f"uploaded {d['uploadedAt']}")
            if d["type"] == "video" and d["wordCount"] < 5:
                parts.append("no transcript available")
            inv_lines.append(f"{d['type'].upper()}: {'; '.join(parts)}")
        system_prompt += (
            f"\n\nKnowledge base ({len(doc_inventory)} file(s)):\n"
            + "\n".join(f"- {l}" for l in inv_lines[:50])  # Cap at 50 to avoid overwhelming context
        )
    elif not kb_sources and not web_sources and not doc_inventory:
        system_prompt += (
            "\n\nThe user has no documents uploaded yet. "
            "Let them know they can upload files in the Knowledge Base section."
        )
    elif not kb_sources and not web_sources and is_inventory_q:
        # Inventory query but no documents
        system_prompt += (
            "\n\nThe user has no documents uploaded yet. "
            "Let them know they can upload files in the Knowledge Base section."
        )

    kb_context_sources = [s for s in sources if s.get("sourceType") != "web"]
    web_context_sources = [s for s in sources if s.get("sourceType") == "web"]

    if kb_context_sources:
        kb_context = "\n\n".join(
            f"[{s['documentName']} ({s['documentType'].upper()})]:\n{s['chunkText']}"
            for s in kb_context_sources
        )
        system_prompt += (
            "\n\nRelevant content from knowledge base:\n"
            f"{kb_context}\n\n"
            "Base KB parts of your answer on this content."
        )

    if web_context_sources:
        web_context = "\n\n".join(
            f"[{s['documentName']}] {s.get('url') or ''}\n{s['chunkText']}"
            for s in web_context_sources
        )
        system_prompt += (
            "\n\nRelevant web search results:\n"
            f"{web_context}\n\n"
            "For current or live questions, prioritize these web results."
        )

    if single_doc_intent:
        system_prompt += (
            "\n\nThe user asked about one recent document. "
            "Answer about one best-matching most recent document only, not a list."
        )

    messages = [{"role": "user", "content": body.question}]

    # 2. Call AI
    answer = ""
    if settings.has_anthropic_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                system=system_prompt,
                messages=messages,
            )
            answer = response.content[0].text
        except Exception as e:
            logger.warning(f"Anthropic voice ask failed: {e}")

    if not answer and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=500,
                messages=[{"role": "system", "content": system_prompt}] + messages,
            )
            answer = response.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"OpenAI voice ask failed: {e}")

    if not answer:
        if sources:
            answer = (
                f"Based on {sources[0]['documentName']}, here is what I found: "
                f"{sources[0]['chunkText'][:250]}."
            )
        elif doc_inventory:
            names = ", ".join(d["name"] for d in doc_inventory[:5])
            answer = (
                f"Your knowledge base contains {len(doc_inventory)} document(s): {names}. "
                "Ask me anything about them."
            )
        elif web_sources:
            answer = (
                f"From recent web search results, {web_sources[0]['documentName']}: "
                f"{web_sources[0]['chunkText'][:250]}."
            )
        else:
            answer = (
                "I'm KnowledgeForge Voice Assistant. You have no documents uploaded yet. "
                "Upload files in the Knowledge Base section and I can answer questions about them."
            )

    cited_sources = [
        AskSource(
            documentName=s["documentName"],
            documentType=s["documentType"],
            chunkText=s["chunkText"],
        )
        for s in sources
    ]

    return AskResponse(answer=answer, sources=cited_sources)


@router.post("/sessions", response_model=VoiceSessionResponse)
async def create_voice_session(
    body: CreateVoiceSessionRequest,
    current_user: User = Depends(get_current_user),
):
    session_id = str(uuid.uuid4())
    ws_url = settings.BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://") + f"/voice/ws/{session_id}"
    return VoiceSessionResponse(
        sessionId=session_id,
        wsUrl=ws_url,
    )
