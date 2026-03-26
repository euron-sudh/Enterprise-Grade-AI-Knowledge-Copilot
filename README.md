# KnowledgeForge AI Copilot

An enterprise-grade AI Knowledge Copilot that serves as a company-wide AI brain. Employees interact with it via **chat**, **voice**, and **video/meetings**. It ingests, indexes, and reasons over organizational knowledge — documents, PDFs, videos, and more — then provides instant, cited, context-aware answers.

---

## Features

- **AI Chat** — Multi-turn RAG conversations over your knowledge base with real-time SSE streaming, source citations, conversation branching, and sharing
- **Voice Assistant** — Speak naturally and get spoken answers (Web Speech API + TTS)
- **Meeting Intelligence** — Transcribe meetings, extract action items, search past meetings by spoken content
- **Knowledge Base** — Ingest PDFs, DOCX, and more. Semantic chunking, full-text search, and 8 built-in data connectors (Google Drive, Confluence, Slack, GitHub, Notion, Jira, Salesforce, Gmail) with step-by-step connection guides
- **Video Library** — Upload videos up to 100 MB; AI-powered analysis using **Gemini 2.0 Flash** (transcript + visual descriptions + key topics + summary). Falls back to OpenAI Whisper for audio-only transcription
- **Enterprise Search** — Hybrid semantic + BM25 full-text search with reranking
- **AI Agents** — Research Agent (live web search via Tavily/DuckDuckGo + KB RAG), Writing Agent, Data Analyst, Support Agent, Compliance Agent, Onboarding Agent — all with file/image/document attachment support
- **Workflow Automation** — Visual drag-and-drop builder with event triggers and human-in-the-loop steps
- **Analytics Dashboard** — Usage metrics, AI performance scores, knowledge gap analysis
- **API Keys** — Generate multi-model API keys scoped to Claude, OpenAI, Gemini, Mistral, or Llama with per-key permissions and rate limits
- **OAuth Authentication** — Google and Microsoft sign-in via NextAuth.js with automatic JWT refresh
- **Admin Panel** — User management, connectors, and system health

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
| Video AI | Google Gemini 2.0 Flash (`gemini-2.0-flash`) via `google-generativeai` |
| Audio Transcription | OpenAI Whisper (fallback when no Google key) |
| Web Search | Tavily API (primary) + DuckDuckGo (free fallback) |
| Auth | JWT (python-jose) + bcrypt + automatic refresh token rotation |
| File Parsing | PyPDF2, python-docx |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, standalone output) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| Auth | NextAuth.js (credentials + Google OAuth + Microsoft OAuth) |
| State | Zustand + TanStack React Query 5 |
| Charts | Recharts |
| Animations | Framer Motion |

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   │                        # Includes: GOOGLE_API_KEY, TAVILY_API_KEY
│   │   ├── database.py          # SQLAlchemy engine + indexes
│   │   ├── dependencies.py      # Auth + DB dependency injection
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── conversations.py
│   │   │   ├── knowledge.py     # Document upload + Gemini 2.0 video processing
│   │   │   ├── analytics.py
│   │   │   ├── search.py
│   │   │   ├── voice.py
│   │   │   ├── meetings.py
│   │   │   ├── agents.py        # Research agent with live web search
│   │   │   ├── workflows.py
│   │   │   ├── admin.py
│   │   │   └── api_keys.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
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
        │   │   └── login/       # Google + Microsoft OAuth buttons
        │   └── (dashboard)/     # Authenticated pages
        │       ├── home/        # Dashboard with KPI cards
        │       ├── chat/        # AI chat interface
        │       ├── voice/       # Voice assistant
        │       ├── knowledge-base/ # Knowledge base + Connectors panel
        │       ├── analytics/   # Usage analytics
        │       ├── search/      # Enterprise search
        │       ├── agents/      # AI agents with file attachments
        │       │   └── research/  # Research agent with web search
        │       ├── workflows/   # Workflow automation
        │       ├── meetings/    # Meeting intelligence
        │       ├── video/       # Video library (Gemini 2.0 powered)
        │       ├── api-keys/    # Multi-model API key management
        │       ├── settings/    # User settings
        │       └── admin/       # Admin panel
        ├── components/
        │   └── layout/
        │       └── sidebar.tsx  # Navigation (includes API Keys)
        ├── lib/
        │   └── auth.ts          # NextAuth config with JWT auto-refresh
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
- Google AI Studio API key (Gemini 2.0 video processing)
- OpenAI API key (Whisper fallback, optional if Google key set)
- Tavily API key (web search in Research Agent, optional — falls back to DuckDuckGo)
- Google OAuth credentials (for Google sign-in, optional)
- Microsoft Azure AD credentials (for Microsoft sign-in, optional)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd Enterprise-Grade-AI-Knowledge-Copilot
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
# Edit .env.local with your credentials (see Environment Variables section)

# Build (required for standalone output)
npm run build

# Copy static assets (required after every build)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Start (loads env vars at runtime)
export $(cat .env.local | grep -v '^#' | grep '=' | xargs) && PORT=3001 node .next/standalone/server.js
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here   # Generate: openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...                # Claude (chat + agents)
OPENAI_API_KEY=sk-...                       # Whisper transcription fallback
GOOGLE_API_KEY=AIza...                      # Gemini 2.0 Flash (video processing)
TAVILY_API_KEY=tvly-...                     # Web search (optional, DuckDuckGo fallback)

# App
CORS_ORIGINS=["http://localhost:3001"]
MAX_UPLOAD_SIZE_MB=50
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8010
NEXT_PUBLIC_WS_URL=ws://localhost:8010
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret        # Generate: openssl rand -hex 32

# Google OAuth (optional — https://console.cloud.google.com)
# Redirect URI: http://localhost:3001/api/auth/callback/google
# Set OAuth consent screen to "External" to allow any Google account
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth (optional — https://portal.azure.com)
# Redirect URI: http://localhost:3001/api/auth/callback/azure-ad
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common
```

---

## Default Credentials

After first startup, two users are seeded automatically:

| Role | Email | Password |
|---|---|---|
| Demo User | `demo@knowledgeforge.ai` | `demo12345` |
| Super Admin | `admin@knowledgeforge.ai` | `Admin1234!` |

---

## Video Processing

Videos are processed with **Gemini 2.0 Flash** when `GOOGLE_API_KEY` is set. Gemini understands the full video — audio, visuals, slides, and diagrams — and returns:

1. Timestamped verbatim transcript
2. Visual content descriptions (slides, on-screen text, diagrams)
3. Key topics bullet list
4. Executive summary

All content is chunked and indexed into the RAG pipeline for instant retrieval in chat.

If `GOOGLE_API_KEY` is not set, the system falls back to **OpenAI Whisper** (audio-only transcription).

---

## AI Agents

### Research Agent
Combines live web search with internal knowledge base RAG:
1. Searches the internal knowledge base (vector + full-text)
2. Runs live web search via Tavily (or DuckDuckGo if no Tavily key)
3. Synthesizes both into a cited report with web and internal source tabs

Supports file/image/document attachments — drag-and-drop or click to attach PDFs, DOCX, CSVs, images, and more. Text is extracted client-side and appended to the query context.

### Other Agents
- **Writing Agent** — Draft documents, emails, and reports using org context
- **Data Analyst** — Query data, generate analysis from CSV/Excel attachments
- **Support Agent** — Answer employee questions with KB citations
- **Compliance Agent** — Check documents against policy with PDF/DOCX support
- **Onboarding Agent** — Guide new employees through company knowledge

---

## API Keys

Generate multi-model API keys at `/api-keys` to access KnowledgeForge programmatically:

- Select one or more providers: **Claude**, **OpenAI**, **Gemini**, **Mistral**, **Llama**
- Scope to specific models (e.g. only `claude-sonnet-4-6` and `gpt-4o`)
- Set granular permissions (chat, search, agents, knowledge, analytics, admin)
- Configure rate limits and expiration
- Switch models by changing the `model` field — same key works across all providers

```bash
curl -X POST https://api.knowledgeforge.ai/v1/chat \
  -H "Authorization: Bearer kf_YOUR_API_KEY" \
  -d '{"model": "claude-sonnet-4-6", "messages": [...]}'
```

---

## OAuth Setup

### Google Sign-In
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web Application)
3. Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
4. Set OAuth consent screen to **External**
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `frontend/.env.local`
6. Rebuild the frontend

### Microsoft Sign-In
1. Go to [portal.azure.com](https://portal.azure.com) → App registrations → New registration
2. Add redirect URI: `http://localhost:3001/api/auth/callback/azure-ad`
3. Create a client secret under Certificates & Secrets
4. Add `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID=common` to `frontend/.env.local`
5. Rebuild the frontend

---

## API Reference

Interactive docs available at:
- **Swagger UI**: `http://localhost:8010/docs`
- **ReDoc**: `http://localhost:8010/redoc`

| Prefix | Description |
|---|---|
| `/auth` | Login, register, token refresh, OAuth |
| `/conversations` | Chat conversations + SSE streaming |
| `/knowledge` | Document upload, collections, connectors, video upload |
| `/analytics` | Usage stats, AI performance, dashboard |
| `/search` | Full-text + semantic search |
| `/voice` | Voice session management |
| `/meetings` | Meeting rooms and transcripts |
| `/agents` | AI agent execution (research, writing, analysis) |
| `/workflows` | Workflow automation |
| `/admin` | User and system administration |

---

## Architecture Notes

### RAG Pipeline
1. **Ingest** — Documents are uploaded, parsed (PDF/DOCX/video), chunked, and stored in `document_chunks`
2. **Retrieve** — On each chat message: vector search (pgvector) + full-text search (PostgreSQL GIN index) run in parallel
3. **Generate** — Claude `claude-sonnet-4-6` streams the response via SSE with cited sources

### Authentication Flow
- JWT access tokens (60-min expiry) + refresh tokens (30-day expiry)
- NextAuth automatically refreshes the backend JWT 2 minutes before expiry using the stored refresh token — no re-login required
- Supports credentials, Google OAuth, and Microsoft Azure AD
- Passwords hashed with bcrypt; user records cached in Redis (5 min)

### Performance
- Redis caching — analytics dashboard (120s), home stats (60s), sessions (5 min)
- Connection pooling — SQLAlchemy pool_size=20, max_overflow=40
- SSE streaming — chat responses stream token-by-token
- DB indexes — GIN full-text, vector, conversation, message indexes

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
