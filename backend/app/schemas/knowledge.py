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


# File types that represent connector sources (not raw file formats)
_CONNECTOR_TYPES = {
    "google_drive", "gmail", "github", "gitlab", "confluence", "notion",
    "slack", "jira", "salesforce", "hubspot", "zendesk", "intercom",
    "sharepoint", "onedrive", "dropbox", "web", "web_crawler",
}

_CONNECTOR_DISPLAY_NAMES = {
    "google_drive": "Google Drive",
    "gmail": "Gmail",
    "github": "GitHub",
    "gitlab": "GitLab",
    "confluence": "Confluence",
    "notion": "Notion",
    "slack": "Slack",
    "jira": "Jira",
    "salesforce": "Salesforce",
    "hubspot": "HubSpot",
    "zendesk": "Zendesk",
    "intercom": "Intercom",
    "sharepoint": "SharePoint",
    "onedrive": "OneDrive",
    "dropbox": "Dropbox",
    "web": "Web",
    "web_crawler": "Web Crawler",
}


class DocumentOut(BaseModel):
    id: UUID
    name: str
    type: str
    size: int
    status: str
    processingStatus: str  # alias of status for frontend compatibility
    source: str  # "Upload" or connector display name
    connectorType: Optional[str] = None
    collectionId: Optional[UUID] = None
    collectionName: Optional[str] = None
    tags: List[str] = []
    pageCount: Optional[int] = None
    wordCount: Optional[int] = None
    originalName: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, doc) -> "DocumentOut":
        ft = doc.file_type or ""
        is_connector = ft in _CONNECTOR_TYPES
        status_val = doc.status.value if hasattr(doc.status, "value") else doc.status
        return cls(
            id=doc.id,
            name=doc.name,
            type=ft,
            size=doc.file_size,
            status=status_val,
            processingStatus=status_val,
            source=_CONNECTOR_DISPLAY_NAMES.get(ft, "Upload") if is_connector else "Upload",
            connectorType=ft if is_connector else None,
            collectionId=doc.collection_id,
            collectionName=doc.collection.name if doc.collection else None,
            tags=doc.tags or [],
            pageCount=doc.page_count,
            wordCount=doc.word_count,
            originalName=doc.original_name,
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
