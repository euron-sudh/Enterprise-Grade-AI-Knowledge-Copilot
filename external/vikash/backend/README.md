# KnowledgeForge API Backend

FastAPI backend for the KnowledgeForge AI Copilot — an intelligent knowledge management system with RAG-powered chat, document processing, semantic search, and analytics.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git

## Quick Start

### 1. Clone and navigate to the backend directory

```bash
cd backend
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Optionally, edit `.env` and add your Anthropic API key to enable real AI responses:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Without an API key, the backend runs in **mock mode** — it streams realistic demo responses word-by-word, so the frontend works fully for development and testing.

### 3. Start all services with Docker Compose

```bash
docker-compose up --build
```

This will start:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`
- **FastAPI API** on port `8000`

On first start, the API automatically creates all database tables via SQLAlchemy.

### 4. Seed the demo user (optional but recommended)

In a new terminal:

```bash
docker-compose exec api python seed.py
```

Or if running locally (with virtualenv):

```bash
python seed.py
```

Demo credentials:
- **Email:** `demo@knowledgeforge.ai`
- **Password:** `Demo1234!`

### 5. Access the API

| URL | Description |
|-----|-------------|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc documentation |
| `http://localhost:8000/health` | Health check |

## Testing the API

### Health check

```bash
curl http://localhost:8000/health
```

### Register a new user

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "Test1234!"}'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@knowledgeforge.ai", "password": "Demo1234!"}'
```

### Create a conversation and stream a message

```bash
# First, get your access token from login response
ACCESS_TOKEN="your-access-token-here"

# Create a conversation
curl -X POST http://localhost:8000/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Chat"}'

# Stream a message (replace CONV_ID)
curl -X POST http://localhost:8000/conversations/CONV_ID/messages/stream \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, what can you help me with?"}'
```

### Upload a document

```bash
curl -X POST http://localhost:8000/knowledge/documents/upload \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "files[]=@/path/to/document.pdf"
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/knowledgeforge` | PostgreSQL connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `SECRET_KEY` | Random | JWT signing key — **change in production!** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic API key for Claude. Falls back to mock if not set. |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key for Whisper transcription. |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded files |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum file upload size |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `APP_VERSION` | `1.0.0` | Application version |
| `DEBUG` | `false` | Enable SQLAlchemy query logging |

## Development (without Docker)

### Setup virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Start PostgreSQL and Redis separately

```bash
# Start only the DB and Redis containers
docker-compose up db redis -d
```

### Run the API locally

```bash
cp .env.example .env
# Edit .env as needed

uvicorn app.main:app --reload --port 8000
```

### Running database migrations

The API auto-creates tables on startup via `init_db()`. For schema migrations:

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "description of change"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, router registration
│   ├── config.py            # Pydantic settings from environment
│   ├── database.py          # SQLAlchemy async engine and session
│   ├── dependencies.py      # FastAPI dependencies (auth, DB session)
│   ├── core/
│   │   └── security.py      # JWT, password hashing
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User, RefreshToken
│   │   ├── conversation.py  # Conversation, Message
│   │   ├── knowledge.py     # Document, DocumentChunk, Collection, Connector
│   │   └── search.py        # SavedSearch, SearchLog, Meeting
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── knowledge.py
│   │   ├── search.py
│   │   ├── analytics.py
│   │   ├── voice.py
│   │   └── meetings.py
│   ├── routers/             # FastAPI route handlers
│   │   ├── auth.py
│   │   ├── conversations.py # Includes SSE streaming
│   │   ├── knowledge.py
│   │   ├── search.py
│   │   ├── analytics.py
│   │   ├── voice.py
│   │   └── meetings.py
│   └── services/            # Business logic
│       ├── auth_service.py
│       ├── ai_service.py    # Claude streaming + mock fallback
│       ├── document_service.py
│       └── search_service.py
├── alembic/                 # Database migrations
├── uploads/                 # Uploaded files (gitignored)
├── seed.py                  # Demo data seeder
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## AI / Streaming

The `/conversations/{id}/messages/stream` endpoint uses **Server-Sent Events (SSE)**.

Each event frame is: `data: {json}\n\n`

Event types:
- `{"type": "sources", "sources": [...]}` — RAG citations (emitted first)
- `{"type": "delta", "delta": "text"}` — streamed content chunks
- `{"type": "done", "messageId": "uuid"}` — stream complete
- `{"type": "error", "error": "message"}` — on failure

Then a final `data: [DONE]\n\n` frame.

With `ANTHROPIC_API_KEY` set, uses Claude (`claude-sonnet-4-6`) via the Anthropic Python SDK with real streaming.

Without an API key, a contextual mock response is streamed word-by-word with 40ms delays — the frontend experience is identical.

## Supported Document Types

| Extension | Type | Text Extraction |
|-----------|------|-----------------|
| `.pdf` | PDF | PyPDF2 |
| `.docx`, `.doc` | Word | python-docx |
| `.txt`, `.md`, `.csv` | Plain text | Direct read |
| `.json`, `.html`, `.htm` | Other text | Direct read |

Documents are split into ~500-token chunks with 50-token overlap for retrieval.
