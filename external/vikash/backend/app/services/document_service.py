"""
Document service — handles file upload, text extraction, and chunking.
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.knowledge import Document, DocumentChunk, DocumentStatus
from app.models.user import User

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".doc": "doc",
    ".txt": "txt",
    ".md": "md",
    ".csv": "csv",
    ".json": "json",
    ".html": "html",
    ".htm": "html",
}

CHUNK_SIZE_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 50


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)


def _chunk_text(text: str) -> List[Tuple[int, str]]:
    """
    Split text into overlapping chunks.
    Returns list of (chunk_index, chunk_text).
    """
    # Convert token targets to rough char counts
    chunk_size_chars = CHUNK_SIZE_TOKENS * 4
    overlap_chars = CHUNK_OVERLAP_TOKENS * 4

    chunks = []
    start = 0
    idx = 0

    while start < len(text):
        end = start + chunk_size_chars

        # Try to break at a sentence boundary
        if end < len(text):
            # Look for sentence end within last 20% of chunk
            boundary_search_start = start + int(chunk_size_chars * 0.8)
            for sep in [". ", ".\n", "! ", "? ", "\n\n"]:
                pos = text.rfind(sep, boundary_search_start, end)
                if pos != -1:
                    end = pos + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append((idx, chunk))
            idx += 1

        # Move forward with overlap
        start = end - overlap_chars
        if start >= len(text):
            break

    return chunks


def _extract_text_pdf(file_path: str) -> Tuple[str, int]:
    """Extract text from PDF using PyPDF2. Returns (text, page_count)."""
    try:
        import PyPDF2

        text_parts = []
        page_count = 0
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            page_count = len(reader.pages)
            for page in reader.pages:
                try:
                    text_parts.append(page.extract_text() or "")
                except Exception:
                    pass
        return "\n".join(text_parts), page_count
    except Exception as e:
        logger.warning(f"PDF extraction failed: {e}")
        return "", 0


def _extract_text_docx(file_path: str) -> Tuple[str, int]:
    """Extract text from DOCX using python-docx."""
    try:
        from docx import Document as DocxDoc

        doc = DocxDoc(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(paragraphs)
        # Estimate page count (~500 words per page)
        word_count = len(text.split())
        page_count = max(1, word_count // 500)
        return text, page_count
    except Exception as e:
        logger.warning(f"DOCX extraction failed: {e}")
        return "", 0


def _extract_text_plain(file_path: str) -> Tuple[str, int]:
    """Read plain text file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        word_count = len(text.split())
        page_count = max(1, word_count // 500)
        return text, page_count
    except Exception as e:
        logger.warning(f"Plain text extraction failed: {e}")
        return "", 0


def extract_text(file_path: str, file_ext: str) -> Tuple[str, int]:
    """Dispatch extraction based on file extension."""
    if file_ext == ".pdf":
        return _extract_text_pdf(file_path)
    elif file_ext in (".docx", ".doc"):
        return _extract_text_docx(file_path)
    else:
        return _extract_text_plain(file_path)


async def save_uploaded_file(
    file_content: bytes,
    original_filename: str,
    user_id: str,
) -> Tuple[str, str, str]:
    """
    Save raw file bytes to disk.
    Returns (saved_path, file_ext, file_type_label).
    """
    upload_dir = Path(settings.UPLOAD_DIR) / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(original_filename).suffix.lower()
    file_type = SUPPORTED_TYPES.get(ext, "unknown")

    unique_name = f"{uuid.uuid4()}{ext}"
    saved_path = upload_dir / unique_name

    with open(saved_path, "wb") as f:
        f.write(file_content)

    return str(saved_path), ext, file_type


async def process_document(
    document: Document,
    file_path: str,
    file_ext: str,
    db: AsyncSession,
) -> None:
    """
    Extract text from a document, create chunks, and mark it as indexed.
    This runs synchronously within the request for simplicity.
    """
    try:
        text, page_count = extract_text(file_path, file_ext)

        word_count = len(text.split()) if text else 0
        chunks = _chunk_text(text) if text else []

        # Create chunk records
        for chunk_idx, chunk_content in chunks:
            token_count = _estimate_tokens(chunk_content)
            chunk_record = DocumentChunk(
                document_id=document.id,
                content=chunk_content,
                chunk_index=chunk_idx,
                token_count=token_count,
            )
            db.add(chunk_record)

        # Update document metadata
        document.status = DocumentStatus.indexed
        document.page_count = page_count
        document.word_count = word_count
        document.updated_at = datetime.now(timezone.utc)

        await db.flush()
        logger.info(
            f"Document {document.id} indexed: {len(chunks)} chunks, "
            f"{word_count} words, {page_count} pages"
        )

    except Exception as e:
        logger.error(f"Document processing failed for {document.id}: {e}")
        document.status = DocumentStatus.failed
        document.updated_at = datetime.now(timezone.utc)
        await db.flush()


async def upload_documents(
    files: List,  # List of UploadFile objects
    user: User,
    collection_id: Optional[str],
    tags: Optional[str],
    db: AsyncSession,
) -> List[Document]:
    """Handle multiple file uploads."""
    from fastapi import HTTPException, status

    tag_list = []
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    documents = []
    max_size = settings.max_upload_size_bytes

    for upload_file in files:
        # Read file content
        content = await upload_file.read()

        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{upload_file.filename}' exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        original_name = upload_file.filename or "unknown"
        file_path, file_ext, file_type = await save_uploaded_file(
            content, original_name, str(user.id)
        )

        # Create DB record
        document = Document(
            user_id=user.id,
            collection_id=uuid.UUID(collection_id) if collection_id else None,
            name=original_name,
            original_name=original_name,
            file_path=file_path,
            file_type=file_type,
            file_size=len(content),
            status=DocumentStatus.processing,
            tags=tag_list,
        )
        db.add(document)
        await db.flush()

        # Process synchronously (extract text and create chunks)
        await process_document(document, file_path, file_ext, db)

        documents.append(document)

    return documents
