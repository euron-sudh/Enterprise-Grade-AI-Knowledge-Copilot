import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User, UserRole
from app.schemas.auth import AuthResponse, UserOut

logger = logging.getLogger(__name__)


def _role_to_frontend(role: UserRole) -> str:
    """Map internal role to frontend-expected role."""
    mapping = {
        UserRole.super_admin: "Admin",
        UserRole.admin: "Admin",
        UserRole.team_admin: "Admin",
        UserRole.member: "Member",
        UserRole.viewer: "Viewer",
        UserRole.guest: "Viewer",
    }
    return mapping.get(role, "Member")


async def build_auth_response(user: User, db: AsyncSession) -> AuthResponse:
    """Create access token, refresh token, and return full AuthResponse."""
    # Generate tokens
    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value,
    )
    raw_refresh_token = generate_refresh_token()

    # Store refresh token in DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh = RefreshToken(
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=expires_at,
    )
    db.add(db_refresh)
    await db.flush()

    user_out = UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=_role_to_frontend(user.role),
        avatarUrl=user.avatar_url,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
    )
    return AuthResponse(
        accessToken=access_token,
        refreshToken=raw_refresh_token,
        user=user_out,
    )


async def register_user(name: str, email: str, password: str, db: AsyncSession) -> AuthResponse:
    """Register a new user and return auth response."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.member,
    )
    db.add(user)
    await db.flush()

    return await build_auth_response(user, db)


async def login_user(email: str, password: str, db: AsyncSession) -> AuthResponse:
    """Authenticate user credentials and return auth response."""
    from fastapi import HTTPException, status

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return await build_auth_response(user, db)


async def refresh_tokens(refresh_token_str: str, db: AsyncSession) -> AuthResponse:
    """Validate refresh token, rotate it, and return new auth response."""
    from fastapi import HTTPException, status

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    )
    db_token = result.scalar_one_or_none()

    if not db_token or db_token.revoked or db_token.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Revoke old token (rotation)
    db_token.revoked = True
    await db.flush()

    # Load user
    result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return await build_auth_response(user, db)


async def logout_user(refresh_token_str: str, db: AsyncSession) -> None:
    """Revoke a refresh token."""
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token == refresh_token_str)
    )
    db_token = result.scalar_one_or_none()
    if db_token:
        db_token.revoked = True
        await db.flush()
