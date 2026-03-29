import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.search import SavedSearch
from app.models.user import User
from app.schemas.search import (
    CreateSavedSearchRequest,
    SavedSearchOut,
    SearchRequest,
    SearchResponse,
    TrendingSearch,
)
from app.services import search_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = body.page or 1
    page_size = body.pageSize or 20
    result = await search_service.search_documents(
        query=body.query,
        db=db,
        user=current_user,
        page=page,
        page_size=page_size,
        filters=body.filters,
        types=body.types,
    )

    results = []
    for item in result["items"]:
        created = item["createdAt"]
        created_str = created.isoformat() if hasattr(created, "isoformat") else str(created)
        results.append({
            "id": str(item["id"]),
            "type": "document",
            "title": item["documentName"],
            "excerpt": item["content"][:200],
            "url": item.get("url"),
            "documentType": item["documentType"],
            "connectorType": None,
            "collectionName": None,
            "relevanceScore": item["score"],
            "highlights": item["highlights"],
            "metadata": {},
            "createdAt": created_str,
            "updatedAt": created_str,
        })

    return SearchResponse(
        query=result["query"],
        results=results,
        totalCount=result["total"],
        page=page,
        pageSize=page_size,
        processingTimeMs=result["took_ms"],
    )


@router.get("/search/suggestions")
async def search_suggestions(
    q: str = Query("", alias="q"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    suggestions = await search_service.get_search_suggestions(q, db, current_user)
    return suggestions


@router.post("/search/saved", response_model=SavedSearchOut, status_code=status.HTTP_201_CREATED)
async def create_saved_search(
    body: CreateSavedSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ss = SavedSearch(
        user_id=current_user.id,
        name=body.name,
        query=body.query,
        filters=body.filters or {},
    )
    db.add(ss)
    await db.flush()
    return SavedSearchOut.from_orm(ss)


@router.get("/search/saved")
async def list_saved_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    saved = result.scalars().all()
    return [SavedSearchOut.from_orm(s) for s in saved]


@router.delete("/search/saved/{saved_search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_search(
    saved_search_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == saved_search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    ss = result.scalar_one_or_none()
    if not ss:
        raise HTTPException(status_code=404, detail="Saved search not found")
    await db.delete(ss)
    await db.flush()


@router.get("/search/trending")
async def trending_searches(
    current_user: User = Depends(get_current_user),
):
    return [TrendingSearch(**t) for t in search_service.TRENDING_QUERIES]
