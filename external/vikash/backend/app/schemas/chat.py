from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class ConversationOut(BaseModel):
    id: UUID
    title: str
    userId: UUID
    model: str
    isPinned: bool
    isShared: bool
    shareUrl: Optional[str] = None
    messageCount: int
    lastMessage: Optional[str] = None
    lastMessageAt: Optional[datetime] = None
    tags: List[str] = []
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, conv) -> "ConversationOut":
        share_url = None
        if conv.is_shared and conv.share_token:
            share_url = f"http://localhost:3000/shared/{conv.share_token}"
        return cls(
            id=conv.id,
            title=conv.title,
            userId=conv.user_id,
            model=conv.model,
            isPinned=conv.is_pinned,
            isShared=conv.is_shared,
            shareUrl=share_url,
            messageCount=conv.message_count,
            lastMessage=conv.last_message,
            lastMessageAt=conv.last_message_at,
            tags=conv.tags or [],
            createdAt=conv.created_at,
            updatedAt=conv.updated_at,
        )


class MessageOut(BaseModel):
    id: UUID
    conversationId: UUID
    role: str
    content: str
    model: Optional[str] = None
    sources: List[Any] = []
    feedback: Optional[dict] = None
    tokenCount: Optional[int] = None
    processingTimeMs: Optional[int] = None
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, msg) -> "MessageOut":
        feedback = None
        if msg.feedback_rating:
            feedback = {
                "rating": msg.feedback_rating,
                "comment": msg.feedback_comment,
            }
        return cls(
            id=msg.id,
            conversationId=msg.conversation_id,
            role=msg.role.value if hasattr(msg.role, "value") else msg.role,
            content=msg.content,
            model=msg.model,
            sources=msg.sources or [],
            feedback=feedback,
            tokenCount=msg.token_count,
            processingTimeMs=msg.processing_time_ms,
            createdAt=msg.created_at,
        )


class SourceCitation(BaseModel):
    id: UUID
    documentId: UUID
    documentName: str
    documentType: str
    pageNumber: Optional[int] = None
    chunkText: str
    relevanceScore: float
    url: Optional[str] = None
    connectorType: Optional[str] = None


class CreateConversationRequest(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = "gpt-4o-mini"


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    isPinned: Optional[bool] = None
    tags: Optional[List[str]] = None


class SendMessageRequest(BaseModel):
    content: str
    model: Optional[str] = None
    attachmentIds: Optional[List[UUID]] = None
    systemPrompt: Optional[str] = None
    images: Optional[List[str]] = None  # base64 data URIs for vision


class BranchConversationRequest(BaseModel):
    fromMessageId: UUID


class MessageFeedbackRequest(BaseModel):
    rating: str  # "up" | "down"
    comment: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    pageSize: int
    totalPages: int
