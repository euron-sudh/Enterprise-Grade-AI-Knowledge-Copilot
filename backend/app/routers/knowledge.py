import logging
import math
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db, check_storage_limit
from app.models.knowledge import Collection, Connector, ConnectorStatus, Document, DocumentChunk, DocumentStatus
from app.models.user import User
from app.schemas.chat import PaginatedResponse
from app.schemas.knowledge import (
    ChunkOut,
    CollectionOut,
    ConnectorOut,
    CreateCollectionRequest,
    CreateConnectorRequest,
    DocumentOut,
    KnowledgeStats,
)
from app.services import document_service
from app.services.vector_store import get_vector_store
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

CONNECTOR_SYNC_BATCH_SIZE = 200
GOOGLE_DRIVE_LIST_PAGE_SIZE = 1000
GOOGLE_DRIVE_MAX_FILES = 200000
GMAIL_LIST_PAGE_SIZE = 500
GMAIL_MAX_MESSAGES = 500
GITHUB_LIST_PAGE_SIZE = 100
GITHUB_MAX_REPOS = 200
GITHUB_MAX_FILES_PER_REPO = 400

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".mpeg", ".mpga"}
WHISPER_SIZE_LIMIT = 25 * 1024 * 1024   # 25 MB — OpenAI Whisper hard limit
MAX_VIDEO_UPLOAD   = 100 * 1024 * 1024  # 100 MB — user-facing limit
GEMINI_VIDEO_MODEL = "gemini-2.0-flash-lite"

# MIME types accepted by the Gemini Files API
GEMINI_VIDEO_MIME = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".mpeg": "video/mpeg",
    ".mpga": "audio/mpeg",
}

GEMINI_VIDEO_PROMPT = (
    "Analyze this video/audio comprehensively and return a structured response with:\n"
    "1. TRANSCRIPT: Full verbatim transcript with approximate timestamps (e.g. [0:00], [1:30]).\n"
    "2. VISUAL SUMMARY: Describe key visual elements, slides, diagrams, or on-screen text.\n"
    "3. KEY TOPICS: Bullet list of main topics and concepts discussed.\n"
    "4. SUMMARY: A concise 3-5 sentence executive summary.\n"
    "Be thorough — this will be used for enterprise knowledge retrieval."
)

router = APIRouter()

SYNC_STALE_MINUTES = 30


def _connector_rank(connector: Connector) -> tuple[int, int, datetime, datetime]:
    status_value = connector.status.value if hasattr(connector.status, "value") else str(connector.status)
    now = datetime.now(timezone.utc)
    status_rank = {
        "syncing": 1 if (
            (now - (connector.last_sync_at or connector.created_at or now)).total_seconds()
            > (SYNC_STALE_MINUTES * 60)
        ) else 3,
        "connected": 2,
        "error": 1,
        "disconnected": 0,
    }.get(status_value, 0)
    last_sync = connector.last_sync_at or datetime.min.replace(tzinfo=timezone.utc)
    created = connector.created_at or datetime.min.replace(tzinfo=timezone.utc)
    return (status_rank, connector.document_count or 0, last_sync, created)


def _is_stale_sync(connector: Connector) -> bool:
    status_value = connector.status.value if hasattr(connector.status, "value") else str(connector.status)
    if status_value != "syncing":
        return False
    last_sync = connector.last_sync_at or connector.created_at
    if not last_sync:
        return True
    return (datetime.now(timezone.utc) - last_sync).total_seconds() > (SYNC_STALE_MINUTES * 60)


def _pick_primary_connector(connectors: List[Connector]) -> Connector:
    return max(connectors, key=_connector_rank)


async def _get_primary_connector_for_type(
    db: AsyncSession,
    user_id: uuid.UUID,
    connector_type: str,
) -> tuple[Optional[Connector], List[Connector]]:
    result = await db.execute(
        select(Connector)
        .where(Connector.user_id == user_id, Connector.type == connector_type)
        .order_by(Connector.created_at.desc())
    )
    connectors = list(result.scalars().all())
    if not connectors:
        return None, []
    primary = _pick_primary_connector(connectors)
    duplicates = [connector for connector in connectors if connector.id != primary.id]
    return primary, duplicates


# ── Documents ─────────────────────────────────────────────────────────────────

# NOTE: Static routes (/documents/presigned-upload, /documents/upload, /documents/register-s3)
# MUST be declared before wildcard routes (/documents/{document_id}) so FastAPI matches them first.

@router.get("/documents/presigned-upload")
async def get_presigned_upload_url(
    filename: str = Query(...),
    content_type: str = Query("application/octet-stream"),
    current_user: User = Depends(get_current_user),
):
    """Generate a presigned S3 URL for direct browser-to-S3 upload (bypasses Lambda body limit)."""
    if not settings.AWS_S3_BUCKET:
        raise HTTPException(status_code=501, detail="S3 not configured")
    try:
        import boto3
        from botocore.config import Config
        region = settings.AWS_S3_REGION or "ap-south-1"
        # SigV4 is required for S3 buckets in newer regions (ap-south-1, eu-central-1, etc.)
        s3 = boto3.client(
            "s3",
            region_name=region,
            config=Config(signature_version="s3v4"),
        )
        key = f"uploads/{current_user.id}/{uuid.uuid4()}_{filename}"
        presigned = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key, "ContentType": content_type},
            ExpiresIn=600,
        )
        logger.info(f"Presigned URL generated for user={current_user.id}, key={key}, bucket={settings.AWS_S3_BUCKET}")
        return {"uploadUrl": presigned, "s3Key": key, "bucket": settings.AWS_S3_BUCKET}
    except Exception as e:
        logger.error(f"Presigned URL generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")


@router.get("/documents", response_model=PaginatedResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    documentType: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Document).where(Document.user_id == current_user.id)

    if search:
        q = q.where(or_(Document.name.ilike(f"%{search}%"), Document.original_name.ilike(f"%{search}%")))
    if status:
        q = q.where(Document.status == status)
    if documentType:
        q = q.where(Document.file_type == documentType)
    if source:
        # source="connector" returns only connector-synced docs; source="upload" returns manual uploads
        CONNECTOR_TYPES = {
            "google_drive", "gmail", "github", "gitlab", "confluence", "notion",
            "slack", "jira", "salesforce", "hubspot", "zendesk", "intercom",
            "sharepoint", "onedrive", "dropbox", "web", "web_crawler",
        }
        if source == "connector":
            q = q.where(Document.file_type.in_(CONNECTOR_TYPES))
        elif source == "upload":
            q = q.where(Document.file_type.notin_(CONNECTOR_TYPES))
        else:
            # filter by specific connector type e.g. source=google_drive
            q = q.where(Document.file_type == source)

    q = q.order_by(Document.created_at.desc())

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * pageSize
    result = await db.execute(q.offset(offset).limit(pageSize))
    documents = result.scalars().all()

    items = [DocumentOut.from_orm(d) for d in documents]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total > 0 else 1,
    )


@router.get("/documents/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_user_document(document_id, current_user.id, db)
    return DocumentOut.from_orm(doc)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_user_document(document_id, current_user.id, db)
    # Try to delete physical file
    try:
        import os
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception as e:
        logger.warning(f"Could not delete file {doc.file_path}: {e}")
    await db.delete(doc)
    await db.flush()


@router.get("/documents/{document_id}/chunks", response_model=PaginatedResponse)
async def list_document_chunks(
    document_id: uuid.UUID,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_document(document_id, current_user.id, db)

    q = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
    )

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * pageSize
    result = await db.execute(q.offset(offset).limit(pageSize))
    chunks = result.scalars().all()

    items = [ChunkOut.from_orm(c) for c in chunks]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total > 0 else 1,
    )


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Download a document.
    - Uploaded files (pdf, docx, txt, etc.): served directly from disk.
    - Web/crawler/connector docs: chunks are assembled into a .txt export.
    """
    from fastapi.responses import FileResponse, PlainTextResponse
    import mimetypes

    doc = await _get_user_document(document_id, current_user.id, db)

    WEB_TYPES = {"web", "google_drive", "github", "figma", "web_crawler"}

    if doc.file_type not in WEB_TYPES and doc.file_path and Path(doc.file_path).is_file():
        mime, _ = mimetypes.guess_type(doc.file_path)
        return FileResponse(
            path=doc.file_path,
            filename=doc.original_name or doc.name,
            media_type=mime or "application/octet-stream",
        )

    # For web/connector docs, assemble chunks into a text file
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
    )
    chunks = result.scalars().all()

    source_url = doc.original_name or doc.file_path or ""
    lines = [f"# {doc.name}"]
    if source_url.startswith("http"):
        lines.append(f"Source: {source_url}")
    lines.append(f"Type: {doc.file_type}")
    lines.append(f"Words: {doc.word_count or 0}")
    lines.append("")
    for chunk in chunks:
        lines.append(chunk.content)
        lines.append("")

    content = "\n".join(lines)
    safe_name = re.sub(r'[^\w\-.]', '_', doc.name)[:80] + ".txt"
    return PlainTextResponse(
        content=content,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/documents/{document_id}/stream")
async def stream_document(
    document_id: uuid.UUID,
    token: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream a video/audio file inline with Range request support.
    Accepts ?token=<jwt> in query params so <video src> can use it directly.
    """
    from fastapi.responses import FileResponse
    import mimetypes

    doc = await _get_user_document(document_id, current_user.id, db)

    if not doc.file_path or not Path(doc.file_path).is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    mime, _ = mimetypes.guess_type(doc.file_path)
    # Ensure common video types are recognised even if mimetypes DB is sparse
    ext = Path(doc.file_path).suffix.lower()
    MIME_OVERRIDES = {
        ".mp4": "video/mp4", ".m4v": "video/mp4",
        ".mov": "video/quicktime", ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska", ".webm": "video/webm",
        ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
        ".wav": "audio/wav", ".ogg": "audio/ogg",
        ".flac": "audio/flac",
    }
    media_type = MIME_OVERRIDES.get(ext) or mime or "application/octet-stream"

    # FileResponse natively handles Range requests (byte serving / seeking)
    return FileResponse(
        path=doc.file_path,
        media_type=media_type,
        headers={"Content-Disposition": "inline"},
    )


@router.post("/documents/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    collectionId: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(check_storage_limit),
    db: AsyncSession = Depends(get_db),
):
    documents = await document_service.upload_documents(
        files=files,
        user=current_user,
        collection_id=collectionId,
        tags=tags,
        db=db,
    )
    return [DocumentOut.from_orm(d) for d in documents]


@router.post("/documents/register-s3")
async def register_s3_document(
    s3_key: str = Form(...),
    filename: str = Form(...),
    file_size: int = Form(...),
    content_type: str = Form("application/octet-stream"),
    collectionId: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """After a direct S3 upload, register the document and trigger indexing."""
    logger.info(f"register-s3: user={current_user.id}, key={s3_key}, filename={filename}, size={file_size}")
    if not settings.AWS_S3_BUCKET:
        raise HTTPException(status_code=501, detail="S3 not configured")
    try:
        import boto3
        from botocore.config import Config
        region = settings.AWS_S3_REGION or "ap-south-1"
        s3 = boto3.client("s3", region_name=region, config=Config(signature_version="s3v4"))
        obj = s3.get_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key)
        content = obj["Body"].read()
        logger.info(f"register-s3: fetched {len(content)} bytes from S3 for {filename}")
    except Exception as e:
        logger.error(f"Failed to fetch S3 object key={s3_key}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve uploaded file from S3")

    # Use existing upload pipeline with the downloaded content
    import io
    from fastapi import UploadFile as FUploadFile
    from starlette.datastructures import UploadFile as StarletteUploadFile

    mock_file = StarletteUploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )
    documents = await document_service.upload_documents(
        files=[mock_file],
        user=current_user,
        collection_id=collectionId,
        db=db,
    )
    return [DocumentOut.from_orm(d) for d in documents]


# ── Video Upload ──────────────────────────────────────────────────────────────

@router.post("/videos/upload", response_model=DocumentOut)
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a video/audio file and index it for RAG chat.

    Processing priority:
    1. Gemini 2.0 Flash (multimodal) — full video understanding: transcript +
       visual descriptions + key topics + summary.
    2. OpenAI Whisper fallback — audio-only transcription when no Google key.
    """
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Supported: mp4, mov, avi, mkv, webm, mp3, wav, m4a, ogg",
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_VIDEO_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File too large ({file_size // 1024 // 1024} MB). "
                "Maximum upload size is 100 MB."
            ),
        )

    no_ai_key = not settings.has_google_key and not (settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())

    original_name = file.filename or f"video{suffix}"
    duplicate_key = document_service.build_duplicate_key(
        "video",
        file_content=content,
        original_name=original_name,
        file_size=file_size,
    )
    existing_doc = await document_service.find_duplicate_document(
        db,
        user_id=current_user.id,
        duplicate_key=duplicate_key,
    )
    if existing_doc is not None:
        logger.info("Skipping duplicate video upload '%s' for user %s", original_name, current_user.id)
        return DocumentOut.from_orm(existing_doc)

    # ── Save file to disk ──────────────────────────────────────────────────────
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4()}{suffix}"
    with open(file_path, "wb") as f:
        f.write(content)

    # ── Create document record (status=processing) ─────────────────────────────
    doc = Document(
        user_id=current_user.id,
        name=original_name,
        original_name=original_name,
        file_path=str(file_path),
        duplicate_key=duplicate_key,
        file_type="video",
        file_size=file_size,
        status="processing",
    )
    db.add(doc)
    await db.flush()

    audio_tmp_path: Optional[Path] = None
    try:
        from app.services.document_service import _chunk_text

        # ── NO AI KEY: store video with placeholder transcript ─────────────────
        if no_ai_key:
            transcript_text = f"[Video file '{original_name}' stored. No AI key configured for transcription.]"
            engine = "none"

        # ── PRIMARY: Gemini 2.0 Flash multimodal embedding ────────────────────
        elif settings.has_google_key:
            try:
                transcript_text = await _gemini_video_analyze(
                    file_path=file_path,
                    suffix=suffix,
                    original_name=original_name,
                )
                engine = f"Gemini {GEMINI_VIDEO_MODEL}"
            except Exception as gemini_exc:
                logger.warning(
                    "Gemini analysis failed for '%s', falling back: %s",
                    original_name,
                    gemini_exc,
                )

                # Fallback 1: OpenAI Whisper (if configured)
                if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
                    from openai import OpenAI as SyncOpenAI
                    client = SyncOpenAI(api_key=settings.OPENAI_API_KEY)

                    if file_size > WHISPER_SIZE_LIMIT:
                        logger.warning(
                            "Video '%s' is %d MB, exceeds Whisper 25 MB limit — truncating to first 25 MB for transcription",
                            original_name, file_size // (1024 * 1024),
                        )
                        audio_tmp_path = upload_dir / f"{file_path.stem}_truncated{suffix}"
                        audio_tmp_path.write_bytes(content[:WHISPER_SIZE_LIMIT])
                    else:
                        audio_tmp_path = None

                    whisper_input = audio_tmp_path if audio_tmp_path else file_path
                    with open(whisper_input, "rb") as af:
                        result = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=af,
                            response_format="text",
                        )
                    transcript_text = str(result).strip() or f"[No speech detected in '{original_name}']"
                    engine = f"OpenAI Whisper fallback (Gemini failed)"
                else:
                    # Fallback 2: metadata-only chunk so upload still succeeds.
                    transcript_text = (
                        f"[Video file '{original_name}' stored. Gemini analysis failed and no OpenAI key is configured. "
                        f"Reason: {type(gemini_exc).__name__}]"
                    )
                    engine = "metadata-only fallback"
        else:
            # ── FALLBACK: OpenAI Whisper (audio-only) ─────────────────────────
            from openai import OpenAI as SyncOpenAI
            client = SyncOpenAI(api_key=settings.OPENAI_API_KEY)

            if file_size > WHISPER_SIZE_LIMIT:
                # File exceeds Whisper's 25 MB limit — truncate to first 25 MB
                # (ffmpeg is not required; we just slice the raw bytes)
                logger.warning(
                    "Video '%s' is %d MB, exceeds Whisper 25 MB limit — truncating to first 25 MB for transcription",
                    original_name, file_size // (1024 * 1024),
                )
                audio_tmp_path = upload_dir / f"{file_path.stem}_truncated{suffix}"
                audio_tmp_path.write_bytes(content[:WHISPER_SIZE_LIMIT])
            else:
                audio_tmp_path = None

            whisper_input = audio_tmp_path if audio_tmp_path else file_path
            with open(whisper_input, "rb") as af:
                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=af,
                    response_format="text",
                )
            transcript_text = str(result).strip() or f"[No speech detected in '{original_name}']"
            engine = "OpenAI Whisper"

        # ── Chunk and index ────────────────────────────────────────────────────
        raw_chunks = _chunk_text(transcript_text)
        for idx, chunk_text in raw_chunks:
            db.add(DocumentChunk(
                document_id=doc.id,
                content=f"[Video: {original_name}] {chunk_text}",
                chunk_index=idx,
                token_count=len(chunk_text.split()),
            ))

        doc.status = "indexed"
        doc.word_count = len(transcript_text.split())
        await db.flush()

        logger.info(
            "Video '%s' indexed via %s: %d chars, %d chunks",
            original_name, engine, len(transcript_text), len(raw_chunks),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Video processing failed for '%s': %s", original_name, exc)
        doc.status = "failed"
        await db.flush()
        try:
            os.remove(str(file_path))
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Video processing failed. Please retry or reconnect AI providers.")
    finally:
        if audio_tmp_path and audio_tmp_path.exists():
            try:
                os.remove(str(audio_tmp_path))
            except Exception:
                pass

    return DocumentOut.from_orm(doc)


async def _gemini_video_analyze(file_path: Path, suffix: str, original_name: str) -> str:
    """
    Upload the video/audio to the Gemini Files API and use Gemini 2.0 Flash
    to produce a rich multimodal analysis: transcript + visual descriptions +
    key topics + executive summary.

    Returns the combined analysis text ready for chunking and RAG indexing.
    """
    import asyncio
    import httpx
    import time

    api_key = (settings.GOOGLE_API_KEY or "").strip()
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not configured")

    mime = GEMINI_VIDEO_MIME.get(suffix, "video/mp4")
    file_name: Optional[str] = None

    async with httpx.AsyncClient(timeout=120) as client:
        # Start resumable upload session (avoids SDK discovery call).
        start_resp = await client.post(
            f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={api_key}",
            headers={
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Command": "start",
                "X-Goog-Upload-Header-Content-Length": str(file_path.stat().st_size),
                "X-Goog-Upload-Header-Content-Type": mime,
                "Content-Type": "application/json",
            },
            json={"file": {"display_name": original_name}},
        )
        if start_resp.status_code >= 300:
            raise RuntimeError(
                f"Gemini upload init failed ({start_resp.status_code}): {start_resp.text[:250]}"
            )

        upload_url = start_resp.headers.get("X-Goog-Upload-URL")
        if not upload_url:
            raise RuntimeError("Gemini upload init failed: missing upload URL")

        logger.info("Uploading '%s' to Gemini Files API (mime=%s)…", original_name, mime)
        upload_bytes = file_path.read_bytes()
        upload_resp = await client.post(
            upload_url,
            headers={
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
                "Content-Type": mime,
            },
            content=upload_bytes,
        )
        if upload_resp.status_code >= 300:
            raise RuntimeError(
                f"Gemini upload finalize failed ({upload_resp.status_code}): {upload_resp.text[:250]}"
            )

        upload_payload = upload_resp.json()
        file_obj = upload_payload.get("file") or {}
        file_name = file_obj.get("name")
        file_uri = file_obj.get("uri")
        if not file_name or not file_uri:
            raise RuntimeError("Gemini upload response missing file name/uri")

        # Poll until the file is active.
        deadline = time.time() + 600
        state = str(file_obj.get("state") or "").upper()
        while state in {"", "PROCESSING"}:
            if time.time() > deadline:
                raise TimeoutError("Gemini file processing timed out after 10 minutes")
            await asyncio.sleep(5)
            poll_resp = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/{file_name}?key={api_key}"
            )
            if poll_resp.status_code >= 300:
                raise RuntimeError(
                    f"Gemini file poll failed ({poll_resp.status_code}): {poll_resp.text[:250]}"
                )
            file_obj = (poll_resp.json() or {}).get("file") or (poll_resp.json() or {})
            file_uri = file_obj.get("uri") or file_uri
            state = str(file_obj.get("state") or "").upper()

        if state == "FAILED":
            raise RuntimeError(f"Gemini file processing failed for '{original_name}'")

        logger.info("Gemini file ready: %s — running %s analysis…", file_name, GEMINI_VIDEO_MODEL)
        gen_resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_VIDEO_MODEL}:generateContent?key={api_key}",
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": GEMINI_VIDEO_PROMPT},
                            {"file_data": {"mime_type": mime, "file_uri": file_uri}},
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 8192,
                },
            },
        )
        if gen_resp.status_code >= 300:
            raise RuntimeError(
                f"Gemini generate failed ({gen_resp.status_code}): {gen_resp.text[:250]}"
            )

        gen_payload = gen_resp.json() or {}
        analysis_parts: List[str] = []
        for cand in gen_payload.get("candidates", []) or []:
            content = cand.get("content") or {}
            for part in content.get("parts", []) or []:
                txt = (part.get("text") or "").strip()
                if txt:
                    analysis_parts.append(txt)

        analysis = "\n\n".join(analysis_parts).strip()
        if not analysis:
            analysis = f"[No content extracted from '{original_name}' via Gemini 2.0]"

        logger.info("Gemini 2.0 analysis for '%s': %d chars", original_name, len(analysis))

        # Best-effort cleanup of uploaded Gemini file.
        if file_name:
            try:
                await client.delete(
                    f"https://generativelanguage.googleapis.com/v1beta/{file_name}?key={api_key}"
                )
            except Exception:
                pass

        return analysis


# ── Collections ───────────────────────────────────────────────────────────────

@router.get("/collections")
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
    )
    collections = result.scalars().all()

    # Load document counts
    out = []
    for col in collections:
        count_result = await db.execute(
            select(func.count(Document.id)).where(Document.collection_id == col.id)
        )
        doc_count = count_result.scalar() or 0
        out.append(
            CollectionOut(
                id=col.id,
                name=col.name,
                description=col.description,
                color=col.color,
                documentCount=doc_count,
                createdAt=col.created_at,
            )
        )
    return out


@router.post("/collections", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
async def create_collection(
    body: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    col = Collection(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        color=body.color or "#6366f1",
    )
    db.add(col)
    await db.flush()
    return CollectionOut(
        id=col.id,
        name=col.name,
        description=col.description,
        color=col.color,
        documentCount=0,
        createdAt=col.created_at,
    )


# ── Connectors ────────────────────────────────────────────────────────────────

async def _run_connector_sync(connector_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Background task: open a fresh DB session and run the real connector sync."""
    from datetime import datetime, timezone
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Connector).where(Connector.id == connector_id, Connector.user_id == user_id)
            )
            connector = result.scalar_one_or_none()
            if not connector:
                return

            connector.status = ConnectorStatus.syncing
            connector.last_sync_at = datetime.now(timezone.utc)
            cfg = dict(connector.config or {})
            cfg["sync_started_at"] = connector.last_sync_at.isoformat()
            cfg.pop("last_error", None)
            connector.config = cfg
            await db.flush()

            doc_count = 0

            if connector.type == "github":
                chunks = await _sync_github(connector, user_id, db)
                # Count actual documents created for this connector
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == "github",
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or chunks

            elif connector.type == "figma":
                await _sync_figma(connector, user_id, db)
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == "figma",
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or 0

            elif connector.type == "google_drive":
                await _sync_google_drive(connector, user_id, db)
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == "google_drive",
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or 0

            elif connector.type == "web_crawler":
                await _sync_web_crawler(connector, user_id, db)
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == "web",
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or 0

            elif connector.type == "gmail":
                await _sync_gmail(connector, user_id, db)
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == "gmail",
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or 0

            elif connector.type in ("slack", "notion"):
                from app.routers.knowledge_oauth_sync import sync_connector as _oauth_sync
                count = await _oauth_sync(connector.type, connector, user_id, db)
                doc_result = await db.execute(
                    select(func.count(Document.id)).where(
                        Document.user_id == user_id,
                        Document.file_type == connector.type,
                        Document.status == DocumentStatus.indexed,
                    )
                )
                doc_count = doc_result.scalar() or count

            else:
                # Unimplemented connector type — mark as error so user knows it's not synced
                connector.status = ConnectorStatus.error
                connector.last_sync_at = datetime.now(timezone.utc)
                await db.commit()
                return

            connector.status = ConnectorStatus.connected
            connector.document_count = doc_count
            connector.last_sync_at = datetime.now(timezone.utc)
            cfg = dict(connector.config or {})
            cfg.pop("last_error", None)
            cfg["last_sync_doc_count"] = doc_count
            cfg["last_sync_completed_at"] = datetime.now(timezone.utc).isoformat()
            connector.config = cfg
            await db.commit()
            logger.info("Connector %s (%s) sync complete: %d docs", connector_id, connector.type, doc_count)

        except Exception as exc:
            logger.exception("Background sync failed for connector %s: %s", connector_id, exc)
            try:
                result = await db.execute(select(Connector).where(Connector.id == connector_id))
                connector = result.scalar_one_or_none()
                if connector:
                    connector.status = ConnectorStatus.error
                    connector.last_sync_at = datetime.now(timezone.utc)
                    cfg = dict(connector.config or {})
                    cfg["last_error"] = str(exc)[:500]
                    connector.config = cfg
                    # Still update document_count from whatever was already indexed
                    try:
                        count_result = await db.execute(
                            select(func.count(Document.id)).where(
                                Document.user_id == user_id,
                                Document.file_type == connector.type,
                                Document.status == DocumentStatus.indexed,
                            )
                        )
                        connector.document_count = count_result.scalar() or 0
                    except Exception:
                        pass
                    await db.commit()
            except Exception:
                pass


@router.get("/connectors")
async def list_connectors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Connector)
        .where(Connector.user_id == current_user.id)
        .order_by(Connector.created_at.desc())
    )
    connectors = list(result.scalars().all())

    # Self-heal stale syncing rows so connector cards do not stay stuck forever.
    updated = False
    now = datetime.now(timezone.utc)
    for connector in connectors:
        if _is_stale_sync(connector):
            connector.status = ConnectorStatus.error
            connector.last_sync_at = now
            cfg = dict(connector.config or {})
            cfg["last_error"] = "Sync timed out before completion. Please reconnect and sync again."
            connector.config = cfg
            updated = True

    if updated:
        await db.flush()
        await db.commit()

    deduped: Dict[str, Connector] = {}
    for connector in connectors:
        existing = deduped.get(connector.type)
        if existing is None or _connector_rank(connector) > _connector_rank(existing):
            deduped[connector.type] = connector

    ordered = sorted(deduped.values(), key=lambda connector: connector.created_at, reverse=True)
    return [ConnectorOut.from_orm(c) for c in ordered]


@router.post("/connectors", response_model=ConnectorOut, status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: CreateConnectorRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # For web_crawler, always create a new instance (user can have multiple crawlers)
    # For other types (OAuth connectors), upsert: if a connector of this type already exists for the user, reuse it
    MULTI_INSTANCE_TYPES = {"web_crawler"}  # Types that allow multiple instances
    
    if body.type in MULTI_INSTANCE_TYPES:
        # Always create a new connector for multi-instance types
        connector = Connector(
            user_id=current_user.id,
            type=body.type,
            name=body.name,
            config=body.config or {},
            status=ConnectorStatus.syncing,
            last_sync_at=datetime.now(timezone.utc),
        )
        db.add(connector)
    else:
        # Upsert: if a connector of this type already exists for the user, reuse it (OAuth connectors)
        connector, duplicates = await _get_primary_connector_for_type(db, current_user.id, body.type)

        if connector:
            connector.config = body.config or {}
            connector.status = ConnectorStatus.syncing
            connector.last_sync_at = datetime.now(timezone.utc)
        else:
            connector = Connector(
                user_id=current_user.id,
                type=body.type,
                name=body.name,
                config=body.config or {},
                status=ConnectorStatus.syncing,
                last_sync_at=datetime.now(timezone.utc),
            )
            db.add(connector)

        for duplicate in duplicates:
            await db.delete(duplicate)

    await db.flush()
    connector_id = connector.id
    out = ConnectorOut.from_orm(connector)
    await db.commit()

    # Trigger the real sync in the background so the response returns immediately
    background_tasks.add_task(_run_connector_sync, connector_id, current_user.id)
    return out


@router.post("/connectors/{connector_id}/sync")
async def sync_connector(
    connector_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a re-sync for an existing connector. Returns immediately; sync runs in background."""
    connector = await _get_user_connector(connector_id, current_user.id, db)

    # Only supported connector types can actually sync
    SYNCABLE = {"github", "google_drive", "gmail", "figma", "web_crawler", "slack", "notion"}
    if connector.type not in SYNCABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Connector type '{connector.type}' does not support automatic sync yet. "
                   "Please configure credentials and try again.",
        )

    connector.status = ConnectorStatus.syncing
    connector.last_sync_at = datetime.now(timezone.utc)
    await db.flush()
    await db.commit()

    background_tasks.add_task(_run_connector_sync, connector_id, current_user.id)
    return {"message": "Sync started in background", "connectorId": str(connector_id)}


async def _sync_figma(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Fetch a Figma file via the REST API and store its content as DocumentChunks
    so it becomes searchable via RAG.
    Returns the number of chunks created.
    """
    import httpx

    cfg: Dict[str, Any] = connector.config or {}
    token: str = cfg.get("accessToken", "")
    file_url: str = cfg.get("fileUrl", "")

    if not token:
        raise ValueError("Figma access token missing in connector config")
    if not file_url:
        raise ValueError("Figma file URL missing in connector config")

    # Extract file key from URL  e.g. https://www.figma.com/file/ABCD1234/...
    # or https://www.figma.com/design/ABCD1234/...
    import re
    m = re.search(r"figma\.com/(?:file|design|make|board)/([A-Za-z0-9]+)", file_url)
    if not m:
        raise ValueError(f"Cannot extract file key from URL: {file_url}")
    file_key = m.group(1)

    headers = {"X-Figma-Token": token}
    async with httpx.AsyncClient(timeout=30) as client:
        # Verify token & fetch file
        resp = await client.get(f"https://api.figma.com/v1/files/{file_key}", headers=headers)
        if resp.status_code == 403:
            raise ValueError("Invalid Figma token or no access to this file")
        if resp.status_code != 200:
            raise ValueError(f"Figma API error {resp.status_code}: {resp.text[:200]}")
        file_data = resp.json()

    file_name: str = file_data.get("name", "Figma File")

    # Extract text content from the node tree
    chunks_text: List[str] = []
    _extract_figma_text(file_data.get("document", {}), chunks_text, path="")

    if not chunks_text:
        chunks_text = [f"Figma file '{file_name}' (file key: {file_key}) — no text nodes found."]

    # Delete previous documents from this connector (re-sync)
    existing = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.name == f"[Figma] {file_name}",
        )
    )
    for old_doc in existing.scalars().all():
        await db.delete(old_doc)
    await db.flush()

    # Create a Document record to group the chunks
    doc = Document(
        user_id=user_id,
        name=f"[Figma] {file_name}",
        original_name=f"{file_name}.figma",
        file_path=f"figma://{file_key}",
        duplicate_key=document_service.build_duplicate_key("figma", file_path=f"figma://{file_key}"),
        file_type="figma",
        file_size=len("\n".join(chunks_text)),
        status=DocumentStatus.indexed,
        word_count=sum(len(t.split()) for t in chunks_text),
    )
    db.add(doc)
    await db.flush()

    # Store as chunks
    for idx, text in enumerate(chunks_text):
        chunk = DocumentChunk(
            document_id=doc.id,
            content=text,
            chunk_index=idx,
            token_count=len(text.split()),
        )
        db.add(chunk)

    await db.flush()
    return len(chunks_text)


def _extract_figma_text(node: Dict[str, Any], out: List[str], path: str, depth: int = 0) -> None:
    """Recursively walk a Figma document tree and collect meaningful text."""
    if depth > 12:
        return

    node_type = node.get("type", "")
    name = node.get("name", "")
    chars = node.get("characters", "")  # actual text in TEXT nodes

    # Build a human-readable chunk for meaningful nodes
    if node_type == "TEXT" and chars.strip():
        label = f"{path} > {name}".strip(" >")
        out.append(f"[Text] {label}: {chars.strip()}")
    elif node_type in ("COMPONENT", "COMPONENT_SET") and name:
        desc = node.get("description", "")
        label = f"{path} > {name}".strip(" >")
        chunk = f"[Component] {label}"
        if desc:
            chunk += f": {desc}"
        out.append(chunk)
    elif node_type in ("FRAME", "GROUP", "SECTION") and name:
        label = f"{path} > {name}".strip(" >")
        out.append(f"[{node_type.capitalize()}] {label}")

    child_path = f"{path} > {name}".strip(" >") if name else path
    for child in node.get("children", []):
        _extract_figma_text(child, out, child_path, depth + 1)


async def _sync_github(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Fetch text files from GitHub and store as DocumentChunks for RAG.
    If connector config contains repoUrl, sync that repository.
    Otherwise sync all accessible repositories for the authenticated user.
    """
    import base64
    import httpx
    import re

    cfg: Dict[str, Any] = connector.config or {}
    logger.info("_sync_github: starting sync for connector %s, config keys: %s", connector.id, list(cfg.keys()))

    # Accept both camelCase and snake_case keys so older/newer UI payloads work.
    token: str = (
        cfg.get("accessToken")
        or cfg.get("access_token")
        or cfg.get("token")
        or cfg.get("pat")
        or ""
    ).strip()

    # Sanitize doubled prefix (e.g. "ghp_ghp_..." → "ghp_...")
    for prefix in ("ghp_", "github_pat_", "gho_"):
        if token.startswith(prefix + prefix):
            token = token[len(prefix):]
    repo_url: str = (
        cfg.get("repoUrl")
        or cfg.get("repo_url")
        or ""
    ).strip()
    configured_branch: str = (
        cfg.get("branch")
        or cfg.get("default_branch")
        or ""
    ).strip()
    org_or_user: str = (
        cfg.get("org_or_user")
        or cfg.get("orgOrUser")
        or ""
    ).strip()
    repos_raw = cfg.get("repos")

    if not token:
        logger.error("_sync_github: no token found in config keys %s", list(cfg.keys()))
        raise ValueError("GitHub Personal Access Token is required")

    logger.info("_sync_github: token found (prefix=%s…, len=%d), repoUrl=%r, org_or_user=%r",
                token[:6], len(token), repo_url[:60] if repo_url else "", org_or_user)

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    TEXT_EXTENSIONS = {
        ".md", ".txt", ".py", ".js", ".ts", ".jsx", ".tsx", ".json",
        ".yaml", ".yml", ".rst", ".html", ".css", ".java", ".go",
        ".rb", ".php", ".sh", ".sql", ".toml", ".ini", ".env.example",
    }

    def _extract_owner_repo(url: str) -> Optional[tuple[str, str]]:
        m = re.search(r"github\.com/([^/\s]+)/([^/\s?#]+)", url)
        if not m:
            return None
        return m.group(1), re.sub(r"\.git$", "", m.group(2))

    def _is_text_file(path: str, size: int) -> bool:
        path_lower = path.lower()
        return size < 200_000 and any(path_lower.endswith(ext) for ext in TEXT_EXTENSIONS)

    total_chunks = 0
    vector_store = get_vector_store()
    vector_batch: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=60) as client:
        repos_to_sync: List[tuple[str, str]] = []

        if repo_url:
            parsed = _extract_owner_repo(repo_url)
            if not parsed:
                raise ValueError(f"Cannot extract owner/repo from URL: {repo_url}")
            repos_to_sync.append(parsed)
            logger.info("_sync_github: using explicit repoUrl → %s/%s", parsed[0], parsed[1])
        elif org_or_user and repos_raw:
            if isinstance(repos_raw, str):
                repo_names = [r.strip() for r in repos_raw.split(",") if r.strip()]
            elif isinstance(repos_raw, list):
                repo_names = [str(r).strip() for r in repos_raw if str(r).strip()]
            else:
                repo_names = []

            for repo_name in repo_names:
                repos_to_sync.append((org_or_user, repo_name))
            logger.info("_sync_github: org=%s with explicit repos: %s", org_or_user, repo_names)
        elif org_or_user:
            logger.info("_sync_github: discovering repos for org/user=%s", org_or_user)
            # Sync repositories for the explicitly requested owner/user.
            # Try token-scoped /user/repos first to include private repos.
            page = 1
            while len(repos_to_sync) < GITHUB_MAX_REPOS:
                repos_resp = await client.get(
                    "https://api.github.com/user/repos",
                    headers=headers,
                    params={
                        "per_page": str(GITHUB_LIST_PAGE_SIZE),
                        "page": str(page),
                        "sort": "updated",
                        "affiliation": "owner,collaborator,organization_member",
                    },
                )
                if repos_resp.status_code == 401:
                    raise ValueError("Invalid GitHub token or insufficient permissions")
                if repos_resp.status_code != 200:
                    break

                repo_items = repos_resp.json()
                if not repo_items:
                    break

                for item in repo_items:
                    owner_info = item.get("owner") or {}
                    owner = (owner_info.get("login") or "").strip()
                    repo = item.get("name")
                    if owner.lower() == org_or_user.lower() and owner and repo:
                        repos_to_sync.append((owner, repo))
                    if len(repos_to_sync) >= GITHUB_MAX_REPOS:
                        break

                if len(repo_items) < GITHUB_LIST_PAGE_SIZE:
                    break
                page += 1

            # Fallback to public listings if user-scoped listing produced no results.
            if not repos_to_sync:
                for endpoint in (
                    f"https://api.github.com/orgs/{org_or_user}/repos",
                    f"https://api.github.com/users/{org_or_user}/repos",
                ):
                    page = 1
                    while len(repos_to_sync) < GITHUB_MAX_REPOS:
                        repos_resp = await client.get(
                            endpoint,
                            headers=headers,
                            params={
                                "per_page": str(GITHUB_LIST_PAGE_SIZE),
                                "page": str(page),
                                "sort": "updated",
                            },
                        )
                        if repos_resp.status_code == 401:
                            raise ValueError("Invalid GitHub token or insufficient permissions")
                        if repos_resp.status_code == 404:
                            break
                        if repos_resp.status_code != 200:
                            break

                        repo_items = repos_resp.json()
                        if not repo_items:
                            break

                        for item in repo_items:
                            owner_info = item.get("owner") or {}
                            owner = owner_info.get("login")
                            repo = item.get("name")
                            if owner and repo:
                                repos_to_sync.append((owner, repo))
                            if len(repos_to_sync) >= GITHUB_MAX_REPOS:
                                break

                        if len(repo_items) < GITHUB_LIST_PAGE_SIZE:
                            break
                        page += 1

                    if repos_to_sync:
                        break
        else:
            # No explicit repo URL: ingest all repositories the token can access.
            logger.info("_sync_github: no repoUrl/org specified, discovering all token-accessible repos")
            page = 1
            while len(repos_to_sync) < GITHUB_MAX_REPOS:
                repos_resp = await client.get(
                    "https://api.github.com/user/repos",
                    headers=headers,
                    params={
                        "per_page": str(GITHUB_LIST_PAGE_SIZE),
                        "page": str(page),
                        "sort": "updated",
                    },
                )
                if repos_resp.status_code == 401:
                    raise ValueError("Invalid GitHub token or insufficient permissions")
                if repos_resp.status_code != 200:
                    raise ValueError(f"GitHub API error {repos_resp.status_code}: {repos_resp.text[:200]}")

                repo_items = repos_resp.json()
                if not repo_items:
                    break

                for item in repo_items:
                    owner_info = item.get("owner") or {}
                    owner = owner_info.get("login")
                    repo = item.get("name")
                    if owner and repo:
                        repos_to_sync.append((owner, repo))
                    if len(repos_to_sync) >= GITHUB_MAX_REPOS:
                        break

                if len(repo_items) < GITHUB_LIST_PAGE_SIZE:
                    break
                page += 1

        if not repos_to_sync:
            raise ValueError("No GitHub repositories found for this token")

        seen_repo_keys: set[tuple[str, str]] = set()
        deduped_repos: List[tuple[str, str]] = []
        for owner, repo in repos_to_sync:
            key = (owner.lower(), repo.lower())
            if key in seen_repo_keys:
                continue
            seen_repo_keys.add(key)
            deduped_repos.append((owner, repo))
        repos_to_sync = deduped_repos
        logger.info("_sync_github: %d repos to sync after dedup", len(repos_to_sync))

        skipped_repos = 0
        empty_tree_repos = 0
        total_files_found = 0
        total_content_errors = 0
        total_docs_created = 0

        for owner, repo in repos_to_sync:
            repo_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=headers,
            )
            if repo_resp.status_code == 403:
                remaining = repo_resp.headers.get("x-ratelimit-remaining", "")
                if remaining == "0":
                    logger.warning("_sync_github: GitHub rate limit hit at repo %s/%s — stopping sync", owner, repo)
                    break  # Stop processing further repos
                logger.warning("_sync_github: repo %s/%s returned 403, skipping", owner, repo)
                skipped_repos += 1
                continue
            if repo_resp.status_code == 404:
                logger.warning("_sync_github: repo %s/%s returned 404, skipping", owner, repo)
                skipped_repos += 1
                continue
            if repo_resp.status_code == 401:
                raise ValueError("Invalid GitHub token or insufficient permissions")
            if repo_resp.status_code != 200:
                logger.warning("_sync_github: repo %s/%s returned %d, skipping", owner, repo, repo_resp.status_code)
                skipped_repos += 1
                continue

            repo_data = repo_resp.json()
            repo_branch = configured_branch or repo_data.get("default_branch", "main")

            tree_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{repo_branch}?recursive=1",
                headers=headers,
            )
            if tree_resp.status_code != 200:
                logger.warning("_sync_github: tree for %s/%s branch=%s returned %d", owner, repo, repo_branch, tree_resp.status_code)
                skipped_repos += 1
                continue

            tree_data = tree_resp.json()
            tree_items = tree_data.get("tree", [])
            all_files = [
                f for f in tree_items
                if f.get("type") == "blob"
                and _is_text_file(f.get("path", ""), int(f.get("size", 0) or 0))
            ]
            selected_files = all_files[:GITHUB_MAX_FILES_PER_REPO]
            total_files_found += len(selected_files)

            if not selected_files:
                logger.info("_sync_github: %s/%s — %d tree items, 0 text files matched", owner, repo, len(tree_items))
                empty_tree_repos += 1
            else:
                logger.info("_sync_github: %s/%s — %d tree items, %d text files selected", owner, repo, len(tree_items), len(selected_files))

            # Delete all existing docs for this repo before re-indexing
            existing_repo_docs = await db.execute(
                select(Document.id).where(
                    Document.user_id == user_id,
                    Document.file_type == "github",
                    Document.file_path.like(f"github://{owner}/{repo}/%"),
                )
            )
            old_doc_ids = [row[0] for row in existing_repo_docs.all()]
            if old_doc_ids:
                await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id.in_(old_doc_ids)))
                await db.execute(delete(Document).where(Document.id.in_(old_doc_ids)))
                await db.flush()

            # Each file becomes its own Document with proper chunking
            FILE_CHUNK_CHARS = 6000  # ~1000 tokens per chunk
            repo_doc_count = 0
            repo_content_errors = 0

            for file in selected_files:
                file_path_str = file.get("path")
                if not file_path_str:
                    continue
                try:
                    content_resp = await client.get(
                        f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path_str}",
                        headers=headers,
                        params={"ref": repo_branch},
                    )
                    if content_resp.status_code == 403:
                        remaining = content_resp.headers.get("x-ratelimit-remaining", "")
                        if remaining == "0":
                            logger.warning("_sync_github: GitHub rate limit hit at %s/%s/%s", owner, repo, file_path_str)
                            break  # Stop processing this repo
                        repo_content_errors += 1
                        continue
                    if content_resp.status_code != 200:
                        repo_content_errors += 1
                        continue
                    content_data = content_resp.json()
                    raw = base64.b64decode(content_data.get("content", "")).decode("utf-8", errors="replace").strip()
                    if not raw:
                        continue
                except Exception as e:
                    repo_content_errors += 1
                    logger.debug("_sync_github: error fetching %s/%s/%s: %s", owner, repo, file_path_str, e)
                    continue

                doc_name = f"[GitHub] {owner}/{repo}/{file_path_str}"
                file_doc = Document(
                    user_id=user_id,
                    name=doc_name,
                    original_name=file_path_str,
                    file_path=f"github://{owner}/{repo}/{file_path_str}",
                    duplicate_key=document_service.build_duplicate_key(
                        "github",
                        file_path=f"github://{owner}/{repo}/{file_path_str}",
                    ),
                    file_type="github",
                    file_size=len(raw.encode("utf-8")),
                    status=DocumentStatus.indexed,
                    word_count=len(raw.split()),
                )
                db.add(file_doc)
                await db.flush()

                # Split large files into chunks so nothing gets cut off
                file_chunks = [raw[i: i + FILE_CHUNK_CHARS] for i in range(0, len(raw), FILE_CHUNK_CHARS)]
                for ci, chunk_text in enumerate(file_chunks):
                    labeled = f"[{owner}/{repo}:{file_path_str}]\n{chunk_text}"
                    db.add(DocumentChunk(
                        document_id=file_doc.id,
                        content=labeled,
                        chunk_index=ci,
                        token_count=len(labeled.split()),
                    ))
                    vector_batch.append({
                        "id": f"{file_doc.id}:{ci}",
                        "text": labeled,
                        "metadata": {
                            "user_id": str(user_id),
                            "document_id": str(file_doc.id),
                            "document_name": doc_name,
                            "document_type": "github",
                            "chunk_text": labeled[:2000],
                        },
                    })
                    total_chunks += 1

                repo_doc_count += 1
                if repo_doc_count % CONNECTOR_SYNC_BATCH_SIZE == 0:
                    await db.flush()
                    await db.commit()
                    if vector_store.enabled and vector_batch:
                        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)
                    vector_batch = []

            total_content_errors += repo_content_errors
            total_docs_created += repo_doc_count
            if repo_doc_count > 0 or repo_content_errors > 0:
                logger.info("_sync_github: %s/%s — %d docs created, %d content errors",
                            owner, repo, repo_doc_count, repo_content_errors)

    await db.flush()
    await db.commit()
    if vector_store.enabled and vector_batch:
        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)

    logger.info(
        "_sync_github: DONE connector=%s — repos=%d, skipped=%d, empty=%d, "
        "files_found=%d, content_errors=%d, docs_created=%d, chunks=%d",
        connector.id, len(repos_to_sync), skipped_repos, empty_tree_repos,
        total_files_found, total_content_errors, total_docs_created, total_chunks,
    )
    return total_chunks


async def _refresh_google_token(connector: "Connector", db: AsyncSession, client) -> str:
    """Exchange a stored Google refresh_token for a new access_token and persist it."""
    cfg: Dict[str, Any] = connector.config or {}
    refresh_token: str = cfg.get("refreshToken") or cfg.get("refresh_token") or ""
    if not refresh_token:
        raise ValueError("No refresh token stored — user must reconnect Google account")
    resp = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    if resp.status_code != 200:
        raise ValueError(f"Google token refresh failed ({resp.status_code}): {resp.text[:200]}")
    new_token: str = resp.json().get("access_token") or ""
    if not new_token:
        raise ValueError("Token refresh returned no access_token")
    connector.config = {**cfg, "accessToken": new_token}
    await db.flush()
    await db.commit()
    return new_token


async def _sync_google_drive(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """Fetch all Google Drive files. Auto-refreshes expired access tokens."""
    import httpx

    cfg: Dict[str, Any] = connector.config or {}
    access_token: str = cfg.get("accessToken") or cfg.get("access_token") or ""
    folder_id: str = cfg.get("folderId", "all")
    if folder_id.lower() == "root":
        folder_id = "all"

    if not access_token:
        raise ValueError("Google OAuth access token is required")

    headers = {"Authorization": f"Bearer {access_token}"}
    vector_store = get_vector_store()

    EXPORT_TYPES: Dict[str, str] = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
    }
    DIRECT_TYPES = {"text/plain", "text/markdown", "application/json", "text/csv"}
    # Binary types we can download and parse locally
    BINARY_TYPES: Dict[str, str] = {
        "application/pdf": ".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/msword": ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.ms-excel": ".xlsx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "application/vnd.ms-powerpoint": ".pptx",
    }

    # Remove previous sync documents from this folder to keep state deterministic.
    if folder_id.lower() in {"all", "*"}:
        existing = await db.execute(
            select(Document.id).where(
                Document.user_id == user_id,
                Document.file_type == "google_drive",
            )
        )
    else:
        existing = await db.execute(
            select(Document.id).where(
                Document.user_id == user_id,
                Document.file_type == "google_drive",
                or_(
                    Document.file_path == f"gdrive://{folder_id}",
                    Document.file_path.like(f"gdrive://{folder_id}/%"),
                ),
            )
        )
    doc_ids = [row[0] for row in existing.all()]
    if doc_ids:
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id.in_(doc_ids)))
        await db.execute(delete(Document).where(Document.id.in_(doc_ids)))
        await db.flush()

    created_count = 0
    page_token: Optional[str] = None
    vector_batch: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=60) as client:
        while created_count < GOOGLE_DRIVE_MAX_FILES:
            # By default, sync everything visible to the user (all file types).
            # If a folderId is provided (and not "all"), scope to that folder.
            if folder_id.lower() in {"all", "*"}:
                drive_query = "trashed=false"
            else:
                drive_query = f"'{folder_id}' in parents and trashed=false"

            params: Dict[str, str] = {
                "q": drive_query,
                "fields": "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)",
                "pageSize": str(GOOGLE_DRIVE_LIST_PAGE_SIZE),
                "includeItemsFromAllDrives": "true",
                "supportsAllDrives": "true",
            }
            if page_token:
                params["pageToken"] = page_token

            list_resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers=headers,
                params=params,
            )
            if list_resp.status_code == 401:
                # Token expired — try to refresh automatically
                access_token = await _refresh_google_token(connector, db, client)
                headers = {"Authorization": f"Bearer {access_token}"}
                list_resp = await client.get(
                    "https://www.googleapis.com/drive/v3/files",
                    headers=headers,
                    params=params,
                )
                if list_resp.status_code == 401:
                    raise ValueError("Google Drive token refresh failed — please reconnect.")
            if list_resp.status_code != 200:
                raise ValueError(f"Google Drive API error {list_resp.status_code}: {list_resp.text[:200]}")

            payload = list_resp.json()
            files_data = payload.get("files", [])
            if not files_data:
                break

            for file in files_data:
                if created_count >= GOOGLE_DRIVE_MAX_FILES:
                    break

                file_id = file["id"]
                file_name = file.get("name") or f"Untitled {file_id}"
                mime = file.get("mimeType", "")
                raw_size = int(file.get("size") or 0)
                web_link = file.get("webViewLink") or ""
                modified = file.get("modifiedTime") or ""
                full_text = ""
                page_count = 0
                try:
                    if mime in EXPORT_TYPES:
                        export_resp = await client.get(
                            f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                            headers=headers,
                            params={"mimeType": EXPORT_TYPES[mime]},
                        )
                        if export_resp.status_code == 200:
                            full_text = export_resp.text.strip()
                    elif mime in DIRECT_TYPES:
                        dl_resp = await client.get(
                            f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                            headers=headers,
                        )
                        if dl_resp.status_code == 200:
                            full_text = dl_resp.text.strip()
                    elif mime in BINARY_TYPES:
                        # Download binary, write to temp file, parse with local extractor
                        import tempfile
                        from app.services.document_service import extract_text as _extract_text
                        ext = BINARY_TYPES[mime]
                        dl_resp = await client.get(
                            f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                            headers=headers,
                        )
                        if dl_resp.status_code == 200:
                            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                                tmp.write(dl_resp.content)
                                tmp_path = tmp.name
                            try:
                                full_text, page_count = _extract_text(tmp_path, ext)
                            finally:
                                import os as _os
                                try:
                                    _os.unlink(tmp_path)
                                except Exception:
                                    pass
                except Exception as exc:
                    logger.warning("Google Drive content extraction failed for %s: %s", file_name, exc)
                    full_text = ""

                if not full_text:
                    full_text = (
                        f"Google Drive file '{file_name}' (mime: {mime or 'unknown'}) was indexed. "
                        f"Full text extraction is not available for this file type. "
                        f"Last modified: {modified or 'unknown'}. "
                        f"Link: {web_link or 'n/a'}"
                    )

                # Split into chunks of ~1500 words each so long docs get multiple searchable chunks
                CHUNK_WORDS = 1500
                words = full_text.split()
                text_chunks = []
                for ci in range(0, max(1, len(words)), CHUNK_WORDS):
                    chunk_text = " ".join(words[ci: ci + CHUNK_WORDS]).strip()
                    if chunk_text:
                        text_chunks.append(chunk_text)
                if not text_chunks:
                    text_chunks = [full_text[:5000]]

                doc_id = uuid.uuid4()
                doc = Document(
                    id=doc_id,
                    user_id=user_id,
                    name=f"[Google Drive] {file_name}",
                    original_name=file_name,
                    file_path=f"gdrive://{folder_id}/{file_id}",
                    duplicate_key=document_service.build_duplicate_key(
                        "google_drive",
                        file_path=f"gdrive://{folder_id}/{file_id}",
                    ),
                    file_type="google_drive",
                    file_size=max(raw_size, len(full_text)),
                    status=DocumentStatus.indexed,
                    word_count=len(words),
                    page_count=page_count or None,
                )
                db.add(doc)

                for ci, chunk_text in enumerate(text_chunks):
                    chunk_id = uuid.uuid4()
                    db.add(
                        DocumentChunk(
                            id=chunk_id,
                            document_id=doc_id,
                            content=chunk_text,
                            chunk_index=ci,
                            token_count=len(chunk_text.split()),
                        )
                    )
                    vector_batch.append(
                        {
                            "id": f"{doc_id}:{ci}",
                            "text": chunk_text,
                            "metadata": {
                                "user_id": str(user_id),
                                "document_id": str(doc_id),
                                "document_name": doc.name,
                                "document_type": doc.file_type,
                                "chunk_text": chunk_text[:2000],
                            },
                        }
                    )

                created_count += 1

                if created_count % CONNECTOR_SYNC_BATCH_SIZE == 0:
                    await db.flush()
                    await db.commit()
                    if vector_store.enabled and vector_batch:
                        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)
                    vector_batch = []

            page_token = payload.get("nextPageToken")
            if not page_token:
                break

    await db.flush()
    await db.commit()
    if vector_store.enabled and vector_batch:
        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)

    return created_count


async def _sync_web_crawler(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Crawl a website starting from the configured URL, extract text from each page,
    and store it as DocumentChunks so it becomes searchable via RAG.

    Strategy:
    1. Try trafilatura (best-in-class main-content extractor, strips nav/ads/footer).
    2. Fall back to BeautifulSoup targeting semantic content tags.
    3. If a page looks JS-only (<500 chars extracted), retry with a Googlebot UA
       — many Next.js/React sites SSR their content for crawlers.
    4. Discover extra URLs from sitemap.xml in addition to link-following.

    Returns the number of pages indexed.
    """
    import httpx
    import re
    from urllib.parse import urljoin, urlparse

    try:
        import trafilatura
        HAS_TRAFILATURA = True
    except ImportError:
        HAS_TRAFILATURA = False

    try:
        from bs4 import BeautifulSoup
        HAS_BS4 = True
    except ImportError:
        HAS_BS4 = False

    cfg: Dict[str, Any] = connector.config or {}
    start_url: str = cfg.get("url", "")
    max_depth: int = min(int(cfg.get("depth", 2)), 4)
    max_pages: int = 50

    if not start_url:
        raise ValueError("Web crawler URL missing in connector config")

    base_domain = urlparse(start_url).netloc

    _UA_BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    _UA_BROWSER = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )

    def _bs4_extract(html: str) -> str:
        """BeautifulSoup content extraction targeting semantic tags."""
        if not HAS_BS4:
            return ""
        soup = BeautifulSoup(html, "lxml")
        # Remove noise tags
        for tag in soup(["script", "style", "nav", "header", "footer",
                          "aside", "noscript", "svg", "form", "iframe"]):
            tag.decompose()
        # Try semantic content containers first
        for selector in ["main", "article", '[role="main"]',
                          ".content", "#content", ".main", "#main",
                          ".post-body", ".entry-content", ".page-content"]:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(separator="\n", strip=True)
                if len(text) > 200:
                    return text
        # Fall back to body
        body = soup.find("body")
        return body.get_text(separator="\n", strip=True) if body else ""

    def _extract_text(html: str) -> str:
        """Try trafilatura first, then BS4, then regex fallback."""
        # trafilatura: specifically designed to extract main article/page text
        if HAS_TRAFILATURA:
            extracted = trafilatura.extract(
                html,
                include_tables=True,
                include_links=False,
                no_fallback=False,
                favor_precision=False,
            )
            if extracted and len(extracted.strip()) > 150:
                return extracted.strip()

        # BS4: targets semantic content selectors
        bs_text = _bs4_extract(html)
        if len(bs_text) > 150:
            return bs_text

        # Last resort: regex strip
        clean = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
        clean = re.sub(r'<[^>]+>', ' ', clean)
        clean = re.sub(r'[ \t]+', ' ', clean)
        return re.sub(r'\n{3,}', '\n\n', clean).strip()

    def _extract_title(html: str, url: str) -> str:
        if HAS_BS4:
            soup = BeautifulSoup(html, "lxml")
            og = soup.find("meta", property="og:title")
            if og and og.get("content"):
                return og["content"].strip()
            if soup.title and soup.title.string:
                return soup.title.string.strip()
        m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        return re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else url

    def _extract_links(html: str, current_url: str) -> List[str]:
        links = []
        if HAS_BS4:
            soup = BeautifulSoup(html, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                    continue
                full = urljoin(current_url, href)
                parsed = urlparse(full)
                if parsed.netloc == base_domain and parsed.scheme in ("http", "https"):
                    clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
                    links.append(clean)
        else:
            hrefs = re.findall(r'<a[^>]+href=["\']([^"\'#?][^"\']*)["\']', html, re.IGNORECASE)
            for href in hrefs:
                full = urljoin(current_url, href)
                parsed = urlparse(full)
                if parsed.netloc == base_domain and parsed.scheme in ("http", "https"):
                    links.append(f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/"))
        return links

    async def _fetch_sitemap_urls(client: httpx.AsyncClient) -> List[str]:
        """Try to discover pages from sitemap.xml / sitemap_index.xml."""
        urls: List[str] = []
        for sitemap_path in ["/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"]:
            sitemap_url = f"https://{base_domain}{sitemap_path}"
            try:
                r = await client.get(sitemap_url, timeout=8.0)
                if r.status_code == 200 and "xml" in r.headers.get("content-type", ""):
                    found = re.findall(r'<loc>\s*(https?://[^<]+)\s*</loc>', r.text)
                    same_domain = [
                        u.strip() for u in found
                        if urlparse(u.strip()).netloc == base_domain
                    ]
                    urls.extend(same_domain[:40])
                    if urls:
                        break
            except Exception:
                pass
        return urls

    async def _fetch_page(client: httpx.AsyncClient, url: str, ua: str) -> str | None:
        """Fetch a URL with a given User-Agent, return HTML or None."""
        try:
            resp = await client.get(
                url,
                headers={"User-Agent": ua,
                         "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
                         "Accept-Language": "en-US,en;q=0.9"},
                timeout=20.0,
                follow_redirects=True,
            )
            if resp.status_code != 200:
                return None
            ct = resp.headers.get("content-type", "")
            if "text/html" not in ct:
                return None
            return resp.text
        except Exception as exc:
            logger.warning("Crawler fetch failed %s: %s", url, exc)
            return None

    # BFS crawl
    visited: set = set()
    queue: List[tuple] = [(start_url.rstrip("/"), 0)]
    pages: List[Dict[str, str]] = []

    async with httpx.AsyncClient() as client:
        # Pre-seed queue from sitemap
        sitemap_urls = await _fetch_sitemap_urls(client)
        for su in sitemap_urls:
            clean = su.rstrip("/")
            if clean not in visited:
                queue.append((clean, 1))

        while queue and len(pages) < max_pages:
            url, depth = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            # First try browser-like UA
            html = await _fetch_page(client, url, _UA_BROWSER)
            if not html:
                continue

            text = _extract_text(html)

            # If JS-rendered (very little text extracted), retry with Googlebot UA
            # — many Next.js/React sites SSR content for Googlebot
            if len(text) < 300:
                html_bot = await _fetch_page(client, url, _UA_BOT)
                if html_bot:
                    text_bot = _extract_text(html_bot)
                    if len(text_bot) > len(text):
                        html = html_bot
                        text = text_bot

            # Clean up text
            text = re.sub(r'\n{4,}', '\n\n', text).strip()

            if len(text) > 80:
                title = _extract_title(html, url)
                pages.append({"url": url, "title": title, "text": text})

            if depth < max_depth:
                for link in _extract_links(html, url):
                    if link not in visited:
                        queue.append((link, depth + 1))

    if not pages:
        pages = [{
            "url": start_url,
            "title": connector.name,
            "text": (
                f"The website {start_url} was crawled but no readable text content could be "
                "extracted. The site may require JavaScript execution to render its content. "
                "Consider uploading specific pages or documents manually instead."
            ),
        }]

    # Remove previous documents from this connector
    doc_name_prefix = f"[Crawler] {connector.name}"
    existing = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.name.like(f"{doc_name_prefix}%"),
        )
    )
    for old_doc in existing.scalars().all():
        await db.delete(old_doc)
    await db.flush()

    # Store each page as a Document with chunks
    total_chunks = 0
    from app.services.document_service import _chunk_text
    for page in pages:
        doc = Document(
            user_id=user_id,
            name=f"{doc_name_prefix}: {page['title'][:80]}",
            original_name=page["url"],
            file_path=page["url"],
            duplicate_key=document_service.build_duplicate_key("web", file_path=page["url"]),
            file_type="web",
            file_size=len(page["text"].encode()),
            status="indexed",
            word_count=len(page["text"].split()),
            page_count=1,
        )
        db.add(doc)
        await db.flush()

        for chunk_idx, chunk_text in _chunk_text(page["text"]):
            db.add(DocumentChunk(
                document_id=doc.id,
                content=chunk_text,
                chunk_index=chunk_idx,
                token_count=len(chunk_text.split()),
            ))
            total_chunks += 1

    await db.flush()
    return len(pages)


@router.delete("/connectors/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connector = await _get_user_connector(connector_id, current_user.id, db)

    # Delete all documents + chunks synced by this connector
    connector_type = connector.type
    synced_docs = await db.execute(
        select(Document).where(
            Document.user_id == current_user.id,
            Document.file_type == connector_type,
        )
    )
    for doc in synced_docs.scalars().all():
        await db.delete(doc)  # cascades to chunks

    await db.delete(connector)
    await db.flush()


# ── Google OAuth for connectors ───────────────────────────────────────────────

_GOOGLE_SCOPES = {
    "google_drive": "https://www.googleapis.com/auth/drive.readonly",
    "gmail":        "https://www.googleapis.com/auth/gmail.readonly",
}


@router.get("/connectors/oauth/google/start")
async def google_oauth_start(
    connector_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the Google OAuth consent URL as JSON.

    The frontend fetches this via authFetch (with JWT header) then redirects
    the browser to the returned URL.  The user_id is encoded in the OAuth state
    parameter so the callback can identify the user without a session cookie.
    """
    import urllib.parse, base64, json as _json

    scope = _GOOGLE_SCOPES.get(connector_type)
    if not scope:
        raise HTTPException(status_code=400, detail=f"Unsupported connector type: {connector_type}")
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    state = base64.urlsafe_b64encode(
        _json.dumps({"uid": str(current_user.id), "type": connector_type}).encode()
    ).decode()

    # The callback goes through the Next.js proxy (/api/backend/*) which
    # forwards to FastAPI — this is the URL registered in Google Cloud Console
    frontend_base = settings.CONNECTOR_OAUTH_REDIRECT_BASE.rstrip("/")
    redirect_uri = f"{frontend_base}/api/backend/knowledge/connectors/oauth/google/callback"

    params = urllib.parse.urlencode({
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         scope,
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/connectors/oauth/google/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Exchange auth code → tokens → create connector → trigger sync → redirect to frontend."""
    import base64, json as _json, httpx
    from fastapi.responses import RedirectResponse

    try:
        payload = _json.loads(base64.urlsafe_b64decode(state + "=="))
        user_id = uuid.UUID(payload["uid"])
        connector_type = payload["type"]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    frontend_base = settings.CONNECTOR_OAUTH_REDIRECT_BASE.rstrip("/")
    redirect_uri = f"{frontend_base}/api/backend/knowledge/connectors/oauth/google/callback"

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code":          code,
                "client_id":     settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri":  redirect_uri,
                "grant_type":    "authorization_code",
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_resp.text[:200]}")

    token_data = token_resp.json()
    access_token  = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")

    # Upsert connector
    connector, duplicates = await _get_primary_connector_for_type(db, user_id, connector_type)
    label = "Google Drive" if connector_type == "google_drive" else "Gmail"
    if connector is None:
        connector = Connector(
            user_id=user_id, type=connector_type, name=label,
            status=ConnectorStatus.syncing,
            config={"accessToken": access_token, "refreshToken": refresh_token, "folderId": "all"},
        )
        db.add(connector)
    else:
        connector_config = {**(connector.config or {}), "accessToken": access_token, "refreshToken": refresh_token}
        if connector_type == "google_drive":
            connector_config["folderId"] = "all"
        connector.config = connector_config
        connector.status = ConnectorStatus.syncing

    for duplicate in duplicates:
        await db.delete(duplicate)

    await db.flush()
    await db.refresh(connector)
    await db.commit()

    # Kick off sync in background with a fresh DB session (via BackgroundTasks)
    background_tasks.add_task(_run_connector_sync_job, connector.id, user_id, connector_type)

    frontend_url = settings.CONNECTOR_OAUTH_REDIRECT_BASE.rstrip("/")
    return RedirectResponse(f"{frontend_url}/knowledge-base?connected={connector_type}")


async def _run_connector_sync_job(
    connector_id: uuid.UUID,
    user_id: uuid.UUID,
    connector_type: str,
) -> None:
    """Run connector sync in a detached background session.

    This avoids long-running OAuth callback requests timing out.
    """
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(Connector).where(Connector.id == connector_id, Connector.user_id == user_id)
            )
            connector = result.scalar_one_or_none()
            if connector is None:
                return

            connector.status = ConnectorStatus.syncing
            connector.last_sync_at = datetime.now(timezone.utc)
            cfg = dict(connector.config or {})
            cfg["sync_started_at"] = connector.last_sync_at.isoformat()
            cfg.pop("last_error", None)
            connector.config = cfg
            await session.flush()
            await session.commit()

            if connector_type == "google_drive":
                chunks = await _sync_google_drive(connector, user_id, session)
            else:
                chunks = await _sync_gmail(connector, user_id, session)

            connector.document_count = chunks
            connector.status = ConnectorStatus.connected
            connector.last_sync_at = datetime.now(timezone.utc)
            cfg = dict(connector.config or {})
            cfg.pop("last_error", None)
            connector.config = cfg
            await session.flush()
            await session.commit()
        except Exception as exc:
            logger.warning("Background connector sync failed (%s): %s", connector_type, exc)
            await session.rollback()
            try:
                result = await session.execute(
                    select(Connector).where(Connector.id == connector_id, Connector.user_id == user_id)
                )
                connector = result.scalar_one_or_none()
                if connector is not None:
                    connector.status = ConnectorStatus.error
                    connector.last_sync_at = datetime.now(timezone.utc)
                    cfg = dict(connector.config or {})
                    cfg["last_error"] = str(exc)[:500]
                    connector.config = cfg
                    await session.flush()
                    await session.commit()
            except Exception:
                await session.rollback()


async def _sync_gmail(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """Fetch recent Gmail messages and index them as searchable document chunks."""
    import httpx

    cfg: Dict[str, Any] = connector.config or {}
    access_token: str = cfg.get("accessToken", "")
    if not access_token:
        access_token = cfg.get("access_token", "")
    if not access_token:
        raise ValueError("Gmail OAuth access token is required")

    headers = {"Authorization": f"Bearer {access_token}"}
    vector_store = get_vector_store()

    created_count = 0
    page_token: Optional[str] = None
    vector_batch: List[Dict[str, Any]] = []
    docs_cleared = False  # Only clear old docs once we confirm the token is valid

    async with httpx.AsyncClient(timeout=30) as client:
        while created_count < GMAIL_MAX_MESSAGES:
            list_resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers=headers,
                params={
                    "maxResults": str(GMAIL_LIST_PAGE_SIZE),
                    "includeSpamTrash": "true",
                    **({"pageToken": page_token} if page_token else {}),
                },
            )
            if list_resp.status_code == 401:
                # Token expired — try to refresh automatically
                access_token = await _refresh_google_token(connector, db, client)
                headers = {"Authorization": f"Bearer {access_token}"}
                list_resp = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    headers=headers,
                    params={
                        "maxResults": str(GMAIL_LIST_PAGE_SIZE),
                        "includeSpamTrash": "true",
                        **({"pageToken": page_token} if page_token else {}),
                    },
                )
                if list_resp.status_code == 401:
                    raise ValueError("Gmail token refresh failed — please reconnect via OAuth.")
            if list_resp.status_code != 200:
                raise ValueError(f"Gmail API error {list_resp.status_code}")

            # Token confirmed valid — safe to clear old docs now (only once)
            if not docs_cleared:
                existing = await db.execute(
                    select(Document.id).where(
                        Document.user_id == user_id,
                        Document.file_type == "gmail",
                        or_(
                            Document.file_path == "gmail://inbox",
                            Document.file_path.like("gmail://inbox/%"),
                        ),
                    )
                )
                doc_ids = [row[0] for row in existing.all()]
                if doc_ids:
                    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id.in_(doc_ids)))
                    await db.execute(delete(Document).where(Document.id.in_(doc_ids)))
                    await db.flush()
                docs_cleared = True

            payload = list_resp.json()
            messages = payload.get("messages", [])
            if not messages:
                break

            for msg in messages:
                if created_count >= GMAIL_MAX_MESSAGES:
                    break

                msg_id = msg["id"]
                msg_resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                    headers=headers,
                    params={"format": "full"},
                )
                if msg_resp.status_code != 200:
                    continue

                data = msg_resp.json()
                hdrs = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
                subject = hdrs.get("Subject", "(no subject)")
                sender = hdrs.get("From", "")
                date_str = hdrs.get("Date", "")
                snippet = (data.get("snippet") or "").strip()

                # Extract full plain-text body from MIME parts
                def _extract_gmail_body(payload_node: dict) -> str:
                    """Recursively extract plain-text body from Gmail payload."""
                    import base64
                    mime = payload_node.get("mimeType", "")
                    body_data = payload_node.get("body", {}).get("data", "")
                    parts = payload_node.get("parts", [])
                    if mime == "text/plain" and body_data:
                        try:
                            return base64.urlsafe_b64decode(body_data + "==").decode("utf-8", errors="replace")
                        except Exception:
                            pass
                    for part in parts:
                        result = _extract_gmail_body(part)
                        if result:
                            return result
                    return ""

                body_text = _extract_gmail_body(data.get("payload", {})).strip()
                # Fall back to snippet if body couldn't be decoded
                body = body_text if body_text else (snippet or "No body content available.")

                internal_date_raw = data.get("internalDate")
                received_at = datetime.now(timezone.utc)
                if isinstance(internal_date_raw, str) and internal_date_raw.isdigit():
                    received_at = datetime.fromtimestamp(int(internal_date_raw) / 1000, tz=timezone.utc)
                elif isinstance(internal_date_raw, (int, float)):
                    received_at = datetime.fromtimestamp(float(internal_date_raw) / 1000, tz=timezone.utc)

                content = (
                    f"[Email] Subject: {subject} | From: {sender} | Date: {date_str} | "
                    f"ReceivedAtUTC: {received_at.isoformat()}\n\n{body}"
                )
                doc_id = uuid.uuid4()
                doc_name = f"[Gmail] {subject[:120]}"

                db.add(
                    Document(
                        id=doc_id,
                        user_id=user_id,
                        name=doc_name,
                        original_name=subject,
                        file_path=f"gmail://inbox/{msg_id}",
                        duplicate_key=document_service.build_duplicate_key(
                            "gmail",
                            file_path=f"gmail://inbox/{msg_id}",
                        ),
                        file_type="gmail",
                        file_size=len(content),
                        status=DocumentStatus.indexed,
                        word_count=len(content.split()),
                        created_at=received_at,
                        updated_at=received_at,
                    )
                )
                db.add(
                    DocumentChunk(
                        id=uuid.uuid4(),
                        document_id=doc_id,
                        chunk_index=0,
                        content=content,
                        token_count=len(content.split()),
                    )
                )

                vector_batch.append(
                    {
                        "id": f"{doc_id}:0",
                        "text": content,
                        "metadata": {
                            "user_id": str(user_id),
                            "document_id": str(doc_id),
                            "document_name": doc_name,
                            "document_type": "gmail",
                            "chunk_text": content[:2000],
                            "created_at": received_at.isoformat(),
                        },
                    }
                )

                created_count += 1
                if created_count % CONNECTOR_SYNC_BATCH_SIZE == 0:
                    await db.flush()
                    await db.commit()
                    if vector_store.enabled and vector_batch:
                        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)
                    vector_batch = []

            page_token = payload.get("nextPageToken")
            if not page_token:
                break

    await db.flush()
    await db.commit()
    if vector_store.enabled and vector_batch:
        await vector_store.upsert_chunks(user_id=user_id, records=vector_batch)

    return created_count


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=KnowledgeStats)
async def knowledge_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total documents
    doc_count = (
        await db.execute(
            select(func.count(Document.id)).where(Document.user_id == current_user.id)
        )
    ).scalar() or 0

    # Total chunks
    chunk_count = (
        await db.execute(
            select(func.count(DocumentChunk.id))
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.user_id == current_user.id)
        )
    ).scalar() or 0

    # Storage used
    storage = (
        await db.execute(
            select(func.coalesce(func.sum(Document.file_size), 0))
            .where(Document.user_id == current_user.id)
        )
    ).scalar() or 0

    # Collections
    col_count = (
        await db.execute(
            select(func.count(Collection.id)).where(Collection.user_id == current_user.id)
        )
    ).scalar() or 0

    # Connectors
    connector_count = (
        await db.execute(
            select(func.count(Connector.id)).where(Connector.user_id == current_user.id)
        )
    ).scalar() or 0

    # Last indexed
    last_indexed = (
        await db.execute(
            select(func.max(Document.updated_at)).where(Document.user_id == current_user.id)
        )
    ).scalar()

    return KnowledgeStats(
        totalDocuments=doc_count,
        totalChunks=chunk_count,
        storageUsedBytes=storage,
        totalCollections=col_count,
        totalConnectors=connector_count,
        lastIndexedAt=last_indexed,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user_document(
    document_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == user_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def _get_user_connector(
    connector_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> Connector:
    result = await db.execute(
        select(Connector).where(
            Connector.id == connector_id, Connector.user_id == user_id
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return connector
