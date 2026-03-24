"""
API Key management endpoints.
- GET  /api-keys          → list keys (prefix + metadata, never the raw key)
- POST /api-keys          → generate a new key (raw key returned ONCE)
- DELETE /api-keys/{id}   → revoke a key
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.api_key import ApiKey, generate_raw_key, hash_key
from app.models.user import User

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ApiKeyOut(BaseModel):
    id: uuid.UUID
    name: str
    keyPrefix: str
    isActive: bool
    lastUsedAt: Optional[datetime] = None
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, key: ApiKey) -> "ApiKeyOut":
        return cls(
            id=key.id,
            name=key.name,
            keyPrefix=key.key_prefix,
            isActive=key.is_active,
            lastUsedAt=key.last_used_at,
            createdAt=key.created_at,
        )


class GenerateApiKeyRequest(BaseModel):
    name: str


class GenerateApiKeyResponse(BaseModel):
    """Returned only on creation — rawKey is shown to the user exactly once."""
    id: uuid.UUID
    name: str
    keyPrefix: str
    rawKey: str
    createdAt: datetime


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=List[ApiKeyOut])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [ApiKeyOut.from_orm(k) for k in keys]


@router.post("/api-keys", response_model=GenerateApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def generate_api_key(
    body: GenerateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Key name is required")

    raw_key = generate_raw_key()
    prefix = raw_key[:10] + "…"

    api_key = ApiKey(
        user_id=current_user.id,
        name=body.name.strip(),
        key_prefix=prefix,
        key_hash=hash_key(raw_key),
    )
    db.add(api_key)
    await db.flush()

    return GenerateApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        keyPrefix=prefix,
        rawKey=raw_key,
        createdAt=api_key.created_at,
    )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(key)
    await db.flush()
