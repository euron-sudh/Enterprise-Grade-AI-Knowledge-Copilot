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
    from app.services.ai_service import _search_relevant_chunks, _list_user_documents

    # 1. Search relevant document chunks (scoped to this user) + inventory
    sources = await _search_relevant_chunks(body.question, db, user_id=current_user.id)
    doc_inventory = await _list_user_documents(current_user.id, db)

    system_prompt = (
        "You are KnowledgeForge Voice Assistant. Answer the user's question clearly "
        "using the provided knowledge base context. "
        "Your response will be read aloud by text-to-speech, so avoid markdown, "
        "bullet points, asterisks, or special symbols. "
        "If asked what files or documents are available, list them by name. "
        "Always mention which document(s) your answer comes from."
    )

    if doc_inventory:
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
            + "\n".join(f"- {l}" for l in inv_lines)
        )
    else:
        system_prompt += (
            "\n\nThe user has no documents uploaded yet. "
            "Let them know they can upload files in the Knowledge Base section."
        )

    if sources:
        context = "\n\n".join(
            f"[{s['documentName']} ({s['documentType'].upper()})]:\n{s['chunkText']}"
            for s in sources
        )
        system_prompt += f"\n\nRelevant content from knowledge base:\n{context}\n\nBase your answer on this content."

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
                f"Based on your document {sources[0]['documentName']}, here is what I found: "
                f"{sources[0]['chunkText'][:250]}."
            )
        elif doc_inventory:
            names = ", ".join(d["name"] for d in doc_inventory[:5])
            answer = (
                f"Your knowledge base contains {len(doc_inventory)} document(s): {names}. "
                "Ask me anything about them."
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
    ws_url = f"ws://localhost:8000/voice/ws/{session_id}"
    return VoiceSessionResponse(
        sessionId=session_id,
        wsUrl=ws_url,
    )
