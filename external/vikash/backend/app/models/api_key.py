import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_raw_key() -> str:
    """Return a new plain-text API key (shown to the user exactly once)."""
    return f"kf_{secrets.token_urlsafe(32)}"


def hash_key(raw_key: str) -> str:
    """SHA-256 hash of the raw key — stored in DB, never the plaintext."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # First 10 chars kept for display (e.g. "kf_abc123…")
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    # SHA-256 hash of the raw key — used for authentication lookups
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    # Relationship back to owner
    user: Mapped["User"] = relationship("User", back_populates="api_keys")
