"""Celery tasks for embedding generation and vector store sync."""
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.workers.tasks.embedding.regenerate_embeddings", max_retries=2)
def regenerate_embeddings(self, document_id: str):
    """Re-generate embeddings for all chunks of a document (e.g. after model upgrade)."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models.knowledge import DocumentChunk
    from sqlalchemy import select

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(DocumentChunk).where(DocumentChunk.document_id == document_id)
            )
            chunks = result.scalars().all()
            if not chunks:
                return

            try:
                from app.services.vector_store import embed_texts
                texts = [c.content for c in chunks]
                embeddings = await embed_texts(texts)
                for chunk, emb in zip(chunks, embeddings):
                    chunk.embedding = emb
                await db.flush()
                logger.info(f"Re-embedded {len(chunks)} chunks for document {document_id}")
            except Exception as exc:
                logger.error(f"Embedding regeneration failed: {exc}")
                raise self.retry(exc=exc, countdown=120)

    asyncio.run(_run())


@celery_app.task(name="app.workers.tasks.embedding.sync_to_pinecone")
def sync_to_pinecone(document_id: str):
    """Upsert all chunks for a document into Pinecone (run after local embedding is done)."""
    import asyncio
    from app.database import AsyncSessionLocal
    from app.models.knowledge import DocumentChunk
    from sqlalchemy import select

    async def _run():
        from app.services.vector_store import upsert_to_pinecone
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(DocumentChunk).where(DocumentChunk.document_id == document_id)
            )
            chunks = result.scalars().all()
            if chunks:
                await upsert_to_pinecone(chunks)
                logger.info(f"Synced {len(chunks)} chunks to Pinecone for document {document_id}")

    asyncio.run(_run())
