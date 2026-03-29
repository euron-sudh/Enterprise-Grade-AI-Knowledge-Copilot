"""Shared pytest fixtures for all backend tests."""
import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

# Use in-memory SQLite for tests (no PostgreSQL required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


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
    from app.database import get_db

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
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
    await db.flush()
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
    await db.flush()
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
