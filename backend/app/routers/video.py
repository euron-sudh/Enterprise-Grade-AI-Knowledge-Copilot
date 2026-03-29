"""
Video Intelligence endpoints — upload, background transcription, chapters, Q&A.
Transcription uses OpenAI Whisper API (if key set) or local whisper model as fallback.
"""
import asyncio
import logging
import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.knowledge import Document, DocumentChunk
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["video"])

UPLOAD_DIR = Path("uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogv", ".m4v"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class VideoAskRequest(BaseModel):
    question: str


# ── Transcription helpers ─────────────────────────────────────────────────────

async def _transcribe_video(file_path: str) -> str:
    """Transcribe using OpenAI Whisper API first, then local whisper as fallback."""
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            with open(file_path, "rb") as f:
                response = await client.audio.transcriptions.create(
                    model="whisper-1", file=f, response_format="text"
                )
            return response if isinstance(response, str) else getattr(response, "text", "")
        except Exception as e:
            logger.warning("OpenAI Whisper API failed: %s", e)

    # Local whisper fallback
    try:
        import whisper
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, whisper.load_model, "base")
        result = await loop.run_in_executor(None, model.transcribe, file_path)
        return result.get("text", "")
    except ImportError:
        logger.warning("openai-whisper not installed — video transcription unavailable")
        return ""
    except Exception as e:
        logger.error("Local whisper failed: %s", e)
        return ""


async def _generate_chapters(transcript: str) -> list:
    """Use AI to split transcript into logical chapters."""
    if len(transcript) < 200:
        return []
    prompt = (
        "Split this video transcript into logical chapters. "
        "Return a JSON array with objects: {title, summary}. Max 8 chapters. "
        "Respond with ONLY valid JSON, no markdown fences.\n\n"
        f"Transcript (first 3000 chars):\n{transcript[:3000]}"
    )
    try:
        if settings.has_anthropic_key:
            import anthropic, json
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001", max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            return json.loads(msg.content[0].text.strip())
        elif settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
            from openai import OpenAI
            import json
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o-mini", max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            return json.loads(resp.choices[0].message.content)
    except Exception as e:
        logger.warning("Chapter generation failed: %s", e)
    return []


# ── Background processing task ────────────────────────────────────────────────

async def _process_video(doc_id: uuid.UUID, file_path: str, user_id: uuid.UUID):
    """Background: transcribe → chunk → generate chapters."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import DATABASE_URL

    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        try:
            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if not doc:
                return

            doc.status = "processing"
            await db.flush()
            await db.commit()

            transcript = await _transcribe_video(file_path)

            result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalar_one_or_none()
            if not doc:
                return

            if not transcript or len(transcript.strip()) < 20:
                doc.status = "indexed"
                doc.word_count = 0
                await db.flush()
                await db.commit()
                return

            doc.word_count = len(transcript.split())
            doc.status = "indexed"

            from app.services.document_service import _chunk_text
            for chunk_idx, chunk_text in _chunk_text(transcript):
                db.add(DocumentChunk(
                    document_id=doc.id,
                    content=chunk_text,
                    chunk_index=chunk_idx,
                    token_count=len(chunk_text.split()),
                ))

            chapters = await _generate_chapters(transcript)
            if chapters:
                import json as _json
                doc.tags = _json.dumps(chapters)

            await db.flush()
            await db.commit()
            logger.info("Video processed: doc_id=%s words=%d chapters=%d", doc_id, doc.word_count, len(chapters))

            # Push real-time notification
            try:
                from app.routers.websocket import push_notification
                await push_notification(
                    str(user_id), "Video transcribed",
                    f'"{doc.original_name or doc.name}" is ready and searchable.',
                    "success", {"document_id": str(doc.id)},
                )
            except Exception:
                pass

        except Exception as e:
            logger.error("Video processing failed doc_id=%s: %s", doc_id, e)
            try:
                async with Session() as db2:
                    result = await db2.execute(select(Document).where(Document.id == doc_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.status = "failed"
                        await db2.flush()
                        await db2.commit()
            except Exception:
                pass
        finally:
            await engine.dispose()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video. Transcription runs in the background."""
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {suffix}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    file_id = uuid.uuid4()
    save_path = UPLOAD_DIR / f"{file_id}{suffix}"
    content = await file.read()
    save_path.write_bytes(content)

    doc = Document(
        id=file_id,
        user_id=current_user.id,
        name=file.filename or f"video_{file_id}",
        original_name=file.filename,
        file_path=str(save_path),
        file_type="video",
        file_size=len(content),
        status="pending",
        word_count=0,
        page_count=1,
    )
    db.add(doc)
    await db.flush()

    background_tasks.add_task(_process_video, doc.id, str(save_path), current_user.id)

    return {
        "id": str(doc.id),
        "name": doc.name,
        "status": "pending",
        "message": "Video uploaded. Transcription is processing in the background.",
    }


@router.get("")
async def list_videos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all video documents for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id, Document.file_type == "video")
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "name": d.original_name or d.name,
            "status": d.status,
            "word_count": d.word_count or 0,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/{video_id}")
async def get_video(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get video details including transcript preview and AI chapters."""
    result = await db.execute(
        select(Document).where(Document.id == video_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found.")

    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == video_id)
        .order_by(DocumentChunk.chunk_index).limit(3)
    )
    chunks = chunks_result.scalars().all()
    transcript_preview = " ".join(c.content for c in chunks)[:500] if chunks else None

    chapters = []
    if doc.tags:
        try:
            import json as _json
            raw = _json.loads(doc.tags) if isinstance(doc.tags, str) else doc.tags
            if isinstance(raw, list):
                chapters = raw
        except Exception:
            pass

    return {
        "id": str(doc.id),
        "name": doc.original_name or doc.name,
        "status": doc.status,
        "word_count": doc.word_count or 0,
        "file_size": doc.file_size,
        "transcript_preview": transcript_preview,
        "chapters": chapters,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.post("/{video_id}/ask")
async def ask_video(
    video_id: uuid.UUID,
    payload: VideoAskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about a specific video's transcript content."""
    result = await db.execute(
        select(Document).where(Document.id == video_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found.")
    if doc.status != "indexed":
        raise HTTPException(status_code=400, detail=f"Video not ready yet (status: {doc.status}).")

    # Get relevant chunks
    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == video_id)
        .order_by(DocumentChunk.chunk_index).limit(6)
    )
    chunks = chunks_result.scalars().all()
    context = "\n\n".join(c.content for c in chunks)[:3000]

    prompt = (
        f"Answer based on this video transcript only. Do not use emojis.\n\n"
        f"Transcript:\n{context}\n\n"
        f"Question: {payload.question}"
    )

    from app.services.ai_service import get_simple_response
    answer = await get_simple_response(prompt)
    return {
        "answer": answer,
        "sources": [{"chunkText": c.content[:200]} for c in chunks[:3]],
    }


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == video_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found.")
    if doc.file_path and Path(doc.file_path).exists():
        Path(doc.file_path).unlink(missing_ok=True)
    await db.delete(doc)
    await db.flush()
