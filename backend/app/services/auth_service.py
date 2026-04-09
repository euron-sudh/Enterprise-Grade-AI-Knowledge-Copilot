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


async def login_user(email: str, password: str, db: AsyncSession):
    """Authenticate user credentials.

    Returns AuthResponse immediately when MFA is disabled.
    Returns MfaChallengeResponse (HTTP 202) when MFA is enabled — the caller
    must complete the challenge via POST /auth/mfa/challenge.
    """
    from fastapi import HTTPException, status
    import secrets
    from app.core.security import get_redis

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

    # MFA gate — issue a short-lived challenge token instead of full tokens
    if user.mfa_enabled and user.mfa_secret:
        challenge_token = secrets.token_urlsafe(32)
        redis = await get_redis()
        if redis:
            # Store user_id keyed by challenge token; expires in 5 minutes
            await redis.setex(f"mfa_challenge:{challenge_token}", 300, str(user.id))
        else:
            # Fallback: store in DB session cache via a simple in-memory dict
            # (acceptable for single-instance dev; Redis strongly recommended)
            _mfa_challenges[challenge_token] = (str(user.id), datetime.now(timezone.utc))
        from app.schemas.auth import MfaChallengeResponse
        return MfaChallengeResponse(challengeToken=challenge_token)

    return await build_auth_response(user, db)


# In-memory MFA challenge store (dev fallback when Redis is unavailable)
_mfa_challenges: dict[str, tuple[str, datetime]] = {}


async def verify_mfa_challenge(challenge_token: str, code: str, db: AsyncSession) -> AuthResponse:
    """Validate a TOTP code (or backup code) against an MFA challenge token."""
    import pyotp
    from fastapi import HTTPException, status
    from app.core.security import get_redis

    user_id_str: str | None = None

    redis = await get_redis()
    if redis:
        user_id_str = await redis.get(f"mfa_challenge:{challenge_token}")
        if user_id_str:
            if isinstance(user_id_str, bytes):
                user_id_str = user_id_str.decode()
            await redis.delete(f"mfa_challenge:{challenge_token}")
    else:
        entry = _mfa_challenges.pop(challenge_token, None)
        if entry:
            user_id_str, issued_at = entry
            # Expire after 5 minutes
            if (datetime.now(timezone.utc) - issued_at).total_seconds() > 300:
                user_id_str = None

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA challenge expired or invalid. Please log in again.",
        )

    import uuid as _uuid
    result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id_str)))
    user = result.scalar_one_or_none()
    if not user or not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    # Try TOTP first
    totp = pyotp.TOTP(user.mfa_secret)
    if totp.verify(code, valid_window=1):
        return await build_auth_response(user, db)

    # Try backup codes
    backup_codes: list = user.mfa_backup_codes or []
    if code in backup_codes:
        backup_codes.remove(code)
        user.mfa_backup_codes = backup_codes
        await db.flush()
        return await build_auth_response(user, db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid MFA code",
    )


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
