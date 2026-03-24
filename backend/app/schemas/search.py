from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class FacetValue(BaseModel):
    value: str
    label: str
    count: int
    selected: bool = False


class SearchFacet(BaseModel):
    field: str
    label: str
    values: List[FacetValue] = []


class SearchResult(BaseModel):
    id: str
    type: str = "document"
    title: str
    excerpt: str
    url: Optional[str] = None
    documentType: Optional[str] = None
    connectorType: Optional[str] = None
    collectionName: Optional[str] = None
    relevanceScore: float
    highlights: List[str] = []
    metadata: Dict[str, Any] = {}
    createdAt: str
    updatedAt: str


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    totalCount: int
    page: int = 1
    pageSize: int = 20
    facets: List[SearchFacet] = []
    suggestions: List[str] = []
    processingTimeMs: int


class SearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    page: Optional[int] = 1
    pageSize: Optional[int] = 20
    types: Optional[List[str]] = None


class SavedSearchOut(BaseModel):
    id: UUID
    name: str
    query: str
    filters: Any
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, ss) -> "SavedSearchOut":
        return cls(
            id=ss.id,
            name=ss.name,
            query=ss.query,
            filters=ss.filters or {},
            createdAt=ss.created_at,
        )


class CreateSavedSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    name: str


class TrendingSearch(BaseModel):
    query: str
    count: int
    trend: str  # "up" | "down" | "stable"
