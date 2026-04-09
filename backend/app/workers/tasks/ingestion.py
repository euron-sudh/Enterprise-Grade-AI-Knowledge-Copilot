"""Celery tasks for document ingestion pipeline."""
import logging
from typing import Optional

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.workers.tasks.ingestion.ingest_document", max_retries=3)
def ingest_document(self, document_id: str, user_id: str, file_path: str, file_type: str):
    """
    Process a newly uploaded document:
      1. Parse content (PDF / DOCX / XLSX / PPTX / TXT / HTML / image OCR)
      2. Semantically chunk the content
      3. Generate embeddings
      4. Store chunks in document_chunks (pgvector + full-text GIN)
      5. Push WebSocket notification on completion
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models.knowledge import Document, DocumentStatus, DocumentChunk
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one_or_none()
            if not doc:
                logger.warning(f"Document {document_id} not found, skipping ingestion")
                return

            try:
                doc.status = DocumentStatus.processing
                await db.flush()

                # Import inline to avoid circular deps at module load time
                from app.services.document_service import process_document_content
                await process_document_content(doc, file_path, file_type, db)

                doc.status = DocumentStatus.ready
                await db.flush()
                logger.info(f"Document {document_id} ingested successfully")

            except Exception as exc:
                doc.status = DocumentStatus.failed
                await db.flush()
                logger.error(f"Ingestion failed for document {document_id}: {exc}")
                raise self.retry(exc=exc, countdown=60)

    asyncio.run(_run())


@celery_app.task(bind=True, name="app.workers.tasks.ingestion.ingest_url", max_retries=3)
def ingest_url(self, url: str, user_id: str, collection_id: Optional[str] = None):
    """Crawl a URL and ingest the extracted content into the knowledge base."""
    import asyncio
    from app.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as db:
            try:
                from app.services.document_service import ingest_url_content
                await ingest_url_content(url, user_id, collection_id, db)
            except Exception as exc:
                logger.error(f"URL ingestion failed for {url}: {exc}")
                raise self.retry(exc=exc, countdown=120)

    asyncio.run(_run())
