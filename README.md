# KnowledgeForge AI Copilot

An enterprise-grade AI Knowledge Copilot that serves as a company-wide AI brain. Employees interact with it via **chat**, **voice**, and **video/meetings**. It ingests, indexes, and reasons over organizational knowledge — documents, PDFs, and more — then provides instant, cited, context-aware answers.

---

## Features

- **AI Chat** — Multi-turn RAG conversations over your knowledge base with real-time SSE streaming, source citations, conversation branching, and sharing
- **Voice Assistant** — Speak naturally and get spoken answers (Web Speech API + TTS)
- **Meeting Intelligence** — Transcribe meetings, extract action items, search past meetings by spoken content
- **Knowledge Base** — Ingest PDFs, DOCX, and more. Semantic chunking, full-text search (pgvector + PostgreSQL FTS), and 20+ data connectors
- **Enterprise Search** — Hybrid semantic + BM25 full-text search with reranking
- **AI Agents** — Autonomous agents for research, writing, data analysis, and more
- **Workflow Automation** — Visual drag-and-drop builder with event triggers and human-in-the-loop steps
- **Analytics Dashboard** — Usage metrics, AI performance scores, knowledge gap analysis, with Redis caching for fast loads
- **Admin Panel** — User management, API keys, connectors, and system health

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 + Uvicorn (async) |
| Database | PostgreSQL (Supabase) via SQLAlchemy 2.0 async + asyncpg |
| Migrations | Alembic |
| Cache | Redis 7 |
| AI / LLM | Anthropic Claude (`claude-sonnet-4-6`) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Web Search | Tavily API |
| Auth | JWT (python-jose) + bcrypt |
| File Parsing | PyPDF2, python-docx |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand + TanStack React Query 5 |
| Charts | Recharts |
| Animations | Framer Motion |
| Testing | Vitest + Playwright |

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine + indexes
│   │   ├── dependencies.py      # Auth + DB dependency injection
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── conversations.py
│   │   │   ├── knowledge.py
│   │   │   ├── analytics.py
│   │   │   ├── search.py
│   │   │   ├── voice.py
│   │   │   ├── meetings.py
│   │   │   ├── agents.py
│   │   │   ├── workflows.py
│   │   │   ├── admin.py
│   │   │   └── api_keys.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic
│   │   │   ├── ai_service.py    # Claude streaming + RAG
│   │   │   └── document_service.py
│   │   └── core/
│   │       └── security.py      # JWT + password hashing
│   ├── alembic/                 # Database migrations
│   ├── uploads/                 # Uploaded file storage
│   ├── requirements.txt
│   └── .env                     # Environment variables
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/          # Login, register pages
        │   └── (dashboard)/     # Authenticated pages
        │       ├── home/        # Dashboard with KPI cards
        │       ├── chat/        # AI chat interface
        │       ├── voice/       # Voice assistant
        │       ├── knowledge/   # Knowledge base management
        │       ├── analytics/   # Usage analytics
        │       ├── search/      # Enterprise search
        │       ├── agents/      # AI agents
        │       ├── workflows/   # Workflow automation
        │       ├── meetings/    # Meeting intelligence
        │       ├── video/       # Video library
        │       ├── settings/    # User settings
        │       └── admin/       # Admin panel
        ├── components/          # Reusable UI components
        ├── lib/api/             # API client functions
        ├── hooks/               # Custom React hooks
        ├── stores/              # Zustand state stores
        └── types/               # TypeScript type definitions
```

---

## Prerequisites

- Python 3.12
- Node.js 18+
- Docker Desktop (for Redis)
- Supabase project (PostgreSQL database)
- Anthropic API key
- OpenAI API key (embeddings)
- Tavily API key (web search, optional)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd Project-8-Enterprise-Grade-AI-Knowledge-Copilot-Chat-Voice-Docs-Video-
```

### 2. Start Redis

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 3. Backend setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Start the backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010
```

The backend auto-creates all tables, indexes, and a demo user on first startup.

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8010

# Build and start
npm run build
npm start -- --port 3001
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
DATABASE_SSL=true

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here   # Generate: openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...           # Optional: enables web search in chat

# App
CORS_ORIGINS=["http://localhost:3001"]
DEBUG=false
MAX_UPLOAD_SIZE_MB=50
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8010
```

---

## Default Credentials

After first startup, two users are seeded automatically:

| Role | Email | Password |
|---|---|---|
| Admin | `demo@knowledgeforge.ai` | `demo12345` |
| Super Admin | `admin@knowledgeforge.ai` | `Admin1234!` |

---

## API Reference

The backend exposes a full REST API. Interactive docs available at:
- **Swagger UI**: `http://localhost:8010/docs`
- **ReDoc**: `http://localhost:8010/redoc`

Key endpoint groups:

| Prefix | Description |
|---|---|
| `/auth` | Login, register, token refresh |
| `/conversations` | Chat conversations + SSE streaming |
| `/knowledge` | Document upload, collections, connectors |
| `/analytics` | Usage stats, AI performance, dashboard |
| `/search` | Full-text + semantic search |
| `/voice` | Voice session management |
| `/meetings` | Meeting rooms and transcripts |
| `/agents` | AI agent management |
| `/workflows` | Workflow automation |
| `/admin` | User and system administration |

---

## Architecture Notes

### RAG Pipeline
1. **Ingest** — Documents are uploaded, parsed (PDF/DOCX), chunked, and stored in `document_chunks`
2. **Embed** — Each chunk is embedded via OpenAI `text-embedding-3-small` and stored as pgvector
3. **Retrieve** — On each chat message: vector search (pgvector) + full-text search (PostgreSQL GIN index) run in parallel; results are reranked and injected as context
4. **Generate** — Claude `claude-sonnet-4-6` streams the response via SSE with cited sources

### Performance Optimizations
- **Redis caching** — Analytics dashboard cached 120s; home stats cached 60s; user sessions cached 5 min
- **Multi-aggregate SQL** — Multiple COUNT queries collapsed into single queries using `CASE` expressions
- **DB indexes** — Custom indexes on `messages(role, created_at)`, `conversations(user_id, updated_at)`, `document_chunks` (GIN full-text), and more
- **SSE streaming** — Chat responses stream token-by-token using an optimized `indexOf('\n')` buffer loop
- **Connection pooling** — SQLAlchemy pool_size=20, max_overflow=40, pool_recycle=1800

### Authentication
- JWT access tokens (60-min expiry) + refresh tokens (30-day expiry)
- User records cached in Redis for 5 minutes to avoid a DB round trip on every authenticated request
- Passwords hashed with bcrypt

---

## Development

```bash
# Backend — auto-reload on file changes
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload

# Frontend — dev server with hot reload
cd frontend
npm run dev -- --port 3001
```

---

## License

MIT
