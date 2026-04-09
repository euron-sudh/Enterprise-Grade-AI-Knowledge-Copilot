"""Celery tasks for video transcription and AI analysis."""
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.tasks.video_processing.process_video",
    max_retries=2,
    soft_time_limit=540,  # 9 min soft limit for long videos
)
def process_video(self, video_id: str, file_path: str):
    """
    Full video processing pipeline:
      1. Transcribe via Gemini 2.0 Flash (multimodal) or Whisper (audio-only fallback)
      2. Generate AI chapter markers
      3. Chunk transcript and index into document_chunks for RAG
      4. Push WebSocket notification when complete
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models.knowledge import Document, DocumentStatus
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Document).where(Document.id == video_id))
            doc = result.scalar_one_or_none()
            if not doc:
                logger.warning(f"Video document {video_id} not found")
                return

            try:
                doc.status = DocumentStatus.processing
                await db.flush()

                from app.services.document_service import process_video_content
                await process_video_content(doc, file_path, db)

                doc.status = DocumentStatus.ready
                await db.flush()
                logger.info(f"Video {video_id} processed successfully")

            except Exception as exc:
                doc.status = DocumentStatus.failed
                await db.flush()
                logger.error(f"Video processing failed for {video_id}: {exc}")
                raise self.retry(exc=exc, countdown=120)

    asyncio.run(_run())
