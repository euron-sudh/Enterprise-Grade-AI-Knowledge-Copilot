"""Shared pytest fixtures for all backend tests."""
import asyncio
import json
import sqlite3
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import JSON, String, Text, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Register compile-time adapters so PostgreSQL-specific column types
# (UUID, JSONB, ARRAY) compile to SQLite-friendly equivalents during tests.
# ---------------------------------------------------------------------------
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB, ARRAY as PG_ARRAY

# UUID → CHAR(32) on SQLite
from sqlalchemy.types import TypeDecorator, CHAR


class _UUIDForSQLite(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(length=36)

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return value


# Monkey-patch compile rules for SQLite so create_all works
from sqlalchemy.dialects.sqlite import base as sqlite_base

_orig_get_colspec = getattr(sqlite_base.SQLiteTypeCompiler, "visit_UUID", None)


@staticmethod
def _array_to_json(type_, **kw):
    return "TEXT"  # store as JSON string


# Register adapters
from sqlalchemy import event as sa_event  # noqa: E402

# Use in-memory SQLite for tests (no PostgreSQL required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

sqlite3.register_adapter(list, json.dumps)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


# Intercept table columns at DDL time, replacing PG types with SQLite-compatible ones
@event.listens_for(test_engine.sync_engine, "connect")
def _on_connect(dbapi_conn, connection_record):
    """Enable WAL mode and register adapters."""
    pass


def _patch_pg_types_for_sqlite():
    """Replace PG column types so SQLAlchemy can emit SQLite DDL."""
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

    if not hasattr(SQLiteTypeCompiler, "_pg_patched"):
        SQLiteTypeCompiler.visit_UUID = lambda self, type_, **kw: "VARCHAR(36)"
        SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "TEXT"
        SQLiteTypeCompiler.visit_ARRAY = lambda self, type_, **kw: "TEXT"
        SQLiteTypeCompiler._pg_patched = True


_patch_pg_types_for_sqlite()
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


@asynccontextmanager
async def _null_lifespan(app):
    """No-op lifespan for tests — skips Alembic migrations and PG-specific seed."""
    yield


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    from app.database import Base
    # Import all models to register them
    import app.models.user       # noqa
    import app.models.conversation  # noqa
    import app.models.knowledge  # noqa
    import app.models.search     # noqa
    import app.models.workflow   # noqa

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from app.main import app
    from app import database as app_database
    from app import dependencies as app_dependencies

    async def override_get_db():
        yield db

    app.dependency_overrides[app_database.get_db] = override_get_db
    app.dependency_overrides[app_dependencies.get_db] = override_get_db

    # Disable lifespan (it runs Alembic + PG-specific seed SQL)
    # We already create tables via the db fixture above.
    app.router.lifespan_context = _null_lifespan

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db: AsyncSession):
    from app.models.user import User
    from app.core.security import hash_password
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        hashed_password=hash_password("TestPass123!"),
        role="member",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession):
    from app.models.user import User
    from app.core.security import hash_password
    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        name="Admin User",
        hashed_password=hash_password("AdminPass123!"),
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    from app.core.security import create_access_token
    token = create_access_token(
        user_id=str(test_user.id),
        email=test_user.email,
        role=str(test_user.role.value if hasattr(test_user.role, "value") else test_user.role),
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user) -> dict:
    from app.core.security import create_access_token
    token = create_access_token(
        user_id=str(admin_user.id),
        email=admin_user.email,
        role=str(admin_user.role.value if hasattr(admin_user.role, "value") else admin_user.role),
    )
    return {"Authorization": f"Bearer {token}"}
