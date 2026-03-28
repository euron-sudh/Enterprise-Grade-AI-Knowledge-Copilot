import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, conversations, knowledge, search, analytics, voice, meetings, agents, workflows, admin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting KnowledgeForge API...")
    await init_db()

    # ── Auto-seed demo + admin users (idempotent) ──────────────────────────
    try:
        from sqlalchemy import text
        from app.database import AsyncSessionLocal
        from app.core.security import hash_password

        async with AsyncSessionLocal() as session:
            r = await session.execute(
                text("SELECT id FROM users WHERE email='demo@knowledgeforge.ai'")
            )
            if r.scalar_one_or_none() is None:
                await session.execute(text(
                    "INSERT INTO users (id, email, name, hashed_password, role, is_active, created_at, updated_at) "
                    "VALUES (gen_random_uuid(), 'demo@knowledgeforge.ai', 'Demo User', :pw, 'admin', true, now(), now())"
                ), {"pw": hash_password("demo12345")})
                logger.info("Seed: demo user created.")
            else:
                await session.execute(text(
                    "UPDATE users SET hashed_password=:pw, role='admin' "
                    "WHERE email='demo@knowledgeforge.ai'"
                ), {"pw": hash_password("demo12345")})
                logger.info("Seed: demo user password/role verified.")

            r2 = await session.execute(
                text("SELECT id FROM users WHERE email='admin@knowledgeforge.ai'")
            )
            if r2.scalar_one_or_none() is None:
                await session.execute(text(
                    "INSERT INTO users (id, email, name, hashed_password, role, is_active, created_at, updated_at) "
                    "VALUES (gen_random_uuid(), 'admin@knowledgeforge.ai', 'Admin', :pw, 'super_admin', true, now(), now())"
                ), {"pw": hash_password("Admin1234!")})
                logger.info("Seed: admin user created.")

            await session.commit()
    except Exception as exc:
        logger.warning(f"Seed step skipped or failed (non-fatal): {exc}")
    # ── end seed ────────────────────────────────────────────────────────────

    logger.info(f"KnowledgeForge API v{settings.APP_VERSION} ready.")
    logger.info(
        f"AI mode: {'Claude (Anthropic)' if settings.has_anthropic_key else 'OpenAI' if (settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip()) else 'Mock (no API key)'}"
    )
    yield
    logger.info("Shutting down KnowledgeForge API...")


app = FastAPI(
    title="KnowledgeForge API",
    version=settings.APP_VERSION,
    description=(
        "KnowledgeForge AI Copilot Backend — intelligent knowledge management with RAG-powered chat, "
        "document processing, semantic search, and analytics."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(conversations.router, tags=["Conversations"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])
app.include_router(search.router, tags=["Search"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(voice.router, prefix="/voice", tags=["Voice"])
app.include_router(meetings.router, prefix="/meetings", tags=["Meetings"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "KnowledgeForge API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
