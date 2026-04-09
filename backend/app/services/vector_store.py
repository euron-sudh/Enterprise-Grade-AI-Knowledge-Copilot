import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class PineconeVectorStore:
    def __init__(self) -> None:
        self._enabled = bool(
            settings.PINECONE_API_KEY
            and settings.PINECONE_INDEX_NAME
            and settings.PINECONE_EMBEDDING_MODEL
            and settings.OPENAI_API_KEY
        )
        self._pc = None
        self._index = None
        self._openai = None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _lazy_init(self) -> None:
        if not self._enabled:
            return
        if self._index is not None and self._openai is not None:
            return

        try:
            from pinecone import Pinecone, ServerlessSpec
            from openai import OpenAI

            self._pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            existing = {idx["name"] for idx in self._pc.list_indexes()}
            if settings.PINECONE_INDEX_NAME not in existing:
                self._pc.create_index(
                    name=settings.PINECONE_INDEX_NAME,
                    dimension=settings.PINECONE_EMBEDDING_DIMENSION,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud=settings.PINECONE_CLOUD,
                        region=settings.PINECONE_REGION,
                    ),
                )
            self._index = self._pc.Index(settings.PINECONE_INDEX_NAME)
            self._openai = OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as exc:
            logger.warning("Pinecone init failed, falling back to DB search: %s", exc)
            self._enabled = False

    def _embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if self._openai is None:
            return []
        response = self._openai.embeddings.create(
            model=settings.PINECONE_EMBEDDING_MODEL,
            input=texts,
        )
        return [row.embedding for row in response.data]

    def _upsert_sync(self, namespace: str, records: List[Dict[str, Any]]) -> None:
        self._lazy_init()
        if not self._enabled or self._index is None:
            return

        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            texts = [r["text"] for r in batch]
            vectors = self._embed(texts)
            if not vectors:
                return
            upserts = []
            for rec, emb in zip(batch, vectors):
                upserts.append(
                    {
                        "id": rec["id"],
                        "values": emb,
                        "metadata": rec["metadata"],
                    }
                )
            self._index.upsert(vectors=upserts, namespace=namespace)

    async def upsert_chunks(self, user_id: uuid.UUID, records: List[Dict[str, Any]]) -> None:
        if not self._enabled or not records:
            return
        await asyncio.to_thread(self._upsert_sync, str(user_id), records)

    def _query_sync(
        self,
        namespace: str,
        query_text: str,
        top_k: int,
        types: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        self._lazy_init()
        if not self._enabled or self._index is None:
            return []

        query_vecs = self._embed([query_text])
        if not query_vecs:
            return []

        flt: Dict[str, Any] = {}
        if types:
            flt["document_type"] = {"$in": types}

        result = self._index.query(
            namespace=namespace,
            vector=query_vecs[0],
            top_k=top_k,
            include_metadata=True,
            filter=flt if flt else None,
        )

        matches: List[Dict[str, Any]] = []
        for m in result.get("matches", []):
            metadata = m.get("metadata") or {}
            matches.append(
                {
                    "id": m.get("id"),
                    "score": float(m.get("score") or 0.0),
                    "metadata": metadata,
                }
            )
        return matches

    async def query(
        self,
        user_id: uuid.UUID,
        query_text: str,
        top_k: int,
        types: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        if not self._enabled:
            return []
        try:
            return await asyncio.to_thread(
                self._query_sync,
                str(user_id),
                query_text,
                top_k,
                types,
            )
        except Exception as exc:
            logger.warning("Pinecone query failed, falling back to DB search: %s", exc)
            return []


    def _delete_sync(self, namespace: str, ids: List[str]) -> None:
        self._lazy_init()
        if not self._enabled or self._index is None:
            return
        self._index.delete(ids=ids, namespace=namespace)

    async def delete_chunks(self, user_id: uuid.UUID, chunk_ids: List[str]) -> None:
        """Remove specific chunk vectors from Pinecone (e.g. when a document is deleted)."""
        if not self._enabled or not chunk_ids:
            return
        await asyncio.to_thread(self._delete_sync, str(user_id), chunk_ids)


_vector_store = PineconeVectorStore()


def get_vector_store() -> PineconeVectorStore:
    return _vector_store


# ── Convenience helpers used by Celery tasks ──────────────────────────────────

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using OpenAI (same model as Pinecone ingestion)."""
    if not texts:
        return []
    store = get_vector_store()
    store._lazy_init()
    if store._openai is None:
        # No OpenAI key — return empty (pgvector fallback handles retrieval)
        return []
    try:
        return await asyncio.to_thread(store._embed, texts)
    except Exception as exc:
        logger.warning("embed_texts failed: %s", exc)
        return []


async def upsert_to_pinecone(chunks) -> None:
    """Upsert a list of DocumentChunk ORM objects to Pinecone."""
    store = get_vector_store()
    if not store.enabled or not chunks:
        return
    records = [
        {
            "id": str(chunk.id),
            "text": chunk.content,
            "metadata": {
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
                **(chunk.metadata or {}),
            },
        }
        for chunk in chunks
    ]
    # Group by user/org namespace — use document's user_id from first chunk
    namespace = str(chunks[0].document_id)  # per-doc namespace as fallback
    await asyncio.to_thread(store._upsert_sync, namespace, records)
    logger.info(f"Upserted {len(records)} chunks to Pinecone (namespace={namespace})")
