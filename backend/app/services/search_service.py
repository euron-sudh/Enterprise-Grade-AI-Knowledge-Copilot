"""
Search service — semantic (pgvector) search with keyword (ILIKE) fallback.
Semantic search uses Supabase's built-in pgvector extension and OpenAI embeddings.
"""
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import Document, DocumentChunk
from app.models.search import SearchLog, SavedSearch
from app.models.user import User

logger = logging.getLogger(__name__)

TRENDING_QUERIES = [
    {"query": "machine learning best practices", "count": 142, "trend": "up"},
    {"query": "quarterly financial report", "count": 98, "trend": "stable"},
    {"query": "product roadmap 2025", "count": 87, "trend": "up"},
    {"query": "onboarding documentation", "count": 76, "trend": "down"},
    {"query": "API integration guide", "count": 65, "trend": "stable"},
    {"query": "security compliance", "count": 54, "trend": "up"},
    {"query": "customer success metrics", "count": 43, "trend": "down"},
]


async def search_documents(
    query: str,
    db: AsyncSession,
    user: User,
    page: int = 1,
    page_size: int = 20,
    filters: Optional[Dict[str, Any]] = None,
    types: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Search document chunks.
    Tries semantic vector search (Supabase pgvector) first;
    falls back to PostgreSQL ILIKE keyword search when embeddings are unavailable.
    """
    start = time.time()

    if not query.strip():
        return {"items": [], "total": 0, "query": query, "took_ms": 0}

    # --- Semantic search (pgvector) ---
    vector_result = await _vector_search_documents(query, db, user, page, page_size, types)

    if vector_result is not None:
        took_ms = int((time.time() - start) * 1000)
        await _log_search(db, user, query, vector_result["total"], took_ms)
        return {**vector_result, "query": query, "took_ms": took_ms}

    # --- Fallback: keyword (ILIKE) search ---
    return await _keyword_search_documents(query, db, user, page, page_size, types, start)


async def _vector_search_documents(
    query: str,
    db: AsyncSession,
    user: User,
    page: int,
    page_size: int,
    types: Optional[List[str]],
) -> Optional[Dict[str, Any]]:
    """
    Semantic search via Supabase pgvector.
    Returns None when the OpenAI key is absent or on any error
    so the caller falls back to keyword search.
    """
    from app.services.embedding_service import generate_embedding

    embedding = await generate_embedding(query)
    if not embedding:
        return None  # No key → keyword search

    vec_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"
    threshold = 0.2
    offset = (page - 1) * page_size

    try:
        params: Dict[str, Any] = {
            "emb": vec_str,
            "user_id": str(user.id),
            "threshold": threshold,
        }

        # Total count
        count_result = await db.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE dc.embedding IS NOT NULL
                  AND d.user_id = :user_id
                  AND (1 - (dc.embedding <=> :emb::vector)) > :threshold
            """),
            params,
        )
        total = count_result.scalar() or 0

        # Paginated results
        rows_result = await db.execute(
            text("""
                SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
                       d.name AS doc_name, d.file_type, d.created_at AS doc_created_at,
                       (1 - (dc.embedding <=> :emb::vector)) AS similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE dc.embedding IS NOT NULL
                  AND d.user_id = :user_id
                  AND (1 - (dc.embedding <=> :emb::vector)) > :threshold
                ORDER BY dc.embedding <=> :emb::vector
                LIMIT :limit OFFSET :offset
            """),
            {**params, "limit": page_size, "offset": offset},
        )
        rows = rows_result.mappings().all()

        words = query.split()
        items = []
        for row in rows:
            # Apply optional file-type filter in Python (avoids complex array params)
            if types and row["file_type"] not in types:
                continue
            highlight = _make_highlight(row["content"], words)
            items.append({
                "id": uuid.uuid4(),
                "documentId": row["document_id"],
                "documentName": row["doc_name"],
                "documentType": row["file_type"],
                "content": row["content"][:500],
                "score": round(float(row["similarity"]), 3),
                "highlights": [highlight] if highlight else [],
                "url": None,
                "createdAt": row["doc_created_at"],
            })

        return {"items": items, "total": total}

    except Exception as e:
        logger.warning(f"Vector search failed (falling back to keyword search): {e}")
        return None


async def _keyword_search_documents(
    query: str,
    db: AsyncSession,
    user: User,
    page: int,
    page_size: int,
    types: Optional[List[str]],
    start: float,
) -> Dict[str, Any]:
    """Original PostgreSQL ILIKE keyword search — used as fallback."""
    words = [w.strip() for w in query.split() if len(w.strip()) >= 2]
    if not words:
        return {"items": [], "total": 0, "query": query, "took_ms": 0}

    search_term = f"%{words[0]}%"

    base_q = (
        select(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.user_id == user.id)
        .where(DocumentChunk.content.ilike(search_term))
    )

    if types:
        base_q = base_q.where(Document.file_type.in_(types))

    count_q = select(func.count()).select_from(base_q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    paginated_q = base_q.offset(offset).limit(page_size)
    result = await db.execute(paginated_q)
    rows = result.all()

    items = []
    for chunk, doc in rows:
        content = chunk.content
        highlight = _make_highlight(content, words)
        items.append({
            "id": uuid.uuid4(),
            "documentId": doc.id,
            "documentName": doc.name,
            "documentType": doc.file_type,
            "content": content[:500],
            "score": round(0.5 + (0.5 / (chunk.chunk_index + 1)), 3),
            "highlights": [highlight] if highlight else [],
            "url": None,
            "createdAt": doc.created_at,
        })

    took_ms = int((time.time() - start) * 1000)
    await _log_search(db, user, query, total, took_ms)
    return {"items": items, "total": total, "query": query, "took_ms": took_ms}


async def _log_search(db: AsyncSession, user: User, query: str, total: int, took_ms: int) -> None:
    """Persist a search log entry (non-fatal if it fails)."""
    try:
        log_entry = SearchLog(user_id=user.id, query=query, result_count=total, took_ms=took_ms)
        db.add(log_entry)
        await db.flush()
    except Exception as e:
        logger.warning(f"Failed to log search: {e}")


def _make_highlight(content: str, words: List[str]) -> str:
    """Extract a snippet around the first match with surrounding context."""
    content_lower = content.lower()
    for word in words:
        pos = content_lower.find(word.lower())
        if pos != -1:
            start = max(0, pos - 60)
            end = min(len(content), pos + 120)
            snippet = content[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(content):
                snippet = snippet + "..."
            return snippet
    return content[:150]


async def get_search_suggestions(
    q: str,
    db: AsyncSession,
    user: User,
    limit: int = 8,
) -> List[str]:
    """Return query suggestions based on recent search logs."""
    if not q.strip():
        return [t["query"] for t in TRENDING_QUERIES[:limit]]

    try:
        result = await db.execute(
            select(SearchLog.query)
            .where(SearchLog.user_id == user.id)
            .where(SearchLog.query.ilike(f"%{q}%"))
            .order_by(SearchLog.created_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
        suggestions = list(dict.fromkeys(rows))  # dedupe while preserving order

        # Supplement with trending if not enough
        if len(suggestions) < limit:
            for t in TRENDING_QUERIES:
                if q.lower() in t["query"].lower() and t["query"] not in suggestions:
                    suggestions.append(t["query"])
                if len(suggestions) >= limit:
                    break

        return suggestions[:limit]
    except Exception as e:
        logger.warning(f"Suggestions query failed: {e}")
        return []
