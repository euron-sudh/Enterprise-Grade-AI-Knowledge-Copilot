from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class CollectionOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    color: str
    documentCount: int
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, col) -> "CollectionOut":
        return cls(
            id=col.id,
            name=col.name,
            description=col.description,
            color=col.color,
            documentCount=len(col.documents) if col.documents else 0,
            createdAt=col.created_at,
        )


class CreateCollectionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"


class DocumentOut(BaseModel):
    id: UUID
    name: str
    type: str
    size: int
    status: str
    collectionId: Optional[UUID] = None
    tags: List[str] = []
    pageCount: Optional[int] = None
    wordCount: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, doc) -> "DocumentOut":
        return cls(
            id=doc.id,
            name=doc.name,
            type=doc.file_type,
            size=doc.file_size,
            status=doc.status.value if hasattr(doc.status, "value") else doc.status,
            collectionId=doc.collection_id,
            tags=doc.tags or [],
            pageCount=doc.page_count,
            wordCount=doc.word_count,
            createdAt=doc.created_at,
            updatedAt=doc.updated_at,
        )


class ChunkOut(BaseModel):
    id: UUID
    documentId: UUID
    content: str
    chunkIndex: int
    tokenCount: Optional[int] = None
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, chunk) -> "ChunkOut":
        return cls(
            id=chunk.id,
            documentId=chunk.document_id,
            content=chunk.content,
            chunkIndex=chunk.chunk_index,
            tokenCount=chunk.token_count,
            createdAt=chunk.created_at,
        )


class ConnectorOut(BaseModel):
    id: UUID
    type: str
    name: str
    status: str
    lastSyncAt: Optional[datetime] = None
    documentCount: int
    config: Any

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, connector) -> "ConnectorOut":
        return cls(
            id=connector.id,
            type=connector.type,
            name=connector.name,
            status=connector.status.value if hasattr(connector.status, "value") else connector.status,
            lastSyncAt=connector.last_sync_at,
            documentCount=connector.document_count,
            config=connector.config or {},
        )


class CreateConnectorRequest(BaseModel):
    type: str
    name: str
    config: Any = {}


class KnowledgeStats(BaseModel):
    totalDocuments: int
    totalChunks: int
    storageUsedBytes: int
    totalCollections: int
    totalConnectors: int
    lastIndexedAt: Optional[datetime] = None
