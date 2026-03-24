import json
import uuid
from typing import AsyncGenerator, Optional

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decode_access_token
from app.database import AsyncSessionLocal
from app.models.user import User

security = HTTPBearer(auto_error=False)

# ── Redis user-session cache ───────────────────────────────────────────────────
_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
            await _redis.ping()
        except Exception:
            _redis = None
    return _redis


async def _cache_user(user: User) -> None:
    r = await _get_redis()
    if r is None:
        return
    try:
        data = {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
        }
        await r.set(f"user:{user.id}", json.dumps(data), ex=300)  # 5-min TTL
    except Exception:
        pass


async def _get_cached_user_data(user_id: str) -> dict | None:
    r = await _get_redis()
    if r is None:
        return None
    try:
        raw = await r.get(f"user:{user_id}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


# ── DB session ────────────────────────────────────────────────────────────────

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


# ── Auth ──────────────────────────────────────────────────────────────────────

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
    except JWTError:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return None

    # Try Redis cache first — avoids DB round trip on every request
    cached = await _get_cached_user_data(user_id)
    if cached and cached.get("is_active"):
        # Reconstruct a lightweight User-like object from cache
        user = User()
        user.id = uuid.UUID(cached["id"])
        user.email = cached["email"]
        user.name = cached.get("name", "")
        user.is_active = cached["is_active"]
        # role stays as string — only used for permission checks
        from app.models.user import UserRole
        try:
            user.role = UserRole(cached["role"])
        except Exception:
            user.role = cached["role"]
        return user

    # Cache miss — query DB and cache the result
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        if required:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        return None

    await _cache_user(user)
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _get_user_from_token(credentials, db, required=True)
    return user  # type: ignore[return-value]


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    return await _get_user_from_token(credentials, db, required=False)
