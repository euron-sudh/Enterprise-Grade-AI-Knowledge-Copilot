import secrets
import logging
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/knowledgeforge"
    DATABASE_SSL: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    SECRET_KEY: str = secrets.token_hex(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # AI APIs
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Stripe billing
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_STARTER_PRICE_ID: str = ""
    STRIPE_PRO_PRICE_ID: str = ""

    # Connector OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    SLACK_CLIENT_ID: str = ""
    SLACK_CLIENT_SECRET: str = ""
    NOTION_CLIENT_ID: str = ""
    NOTION_CLIENT_SECRET: str = ""
    CONNECTOR_OAUTH_REDIRECT_BASE: str = "http://localhost:3000"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # AWS S3 (optional — falls back to local disk if not set)
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # CORS — comma-separated list of allowed origins, or JSON array string
    # In production set: CORS_ORIGINS=https://app.knowledgeforge.ai
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    # Convenience: add a single frontend URL without overriding the full list
    FRONTEND_URL: str = ""

    # App
    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "KnowledgeForge API"
    DEBUG: bool = False

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def warn_default_secret(cls, v: str) -> str:
        if v in ("dev-secret-key-change-in-production", "dev-secret-key-change-in-production-use-openssl-rand-hex-32"):
            logger.warning(
                "WARNING: Using default SECRET_KEY. Set a strong random key in production!"
            )
        return v

    @property
    def effective_cors_origins(self) -> List[str]:
        """Merge CORS_ORIGINS list with FRONTEND_URL if set."""
        origins = list(self.CORS_ORIGINS)
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    @property
    def has_s3(self) -> bool:
        return bool(self.AWS_S3_BUCKET and self.AWS_ACCESS_KEY_ID)

    @property
    def has_stripe(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_SECRET_KEY.startswith("sk_"))

    @property
    def has_anthropic_key(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY and self.ANTHROPIC_API_KEY.strip())

    @property
    def has_tavily_key(self) -> bool:
        return bool(self.TAVILY_API_KEY and self.TAVILY_API_KEY.strip())

    @property
    def has_google_key(self) -> bool:
        return bool(self.GOOGLE_API_KEY and self.GOOGLE_API_KEY.strip())

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
