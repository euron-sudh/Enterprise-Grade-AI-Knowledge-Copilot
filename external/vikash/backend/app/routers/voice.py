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


class AskResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=AskResponse)
async def voice_ask(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Answer a voice question using RAG + AI, returns plain text for TTS."""
    from app.config import settings
    from app.services.ai_service import _search_relevant_chunks

    # 1. Search relevant document chunks
    sources = await _search_relevant_chunks(body.question, db)

    system_prompt = (
        "You are KnowledgeForge Voice Assistant. Answer the user's question clearly and concisely "
        "in 2-3 sentences — your response will be read aloud by text-to-speech. "
        "Do not use markdown, bullet points, or special characters."
    )
    if sources:
        context = "\n\n".join(
            f"[{s['documentName']}]: {s['chunkText']}" for s in sources
        )
        system_prompt += f"\n\nContext from knowledge base:\n{context}\n\nUse this context to answer."

    messages = [{"role": "user", "content": body.question}]

    # 2. Call AI
    answer = ""
    if settings.has_anthropic_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
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
                max_tokens=300,
                messages=[{"role": "system", "content": system_prompt}] + messages,
            )
            answer = response.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"OpenAI voice ask failed: {e}")

    if not answer:
        # Fallback: answer from context chunks if available, else generic
        if sources:
            answer = (
                f"Based on your knowledge base, here is what I found: "
                f"{sources[0]['chunkText'][:200]}."
            )
        else:
            answer = (
                "I'm KnowledgeForge Voice Assistant. I can answer questions about your documents. "
                "Please upload documents to your knowledge base and ask me anything about them."
            )

    return AskResponse(answer=answer)


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
