import uuid
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import AsyncSessionLocal
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def _get_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: AsyncSession,
    required: bool = True,
) -> Optional[User]:
    if credentials is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise JWTError("Missing subject")
        try:
            lookup_user_id = uuid.UUID(user_id)
        except (TypeError, ValueError):
            lookup_user_id = user_id
    except JWTError:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    result = await db.execute(select(User).where(User.id == lookup_user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        return None

    return user


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Allow JWT passed as ?token= query param (for <video src> streaming URLs)
    if credentials is None:
        token_param = request.query_params.get("token")
        if token_param:
            from fastapi.security import HTTPAuthorizationCredentials as Creds
            credentials = Creds(scheme="Bearer", credentials=token_param)
    user = await _get_user_from_token(credentials, db, required=True)
    return user  # type: ignore[return-value]


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    return await _get_user_from_token(credentials, db, required=False)


# ── Plan enforcement ──────────────────────────────────────────────────────────

PLAN_QUERY_LIMITS: dict[str, int] = {
    "free": 100,
    "starter": 5_000,
    "professional": 50_000,
    "enterprise": -1,  # unlimited
}

PLAN_STORAGE_LIMITS_GB: dict[str, float] = {
    "free": 0.05,
    "starter": 5.0,
    "professional": 100.0,
    "enterprise": -1.0,
}


async def check_query_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that enforces the user's monthly query quota before a chat message."""
    from sqlalchemy import func, text
    from app.models.conversation import Message

    plan = current_user.subscription_plan or "free"
    limit = PLAN_QUERY_LIMITS.get(plan, 100)
    if limit == -1:
        return current_user  # unlimited

    # Count messages sent by this user in the current calendar month
    result = await db.execute(
        select(func.count(Message.id))
        .join(Message.conversation)
        .where(
            Message.role == "user",
            text("DATE_TRUNC('month', messages.created_at) = DATE_TRUNC('month', NOW())"),
        )
        .where(__import__("app.models.conversation", fromlist=["Conversation"]).Conversation.user_id == current_user.id)
    )
    queries_used = result.scalar() or 0

    if queries_used >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Monthly query limit reached ({queries_used}/{limit}). "
                "Upgrade your plan at /admin/billing to continue."
            ),
        )
    return current_user


async def check_storage_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that enforces the user's storage quota before a document upload."""
    from sqlalchemy import func
    from app.models.knowledge import Document

    plan = current_user.subscription_plan or "free"
    limit_gb = PLAN_STORAGE_LIMITS_GB.get(plan, 0.05)
    if limit_gb == -1.0:
        return current_user  # unlimited

    result = await db.execute(
        select(func.coalesce(func.sum(Document.file_size), 0))
        .where(Document.user_id == current_user.id)
    )
    storage_bytes = result.scalar() or 0
    storage_gb = storage_bytes / (1024 ** 3)

    if storage_gb >= limit_gb:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Storage limit reached ({storage_gb:.2f}GB / {limit_gb}GB). "
                "Upgrade your plan at /admin/billing to continue."
            ),
        )
    return current_user
