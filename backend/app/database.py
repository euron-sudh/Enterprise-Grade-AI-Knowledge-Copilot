import ssl
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

logger = logging.getLogger(__name__)

def _get_connect_args():
    if settings.DATABASE_SSL:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return {"ssl": ctx}
    return {"ssl": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=40,
    pool_recycle=1800,
    connect_args=_get_connect_args(),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and indexes on startup."""
    # Import all models so they are registered with Base.metadata
    from app.models import user, conversation, knowledge, search, workflow  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    # Create performance indexes (IF NOT EXISTS — safe to re-run)
    from sqlalchemy import text
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC)",
        "CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_documents_user_created ON documents(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_index ON document_chunks(document_id, chunk_index ASC)",
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_content ON document_chunks USING gin(to_tsvector('english', content))",
        # Analytics query indexes
        "CREATE INDEX IF NOT EXISTS idx_messages_role_created ON messages(role, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)",
        "CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status)",
    ]
    async with engine.begin() as conn:
        for idx_sql in indexes:
            try:
                await conn.execute(text(idx_sql))
            except Exception as e:
                logger.debug(f"Index creation skipped: {e}")

    logger.info("Database tables created/verified successfully.")
