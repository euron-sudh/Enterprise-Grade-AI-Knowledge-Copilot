import json
import logging
import math
import secrets
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.conversation import Conversation, Message, MessageRole
from app.models.user import User
from app.schemas.chat import (
    BranchConversationRequest,
    ConversationOut,
    CreateConversationRequest,
    MessageFeedbackRequest,
    MessageOut,
    PaginatedResponse,
    SendMessageRequest,
    UpdateConversationRequest,
)
from app.services import ai_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Conversations ─────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=PaginatedResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    pinned: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Conversation).where(Conversation.user_id == current_user.id)

    if search:
        q = q.where(Conversation.title.ilike(f"%{search}%"))
    if pinned is not None:
        q = q.where(Conversation.is_pinned == pinned)

    q = q.order_by(Conversation.updated_at.desc())

    # Count
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    offset = (page - 1) * pageSize
    result = await db.execute(q.offset(offset).limit(pageSize))
    conversations = result.scalars().all()

    items = [ConversationOut.from_orm(c) for c in conversations]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total > 0 else 1,
    )


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = Conversation(
        user_id=current_user.id,
        title=body.title or "New Conversation",
        model=body.model or "gpt-4o-mini",
    )
    db.add(conv)
    await db.flush()
    return ConversationOut.from_orm(conv)


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _get_user_conversation(conversation_id, current_user.id, db)
    return ConversationOut.from_orm(conv)


@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: uuid.UUID,
    body: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _get_user_conversation(conversation_id, current_user.id, db)

    if body.title is not None:
        conv.title = body.title
    if body.isPinned is not None:
        conv.is_pinned = body.isPinned
    if body.tags is not None:
        conv.tags = body.tags

    conv.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return ConversationOut.from_orm(conv)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _get_user_conversation(conversation_id, current_user.id, db)
    await db.delete(conv)
    await db.flush()


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/conversations/{conversation_id}/messages", response_model=PaginatedResponse)
async def list_messages(
    conversation_id: uuid.UUID,
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_conversation(conversation_id, current_user.id, db)

    q = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * pageSize
    result = await db.execute(q.offset(offset).limit(pageSize))
    messages = result.scalars().all()

    items = [MessageOut.from_orm(m) for m in messages]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=math.ceil(total / pageSize) if total > 0 else 1,
    )


@router.post("/conversations/{conversation_id}/messages/stream")
async def stream_messages(
    conversation_id: uuid.UUID,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _get_user_conversation(conversation_id, current_user.id, db)

    # Save the user message
    user_msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.user,
        content=body.content,
    )
    db.add(user_msg)

    # Update conversation
    conv.message_count = (conv.message_count or 0) + 1
    conv.last_message = body.content[:200]
    conv.last_message_at = datetime.now(timezone.utc)
    conv.updated_at = datetime.now(timezone.utc)

    # Auto-title if still default
    if conv.title == "New Conversation":
        words = body.content.split()
        conv.title = " ".join(words[:8]) + ("..." if len(words) > 8 else "")

    await db.flush()

    # Fetch last 20 messages using DESC + reverse — leverages the created_at index
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.id != user_msg.id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    history = list(reversed(history_result.scalars().all()))
    history.append(user_msg)

    model = body.model or conv.model or "claude-sonnet-4-6"

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for chunk in ai_service.stream_chat_response(
                conversation_id=conversation_id,
                messages=history,
                model=model,
                db=db,
                user_message_content=body.content,
                system_prompt=body.systemPrompt,
                images=body.images,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            logger.error(f"SSE error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            try:
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to commit after stream: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Branch & Share ─────────────────────────────────────────────────────────────

@router.post("/conversations/{conversation_id}/branch", response_model=ConversationOut)
async def branch_conversation(
    conversation_id: uuid.UUID,
    body: BranchConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    original = await _get_user_conversation(conversation_id, current_user.id, db)

    # Get messages up to the branch point
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.id == body.fromMessageId)
    )
    branch_msg = result.scalar_one_or_none()
    if not branch_msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Get all messages up to and including branch point
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.created_at <= branch_msg.created_at)
        .order_by(Message.created_at.asc())
    )
    messages_to_copy = result.scalars().all()

    # Create new conversation
    new_conv = Conversation(
        user_id=current_user.id,
        title=f"{original.title} (branch)",
        model=original.model,
        tags=original.tags or [],
    )
    db.add(new_conv)
    await db.flush()

    # Copy messages
    for msg in messages_to_copy:
        new_msg = Message(
            conversation_id=new_conv.id,
            role=msg.role,
            content=msg.content,
            model=msg.model,
            sources=msg.sources,
            token_count=msg.token_count,
            processing_time_ms=msg.processing_time_ms,
        )
        db.add(new_msg)

    new_conv.message_count = len(messages_to_copy)
    if messages_to_copy:
        new_conv.last_message = messages_to_copy[-1].content[:200]
        new_conv.last_message_at = messages_to_copy[-1].created_at

    await db.flush()
    return ConversationOut.from_orm(new_conv)


@router.post("/conversations/{conversation_id}/share")
async def share_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await _get_user_conversation(conversation_id, current_user.id, db)

    if not conv.is_shared:
        conv.is_shared = True
        conv.share_token = secrets.token_urlsafe(16)
        conv.updated_at = datetime.now(timezone.utc)
        await db.flush()

    share_url = f"http://localhost:3001/shared/{conv.share_token}"
    return {"shareUrl": share_url}


# ── Message Feedback ──────────────────────────────────────────────────────────

@router.post("/messages/{message_id}/feedback", status_code=status.HTTP_204_NO_CONTENT)
async def message_feedback(
    message_id: uuid.UUID,
    body: MessageFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Find message and verify ownership via conversation
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify the conversation belongs to the user
    await _get_user_conversation(msg.conversation_id, current_user.id, db)

    msg.feedback_rating = body.rating
    msg.feedback_comment = body.comment
    await db.flush()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_user_conversation(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conv
