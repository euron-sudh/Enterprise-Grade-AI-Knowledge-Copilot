# KnowledgeForge — Backend

FastAPI 0.111 · Python 3.12 · PostgreSQL 16 + pgvector · Redis 7 · Celery · SQLAlchemy 2 async

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Background Workers](#background-workers)
- [Storage](#storage)
- [Vector Search](#vector-search)
- [AI Service](#ai-service)
- [Authentication](#authentication)
- [Testing](#testing)
- [Code Style](#code-style)

---

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your keys (DATABASE_URL, ANTHROPIC_API_KEY, etc.)

# 4. Start Redis (required for sessions and Celery)
docker-compose up -d redis

# 5. Run migrations and seed demo accounts
alembic upgrade head
python seed.py

# 6. Start the API server
uvicorn app.main:app --reload --port 8010
```

Interactive docs: http://localhost:8010/docs

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, router registration
│   ├── config.py            # Typed settings via pydantic-settings
│   ├── database.py          # SQLAlchemy async engine, session factory, indexes
│   ├── dependencies.py      # Shared FastAPI dependencies:
│   │                        #   get_db, get_current_user,
│   │                        #   check_query_limit, check_storage_limit
│   ├── models/              # SQLAlchemy ORM models (declarative, async)
│   │   ├── user.py          # User, RefreshToken, Invite, UserRole
│   │   ├── conversation.py  # Conversation, Message, MessageRole, MessageFeedback
│   │   ├── knowledge.py     # Document, DocumentChunk, Collection, Connector
│   │   ├── search.py        # SavedSearch, SearchLog
│   │   └── workflow.py      # Workflow, WorkflowRun, WorkflowStep
│   ├── routers/             # One router per domain
│   │   ├── auth.py          # /auth — login, register, MFA, OAuth, refresh
│   │   ├── conversations.py # /conversations — chat + SSE streaming
│   │   ├── knowledge.py     # /knowledge — documents, collections, connectors
│   │   ├── search.py        # /search — hybrid search
│   │   ├── voice.py         # /voice — STT, TTS, sessions
│   │   ├── meetings.py      # /meetings — rooms, transcripts, recaps
│   │   ├── agents.py        # /agents — agent execution
│   │   ├── workflows.py     # /workflows — CRUD + execution
│   │   ├── analytics.py     # /analytics — usage, performance, gaps
│   │   ├── admin.py         # /admin — user management, system health
│   │   ├── billing.py       # /billing — Stripe subscriptions, invoices
│   │   ├── teams.py         # /teams — team management
│   │   ├── video.py         # /video — upload, player, AI analysis
│   │   ├── websocket.py     # /ws — real-time WebSocket handlers
│   │   ├── connectors_oauth.py       # OAuth flows for connectors
│   │   └── knowledge_oauth_sync.py   # Connector content sync
│   ├── schemas/             # Pydantic v2 request/response schemas
│   ├── services/            # Business logic (one service per domain)
│   │   ├── ai_service.py    # RAG chain, Claude streaming, agent execution
│   │   ├── auth_service.py  # Login, register, MFA challenge, token refresh
│   │   ├── document_service.py  # Parsing, chunking, embedding, indexing
│   │   ├── search_service.py    # Hybrid search orchestration
│   │   ├── vector_store.py      # pgvector + Pinecone abstraction
│   │   └── workflow_service.py  # Workflow execution engine
│   ├── workers/             # Celery background workers
│   │   ├── celery_app.py    # Celery app config, Beat schedule
│   │   └── tasks/
│   │       ├── ingestion.py         # Document ingestion pipeline task
│   │       ├── embedding.py         # Embedding regeneration + Pinecone sync
│   │       ├── video_processing.py  # Video transcription + analysis
│   │       ├── notifications.py     # Email + in-app notification delivery
│   │       ├── sync.py              # Connector hourly sync
│   │       └── cleanup.py           # Daily maintenance (expired tokens, old notifications)
│   └── core/
│       ├── security.py      # JWT creation/validation, bcrypt, Redis helper
│       └── storage.py       # S3 / local disk storage abstraction
├── alembic/                 # Migration scripts
│   └── versions/            # Auto-generated migration files
├── tests/                   # pytest test suite
│   ├── conftest.py          # In-memory SQLite fixtures, test client, auth helpers
│   ├── test_auth.py         # 11 auth tests (register, login, MFA, refresh)
│   ├── test_knowledge.py    # 8 knowledge tests
│   └── test_conversations.py # 8 conversation tests
├── seed.py                  # Seed demo + admin accounts
├── requirements.txt
├── alembic.ini
├── docker-compose.yml       # Redis + Celery worker + Beat + Flower
└── Dockerfile
```

---

## Configuration

All settings are defined in [app/config.py](app/config.py) using `pydantic-settings`. Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host:5432/dbname` |
| `SECRET_KEY` | Yes | JWT signing key — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for chat and agents |
| `REDIS_URL` | Recommended | `redis://localhost:6379` (sessions, Celery) |
| `GOOGLE_API_KEY` | Recommended | Gemini 2.0 Flash for video analysis |
| `OPENAI_API_KEY` | Optional | Whisper fallback; Pinecone embeddings |
| `TAVILY_API_KEY` | Optional | Web search in Research Agent |
| `DEEPGRAM_API_KEY` | Optional | Real-time voice STT |
| `ELEVENLABS_API_KEY` | Optional | TTS voice synthesis |
| `AWS_S3_BUCKET` | Optional | Enables S3 storage (disables local disk) |
| `AWS_S3_REGION` | Optional | Default `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Optional | Required with S3 |
| `AWS_SECRET_ACCESS_KEY` | Optional | Required with S3 |
| `PINECONE_API_KEY` | Optional | Production-scale vector search |
| `PINECONE_INDEX_NAME` | Optional | Pinecone index name |
| `STRIPE_SECRET_KEY` | Optional | Billing and subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook verification |
| `SMTP_HOST` | Optional | Email notifications |
| `CORS_ORIGINS` | Optional | Default `["http://localhost:3001"]` |

---

## Database

### Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe_change"

# Roll back one migration
alembic downgrade -1

# Show migration history
alembic history --verbose
```

### Key Models

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Accounts with RBAC role, MFA, Stripe subscription |
| `RefreshToken` | `refresh_tokens` | Rotating refresh tokens (30-day expiry) |
| `Conversation` | `conversations` | Chat sessions with model + system prompt |
| `Message` | `messages` | Individual chat turns (user \| assistant) |
| `Document` | `documents` | Uploaded/ingested knowledge documents |
| `DocumentChunk` | `document_chunks` | Chunked content with pgvector embeddings |
| `Collection` | `knowledge_collections` | Curated document groups |
| `Connector` | `connectors` | Data source connector configs (encrypted tokens) |

---

## API Endpoints

Full interactive docs: http://localhost:8010/docs

| Router | Prefix | Key Endpoints |
|---|---|---|
| Auth | `/auth` | POST login, register, refresh, `/mfa/challenge` |
| Chat | `/conversations` | GET/POST conversations, POST `.../messages/stream` (SSE) |
| Knowledge | `/knowledge` | POST `/documents/upload`, GET/DELETE documents, collections, connectors |
| Search | `/search` | POST search (hybrid), GET suggest |
| Voice | `/voice` | POST sessions, GET TTS |
| Meetings | `/meetings` | CRUD meetings, GET transcript/recap |
| Agents | `/agents` | POST execute, GET logs |
| Workflows | `/workflows` | CRUD, POST execute |
| Analytics | `/analytics` | GET usage, ai-performance, knowledge-gaps |
| Admin | `/admin` | GET users, audit-logs, system-health |
| Billing | `/billing` | GET/POST subscription, GET invoices, usage |
| Teams | `/teams` | CRUD teams and members |
| WebSocket | `/ws` | `/ws/notifications`, `/ws/chat/{id}`, `/ws/voice/{id}` |

---

## Background Workers

Workers use Celery with Redis as the broker. Start them with:

```bash
# Worker (processes queued tasks)
celery -A app.workers.celery_app.celery_app worker --loglevel=info

# Scheduler (triggers periodic tasks: hourly sync, daily cleanup)
celery -A app.workers.celery_app.celery_app beat --loglevel=info

# Monitoring UI at http://localhost:5555
celery -A app.workers.celery_app.celery_app flower

# Or start everything via Docker Compose
docker-compose up -d
```

### Registered Tasks

| Task | Trigger | Description |
|---|---|---|
| `ingestion.ingest_document` | On upload | Parse → chunk → embed → index document |
| `ingestion.ingest_url` | On URL import | Crawl URL → parse → chunk → embed |
| `embedding.regenerate_embeddings` | Manual | Re-embed all chunks of a document |
| `embedding.sync_to_pinecone` | After ingestion | Upsert chunks to Pinecone |
| `video_processing.process_video` | On video upload | Transcribe + generate chapters |
| `notifications.send_email_notification` | Event-driven | Send transactional email via SMTP/SES |
| `notifications.push_in_app_notification` | Event-driven | Persist + push notification via WebSocket |
| `sync.sync_all_connectors` | Every hour (Beat) | Queue sync for all active connectors |
| `sync.sync_connector` | Queued by above | Incremental sync of one connector |
| `cleanup.daily_cleanup` | Daily (Beat) | Purge expired tokens + archive old notifications |

---

## Storage

The storage layer (`app/core/storage.py`) switches automatically:

- **Local disk** (`uploads/`) — when `AWS_S3_BUCKET` is not set (default for dev)
- **AWS S3** — when `AWS_S3_BUCKET` is set; files served via presigned URLs

```python
from app.core.storage import storage

key = await storage.put(file_bytes, "documents/uuid/file.pdf", content_type="application/pdf")
url = await storage.url(key, expires_in=3600)
await storage.delete(key)
```

---

## Vector Search

Two backends, chosen automatically:

| Backend | When Used | Notes |
|---|---|---|
| **pgvector** | Always (dev + prod) | Co-located with Postgres, IVFFLAT index, ~5ms |
| **Pinecone** | When `PINECONE_API_KEY` set | Managed, ~1ms, namespace-isolated per tenant |

The `PineconeVectorStore` in `app/services/vector_store.py` lazy-initializes on first use and falls back to pgvector on any error. Both run in parallel during hybrid search (RRF merge).

---

## AI Service

`app/services/ai_service.py` orchestrates all LLM interactions:

- **RAG chat**: embed query → parallel vector + full-text retrieval → build context → Claude stream
- **Agent execution**: ReAct loop with tool calls (knowledge search, web search, email, calendar)
- **Multi-model**: routes to Anthropic / OpenAI / Gemini based on the `model` field in the request
- **SSE streaming**: yields `data: {token}` chunks — consumed by the frontend `EventSource`

---

## Authentication

| Feature | Implementation |
|---|---|
| Login | `POST /auth/login` — returns full `AuthResponse` or `202 MfaChallengeResponse` |
| MFA | `POST /auth/mfa/challenge` — verifies TOTP or backup code, returns full tokens |
| Refresh | `POST /auth/refresh` — rotates refresh token, issues new access token |
| OAuth | `POST /auth/oauth-login` — Google and Microsoft Azure AD |
| Plan enforcement | `check_query_limit` dependency on `POST .../messages/stream` |
| Storage enforcement | `check_storage_limit` dependency on `POST /documents/upload` |

---

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# With coverage report
pytest tests/ --cov=app --cov-report=html

# Run only fast tests (skip slow integration)
pytest tests/ -m "not slow" -v
```

Tests use an **in-memory SQLite** database via `aiosqlite` — no external database needed.

---

## Code Style

```bash
# Lint
ruff check app/

# Format
ruff format app/

# Type check
mypy app/ --ignore-missing-imports
```
