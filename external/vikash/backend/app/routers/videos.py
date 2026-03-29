"""
Videos router — upload, list, transcribe and query video content.
Videos are stored as Documents in the knowledge base with file_type 'video/*'.
AI transcription uses OpenAI Whisper; Q&A uses the standard AI service.
"""
import io
import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.knowledge import Document, DocumentStatus
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

VIDEO_MIME_TYPES = {
    "mp4", "mov", "avi", "webm", "mkv", "m4v", "wmv", "flv", "mpeg", "mpg"
}


def _is_video(filename: str) -> bool:
    return Path(filename).suffix.lstrip(".").lower() in VIDEO_MIME_TYPES


class VideoOut(BaseModel):
    id: str
    title: str
    fileName: str
    fileSize: int
    duration: Optional[str] = None
    status: str
    hasTranscript: bool
    hasChapters: bool
    uploadedAt: str
    category: str = "Other"
    description: Optional[str] = None

    @classmethod
    def from_doc(cls, doc: Document) -> "VideoOut":
        return cls(
            id=str(doc.id),
            title=doc.name,
            fileName=doc.original_name,
            fileSize=doc.file_size,
            status=doc.status.value if hasattr(doc.status, "value") else doc.status,
            hasTranscript=doc.status == DocumentStatus.indexed,
            hasChapters=False,
            uploadedAt=doc.created_at.isoformat(),
            category=_guess_category(doc.name),
        )


def _guess_category(name: str) -> str:
    name = name.lower()
    if any(k in name for k in ("meeting", "standup", "call", "sync", "all-hands", "allhands")):
        return "Meetings"
    if any(k in name for k in ("training", "onboard", "tutorial", "course", "learn")):
        return "Training"
    if any(k in name for k in ("demo", "product", "walkthrough", "tour")):
        return "Product Demo"
    return "Other"


@router.get("", response_model=List[VideoOut])
async def list_videos(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded videos for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .limit(limit)
    )
    docs = result.scalars().all()

    # Filter to video file types
    videos = [d for d in docs if _is_video(d.original_name)]

    if search:
        s = search.lower()
        videos = [v for v in videos if s in v.name.lower() or s in v.original_name.lower()]

    out = [VideoOut.from_doc(v) for v in videos]

    if category and category != "All":
        out = [v for v in out if v.category == category]

    return out


@router.post("", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video file. Stored as a Document with video content type."""
    if not _is_video(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a video (mp4, mov, avi, webm, mkv, etc.)",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    file_ext = Path(file.filename or "video.mp4").suffix.lower()
    # Store in a temp location (in production this goes to S3)
    tmp_path = Path(tempfile.gettempdir()) / f"kf_video_{uuid.uuid4()}{file_ext}"
    tmp_path.write_bytes(content)

    doc = Document(
        user_id=current_user.id,
        name=Path(file.filename or "video").stem,
        original_name=file.filename or "video.mp4",
        file_path=str(tmp_path),
        file_type=f"video/{file_ext.lstrip('.')}",
        file_size=len(content),
        status=DocumentStatus.processing,
        tags=["video"],
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Background: attempt Whisper transcription if OpenAI key available
    try:
        from app.config import settings
        if settings.OPENAI_API_KEY:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            audio_file = io.BytesIO(content)
            audio_file.name = file.filename or "video.mp4"
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            # Store transcript text in a chunk
            from app.models.knowledge import DocumentChunk
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=0,
                content=transcript.text,
                token_count=len(transcript.text.split()),
            )
            db.add(chunk)
            doc.status = DocumentStatus.indexed
            doc.word_count = len(transcript.text.split())
            await db.commit()
            await db.refresh(doc)
    except Exception as e:
        logger.warning(f"Video transcription failed: {e}")
        # Mark as indexed anyway (without transcript)
        doc.status = DocumentStatus.indexed
        await db.commit()
        await db.refresh(doc)

    return VideoOut.from_doc(doc)


@router.get("/{video_id}", response_model=VideoOut)
async def get_video(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == video_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc or not _is_video(doc.original_name):
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoOut.from_doc(doc)


class VideoAskRequest(BaseModel):
    question: str
    model: str = "gpt-4o-mini"


@router.post("/{video_id}/ask")
async def ask_video(
    video_id: uuid.UUID,
    body: VideoAskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about a specific video (uses its transcript)."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Document)
        .where(Document.id == video_id, Document.user_id == current_user.id)
        .options(selectinload(Document.chunks))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found")

    transcript_text = " ".join(c.content for c in doc.chunks) if doc.chunks else ""

    system_prompt = (
        "You are an AI assistant answering questions about a video. "
        "Use the video transcript below to answer accurately.\n\n"
        f"Video title: {doc.name}\n\n"
        f"Transcript:\n{transcript_text[:8000] if transcript_text else 'No transcript available.'}"
    )

    answer = ""
    from app.config import settings

    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=system_prompt,
                messages=[{"role": "user", "content": body.question}],
            )
            answer = resp.content[0].text
        except Exception as e:
            logger.warning(f"Anthropic video ask failed: {e}")

    if not answer and settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=512,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": body.question},
                ],
            )
            answer = resp.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"OpenAI video ask failed: {e}")

    if not answer:
        answer = (
            "I couldn't find a transcript for this video. "
            "Please ensure the video was processed successfully."
        )

    return {"answer": answer, "videoId": str(video_id), "question": body.question}


@router.get("/{video_id}/transcript")
async def get_transcript(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Document)
        .where(Document.id == video_id, Document.user_id == current_user.id)
        .options(selectinload(Document.chunks))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found")

    transcript = " ".join(c.content for c in doc.chunks) if doc.chunks else ""
    return {
        "videoId": str(video_id),
        "title": doc.name,
        "transcript": transcript,
        "wordCount": len(transcript.split()) if transcript else 0,
    }


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(
            Document.id == video_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found")

    # Clean up temp file if it exists
    try:
        Path(doc.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()
