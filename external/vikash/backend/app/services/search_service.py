"""
Search service — full-text search over document chunks using PostgreSQL.
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
    Search document chunks using PostgreSQL ILIKE.
    Returns search results with highlights.
    """
    start = time.time()

    if not query.strip():
        return {"items": [], "total": 0, "query": query, "took_ms": 0}

    # Build base query
    words = [w.strip() for w in query.split() if len(w.strip()) >= 2]
    if not words:
        return {"items": [], "total": 0, "query": query, "took_ms": 0}

    # Use first word as primary search term
    search_term = f"%{words[0]}%"

    base_q = (
        select(DocumentChunk, Document)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.user_id == user.id)
        .where(DocumentChunk.content.ilike(search_term))
    )

    # Apply type filter
    if types:
        base_q = base_q.where(Document.file_type.in_(types))

    # Count total
    count_q = select(func.count()).select_from(base_q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    paginated_q = base_q.offset(offset).limit(page_size)
    result = await db.execute(paginated_q)
    rows = result.all()

    items = []
    for chunk, doc in rows:
        # Create simple highlight
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

    # Log search
    try:
        log_entry = SearchLog(
            user_id=user.id,
            query=query,
            result_count=total,
            took_ms=took_ms,
        )
        db.add(log_entry)
        await db.flush()
    except Exception as e:
        logger.warning(f"Failed to log search: {e}")

    return {
        "items": items,
        "total": total,
        "query": query,
        "took_ms": took_ms,
    }


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
