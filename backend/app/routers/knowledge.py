import logging
import math
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.knowledge import Collection, Connector, ConnectorStatus, Document, DocumentChunk
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

logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".mpeg", ".mpga"}
WHISPER_SIZE_LIMIT = 25 * 1024 * 1024   # 25 MB — OpenAI Whisper hard limit
MAX_VIDEO_UPLOAD   = 100 * 1024 * 1024  # 100 MB — user-facing limit
GEMINI_VIDEO_MODEL = "gemini-2.0-flash"

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


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=PaginatedResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    documentType: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Document).where(Document.user_id == current_user.id)

    if search:
        q = q.where(Document.name.ilike(f"%{search}%"))
    if status:
        q = q.where(Document.status == status)
    if documentType:
        q = q.where(Document.file_type == documentType)

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
    current_user: User = Depends(get_current_user),
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
            transcript_text = await _gemini_video_analyze(
                file_path=file_path,
                suffix=suffix,
                original_name=original_name,
            )
            engine = f"Gemini {GEMINI_VIDEO_MODEL}"
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
        raise HTTPException(status_code=500, detail=f"Video processing failed: {exc}")
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
    import time

    def _run_sync() -> str:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=settings.GOOGLE_API_KEY)

        mime = GEMINI_VIDEO_MIME.get(suffix, "video/mp4")
        logger.info("Uploading '%s' to Gemini Files API (mime=%s)…", original_name, mime)

        uploaded = genai.upload_file(path=str(file_path), mime_type=mime)

        # Poll until processing is complete (Gemini processes server-side)
        deadline = time.time() + 600  # 10-minute timeout
        while uploaded.state.name == "PROCESSING":
            if time.time() > deadline:
                raise TimeoutError("Gemini file processing timed out after 10 minutes")
            time.sleep(5)
            uploaded = genai.get_file(uploaded.name)

        if uploaded.state.name == "FAILED":
            raise RuntimeError(f"Gemini file processing failed for '{original_name}'")

        logger.info("Gemini file ready: %s — running %s analysis…", uploaded.name, GEMINI_VIDEO_MODEL)

        model = genai.GenerativeModel(GEMINI_VIDEO_MODEL)
        response = model.generate_content(
            [uploaded, GEMINI_VIDEO_PROMPT],
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=8192,
            ),
        )

        # Clean up remote file to avoid storage accumulation
        try:
            genai.delete_file(uploaded.name)
        except Exception:
            pass

        analysis = response.text.strip()
        if not analysis:
            analysis = f"[No content extracted from '{original_name}' via Gemini 2.0]"

        logger.info(
            "Gemini 2.0 analysis for '%s': %d chars", original_name, len(analysis)
        )
        return analysis

    # Run the blocking SDK calls in a thread pool so we don't block the event loop
    return await asyncio.get_event_loop().run_in_executor(None, _run_sync)


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
    connectors = result.scalars().all()
    return [ConnectorOut.from_orm(c) for c in connectors]


@router.post("/connectors", response_model=ConnectorOut, status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: CreateConnectorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    connector = Connector(
        user_id=current_user.id,
        type=body.type,
        name=body.name,
        config=body.config or {},
        status=ConnectorStatus.connected,
    )
    db.add(connector)
    await db.flush()
    return ConnectorOut.from_orm(connector)


@router.post("/connectors/{connector_id}/sync")
async def sync_connector(
    connector_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    connector = await _get_user_connector(connector_id, current_user.id, db)
    connector.status = ConnectorStatus.syncing
    connector.last_sync_at = datetime.now(timezone.utc)
    await db.flush()

    try:
        if connector.type == "figma":
            chunks_created = await _sync_figma(connector, current_user.id, db)
            connector.status = ConnectorStatus.connected
            await db.flush()
            return {"message": f"Figma sync complete: {chunks_created} chunks indexed", "connectorId": str(connector_id)}

        if connector.type == "github":
            chunks_created = await _sync_github(connector, current_user.id, db)
            connector.status = ConnectorStatus.connected
            await db.flush()
            return {"message": f"GitHub sync complete: {chunks_created} chunks indexed", "connectorId": str(connector_id)}

        if connector.type == "google_drive":
            chunks_created = await _sync_google_drive(connector, current_user.id, db)
            connector.status = ConnectorStatus.connected
            await db.flush()
            return {"message": f"Google Drive sync complete: {chunks_created} chunks indexed", "connectorId": str(connector_id)}

        if connector.type == "web_crawler":
            chunks_created = await _sync_web_crawler(connector, current_user.id, db)
            connector.status = ConnectorStatus.connected
            connector.document_count = chunks_created
            await db.flush()
            return {"message": f"Web crawl complete: {chunks_created} pages indexed", "connectorId": str(connector_id)}

        # Generic / unimplemented connector types — mark connected without real sync
        connector.status = ConnectorStatus.connected
        await db.flush()
        return {"message": "Sync initiated", "connectorId": str(connector_id)}
    except Exception as exc:
        logger.exception("Connector sync failed: %s", exc)
        connector.status = ConnectorStatus.error
        await db.flush()
        raise HTTPException(status_code=500, detail=str(exc))


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
        file_type="figma",
        file_size=len("\n".join(chunks_text)),
        status="ready",
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
    Fetch text files from a GitHub repository and store as DocumentChunks for RAG.
    Requires a Personal Access Token and a repository URL in the connector config.
    """
    import base64
    import re
    import httpx

    cfg: Dict[str, Any] = connector.config or {}
    token: str = cfg.get("accessToken", "")
    repo_url: str = cfg.get("repoUrl", "")
    branch: str = cfg.get("branch", "") or "main"

    if not token:
        raise ValueError("GitHub Personal Access Token is required")
    if not repo_url:
        raise ValueError("GitHub repository URL is required")

    m = re.search(r"github\.com/([^/\s]+)/([^/\s?#]+)", repo_url)
    if not m:
        raise ValueError(f"Cannot extract owner/repo from URL: {repo_url}")
    owner = m.group(1)
    repo = m.group(2).rstrip(".git")

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    TEXT_EXTENSIONS = {
        ".md", ".txt", ".py", ".js", ".ts", ".jsx", ".tsx", ".json",
        ".yaml", ".yml", ".rst", ".html", ".css", ".java", ".go",
        ".rb", ".php", ".sh", ".sql", ".toml", ".ini", ".env.example",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # Verify token & get default branch if not specified
        repo_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
        )
        if repo_resp.status_code == 401:
            raise ValueError("Invalid GitHub token or insufficient permissions")
        if repo_resp.status_code == 404:
            raise ValueError(f"Repository not found: {owner}/{repo}")
        if repo_resp.status_code != 200:
            raise ValueError(f"GitHub API error {repo_resp.status_code}: {repo_resp.text[:200]}")

        repo_data = repo_resp.json()
        if not branch or branch == "main":
            branch = repo_data.get("default_branch", "main")

        # Get full file tree
        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
            headers=headers,
        )
        if tree_resp.status_code != 200:
            raise ValueError(f"Could not fetch repository tree: {tree_resp.text[:200]}")

        tree_data = tree_resp.json()
        all_files = [
            f for f in tree_data.get("tree", [])
            if f.get("type") == "blob"
            and any(f["path"].lower().endswith(ext) for ext in TEXT_EXTENSIONS)
            and f.get("size", 0) < 200_000  # skip files > 200 KB
        ]

        # Limit to first 100 files to avoid rate limits
        selected_files = all_files[:100]

        chunks_text: List[str] = []
        for file in selected_files:
            try:
                content_resp = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{file['path']}",
                    headers={**headers, "ref": branch},
                )
                if content_resp.status_code != 200:
                    continue
                content_data = content_resp.json()
                raw = base64.b64decode(content_data.get("content", "")).decode("utf-8", errors="replace")
                # Trim very long files
                if len(raw) > 4000:
                    raw = raw[:4000] + "\n... [truncated]"
                if raw.strip():
                    chunks_text.append(f"[{file['path']}]\n{raw.strip()}")
            except Exception:
                continue

    if not chunks_text:
        chunks_text = [f"GitHub repo '{owner}/{repo}' (branch: {branch}) — no readable text files found."]

    doc_name = f"[GitHub] {owner}/{repo}"

    # Remove previous sync documents for this connector
    existing = await db.execute(
        select(Document).where(Document.user_id == user_id, Document.name == doc_name)
    )
    for old_doc in existing.scalars().all():
        await db.delete(old_doc)
    await db.flush()

    doc = Document(
        user_id=user_id,
        name=doc_name,
        original_name=f"{repo}.github",
        file_path=f"github://{owner}/{repo}",
        file_type="github",
        file_size=sum(len(t) for t in chunks_text),
        status="ready",
        word_count=sum(len(t.split()) for t in chunks_text),
    )
    db.add(doc)
    await db.flush()

    for idx, text in enumerate(chunks_text):
        db.add(DocumentChunk(
            document_id=doc.id,
            content=text,
            chunk_index=idx,
            token_count=len(text.split()),
        ))

    await db.flush()
    return len(chunks_text)


async def _sync_google_drive(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Fetch documents from a Google Drive folder using an OAuth2 access token.
    Requires an access token and a folder ID (or 'root') in the connector config.
    """
    import httpx

    cfg: Dict[str, Any] = connector.config or {}
    access_token: str = cfg.get("accessToken", "")
    folder_id: str = cfg.get("folderId", "root")

    if not access_token:
        raise ValueError("Google OAuth access token is required")

    headers = {"Authorization": f"Bearer {access_token}"}

    # MIME types that can be exported as plain text
    EXPORT_TYPES: Dict[str, str] = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
    }
    # MIME types we can download directly
    DIRECT_TYPES = {"text/plain", "text/markdown", "application/json", "text/csv"}

    async with httpx.AsyncClient(timeout=30) as client:
        # Verify token & list files in the folder
        list_resp = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers=headers,
            params={
                "q": f"'{folder_id}' in parents and trashed=false",
                "fields": "files(id,name,mimeType,size)",
                "pageSize": "50",
            },
        )
        if list_resp.status_code == 401:
            raise ValueError("Invalid or expired Google access token. Please reconnect.")
        if list_resp.status_code != 200:
            raise ValueError(f"Google Drive API error {list_resp.status_code}: {list_resp.text[:200]}")

        files_data = list_resp.json().get("files", [])

        if not files_data:
            raise ValueError("No files found in the specified Google Drive folder")

        chunks_text: List[str] = []
        folder_name = folder_id

        for file in files_data:
            file_id = file["id"]
            file_name = file["name"]
            mime = file.get("mimeType", "")

            try:
                if mime in EXPORT_TYPES:
                    export_resp = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                        headers=headers,
                        params={"mimeType": EXPORT_TYPES[mime]},
                    )
                    if export_resp.status_code == 200:
                        content = export_resp.text[:5000]
                        if content.strip():
                            chunks_text.append(f"[{file_name}]\n{content.strip()}")
                elif mime in DIRECT_TYPES:
                    dl_resp = await client.get(
                        f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                        headers=headers,
                    )
                    if dl_resp.status_code == 200:
                        content = dl_resp.text[:5000]
                        if content.strip():
                            chunks_text.append(f"[{file_name}]\n{content.strip()}")
            except Exception:
                continue

    if not chunks_text:
        chunks_text = [f"Google Drive folder '{folder_id}' — no readable text documents found."]

    doc_name = f"[Google Drive] {folder_name}"

    # Remove previous sync documents
    existing = await db.execute(
        select(Document).where(Document.user_id == user_id, Document.name == doc_name)
    )
    for old_doc in existing.scalars().all():
        await db.delete(old_doc)
    await db.flush()

    doc = Document(
        user_id=user_id,
        name=doc_name,
        original_name=f"google_drive_{folder_id}.gdrive",
        file_path=f"gdrive://{folder_id}",
        file_type="google_drive",
        file_size=sum(len(t) for t in chunks_text),
        status="ready",
        word_count=sum(len(t.split()) for t in chunks_text),
    )
    db.add(doc)
    await db.flush()

    for idx, text in enumerate(chunks_text):
        db.add(DocumentChunk(
            document_id=doc.id,
            content=text,
            chunk_index=idx,
            token_count=len(text.split()),
        ))

    await db.flush()
    return len(chunks_text)


async def _sync_web_crawler(connector: "Connector", user_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Crawl a website starting from the configured URL, extract text from each page,
    and store it as DocumentChunks so it becomes searchable via RAG.
    Returns the number of pages indexed.
    """
    import httpx
    import re
    from urllib.parse import urljoin, urlparse

    cfg: Dict[str, Any] = connector.config or {}
    start_url: str = cfg.get("url", "")
    max_depth: int = min(int(cfg.get("depth", 2)), 3)  # cap at 3 to avoid runaway crawls
    max_pages: int = 30  # safety limit

    if not start_url:
        raise ValueError("Web crawler URL missing in connector config")

    base_domain = urlparse(start_url).netloc

    def _extract_text_from_html(html: str) -> str:
        """Strip tags and return readable text."""
        # Remove script/style blocks
        html = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
        # Remove all tags
        text = re.sub(r'<[^>]+>', ' ', html)
        # Collapse whitespace
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove null bytes
        text = text.replace('\x00', '').replace('\x0b', ' ').replace('\x0c', ' ')
        return text.strip()

    def _extract_links(html: str, current_url: str) -> List[str]:
        """Extract same-domain links from a page."""
        hrefs = re.findall(r'<a[^>]+href=["\']([^"\'#?][^"\']*)["\']', html, re.IGNORECASE)
        links = []
        for href in hrefs:
            full = urljoin(current_url, href)
            parsed = urlparse(full)
            if parsed.netloc == base_domain and parsed.scheme in ('http', 'https'):
                # Normalise: drop fragments and query strings for dedup
                clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip('/')
                links.append(clean)
        return links

    # BFS crawl
    visited: set = set()
    queue: List[tuple] = [(start_url.rstrip('/'), 0)]  # (url, depth)
    pages: List[Dict[str, str]] = []  # [{url, title, text}]

    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=True,
        headers={"User-Agent": "KnowledgeForge-Crawler/1.0"},
    ) as client:
        while queue and len(pages) < max_pages:
            url, depth = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type:
                    continue
                html = resp.text

                # Extract title
                title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
                title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else url

                text = _extract_text_from_html(html)
                if len(text) > 100:  # skip near-empty pages
                    pages.append({"url": url, "title": title, "text": text})

                # Enqueue links for next depth level
                if depth < max_depth:
                    for link in _extract_links(html, url):
                        if link not in visited:
                            queue.append((link, depth + 1))

            except Exception as exc:
                logger.warning("Crawler skipped %s: %s", url, exc)
                continue

    if not pages:
        pages = [{"url": start_url, "title": connector.name, "text": f"Crawled {start_url} but found no readable content."}]

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
    await db.delete(connector)
    await db.flush()


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
