# KnowledgeForge — Enterprise AI Knowledge Copilot

> **Company-wide AI brain** — chat, voice, and meeting intelligence over every piece of organizational knowledge.

[![CI Backend](https://github.com/your-org/knowledgeforge/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/your-org/knowledgeforge/actions/workflows/ci-backend.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

KnowledgeForge ingests, indexes, and reasons over your organization's entire knowledge corpus — documents, wikis, Slack threads, emails, meeting recordings, videos, codebases — and delivers instant, cited, context-aware answers through chat, voice, and video interfaces.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Development Guide](#development-guide)
- [API Reference](#api-reference)
- [OAuth Setup](#oauth-setup)
- [Video Processing](#video-processing)
- [AI Agents](#ai-agents)
- [API Keys](#api-keys)
- [Testing](#testing)
- [Deployment](#deployment)
- [Architecture Notes](#architecture-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### AI Chat Interface
- Multi-turn RAG conversations over the full knowledge base (up to 200K token context)
- Real-time streaming responses via Server-Sent Events (SSE)
- Source citations with clickable links to original documents
- AI-generated follow-up question suggestions
- Code block rendering with syntax highlighting and copy button
- Full Markdown rendering (tables, lists, headings, math)
- File and image attachment support per message
- Multi-model support — switch between Claude, GPT-4, Gemini per conversation
- Conversation sharing via secure expiring links
- Export conversations as PDF, Markdown, or JSON
- Conversation branching, bookmarking, and tagging

### Voice Assistant
- Real-time speech-to-text via WebSocket (Deepgram streaming API)
- Text-to-speech playback (ElevenLabs primary, Amazon Polly fallback)
- Voice activity detection (VAD) — automatic start/stop detection
- Push-to-talk mode option
- Audio waveform visualization
- Continuous hands-free conversation mode
- Live transcript display alongside voice interaction
- Multi-language support (20+ languages)

### Meeting Intelligence
- WebRTC video meeting rooms (up to 50 participants)
- Real-time transcription with per-speaker labels
- AI meeting recap: summary, key decisions, action items
- Meeting recording stored in S3 with CloudFront streaming
- Fully searchable meeting archive (search spoken content by keyword)
- Recording library with transcript and recap badges
- Google Calendar and Outlook integration
- Pre-meeting AI briefing from relevant docs and past meetings

### Knowledge Base Management
- **Document ingestion** — PDF (with OCR), DOCX, XLSX, PPTX, TXT, Markdown, CSV, HTML, images
- Drag-and-drop bulk upload with real-time progress and indexing status
- URL import — ingest any public web page or document URL
- **Collections** — group and share documents by team or project
- **Web crawlers** — auto-crawl and index websites on hourly/daily/weekly schedules
- **20+ data source connectors**: Google Drive, Slack, Confluence, Notion, GitHub, GitLab, Jira, Salesforce, HubSpot, Zendesk, Teams, Gmail, Outlook, OneDrive, Dropbox, SharePoint, and more
- Connector health monitoring, sync status, and auto-retry
- Document versioning with diff view
- Semantic chunking with pgvector for retrieval

### Video Knowledge Base
- Upload videos up to 100MB (chunked upload support)
- AI-powered full video analysis via **Gemini 2.0 Flash** — understands audio, visuals, slides, and diagrams
- AI-generated chapter markers, table of contents, and executive summary
- Full transcript viewer with speaker timestamps
- Video Q&A — query video content at specific timestamps
- Adaptive bitrate streaming (HLS)
- Fallback to **OpenAI Whisper** (audio-only) when no Google API key

### Enterprise Search
- Hybrid semantic (pgvector) + BM25 full-text search with cross-encoder reranking
- Natural language query intent classification
- Faceted filters — source, type, date, author, collection
- Highlighted snippets with surrounding context
- Search autocomplete, typo tolerance, and query expansion
- Saved searches with new-match notifications

### AI Agents & Automation
| Agent | Description |
|---|---|
| **Research Agent** | Multi-step research: internal KB RAG + live web search (Tavily / DuckDuckGo) |
| **Writing Agent** | Draft documents, emails, reports using organizational context |
| **Data Analyst** | Query databases, analyze CSV/Excel attachments, generate charts |
| **Support Agent** | Answer employee questions with KB citations and ticket creation |
| **Onboarding Agent** | Guide new hires through company knowledge |
| **Compliance Agent** | Check documents against policy rules with PDF/DOCX support |
| **Custom Agent** | Full control over behavior, tools, and knowledge scope |

- No-code agent builder wizard (2-step: template → configure)
- Tool assignment: knowledge search, web search, email, calendar, database, code execution, API caller
- Visual workflow builder — drag-and-drop canvas with event triggers and human-in-the-loop steps

### Analytics & Insights
- Usage metrics: query volume, active users, token consumption, feature adoption
- AI performance: response quality scores, citation accuracy, latency distribution
- Knowledge gap analysis — questions asked but unanswered by existing content
- AI-generated insights with actionable recommendations
- Scheduled report delivery (PDF / Excel / email)
- Cost tracking and per-model breakdown

### Authentication & Security
- Email / password with strong policy enforcement and bcrypt hashing
- Google OAuth and Microsoft Azure AD (one-click sign-in)
- NextAuth.js session management with automatic JWT refresh (no re-login)
- MFA via TOTP, SMS, email, or WebAuthn/FIDO2
- RBAC — Super Admin, Admin, Member roles with document-level permissions
- API key management with provider and scope restrictions
- Audit logging — full security event trail with IP addresses
- AES-256 encryption at rest, TLS 1.3 in transit

### Full Admin Panel
| Page | Highlights |
|---|---|
| User Management | Invite, search, filter, bulk suspend/delete, role assignment |
| Role Management | RBAC with per-permission matrix and custom role creation |
| Organizations | Multi-tenant table with plan, status, user count, storage |
| Integrations | Connect/disconnect 20+ tools, sync status, error detection |
| Billing | Stripe integration, usage meters, invoice history |
| Compliance | SOC 2, GDPR, HIPAA, ISO 27001, CCPA tracking with scores |
| Audit Logs | Full event log with severity levels, IP filtering, export |
| AI Models | Enable/disable models, set defaults, configure guardrails |
| Security | MFA enforcement, SSO-only mode, IP allowlisting, password policy |
| Data Governance | Retention policies, PII masking, classification levels, legal hold |
| System Health | Real-time status for 12 infrastructure services, CPU/memory/disk |

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 + Uvicorn (async, Python 3.12) |
| Database | PostgreSQL via SQLAlchemy 2.0 async + asyncpg |
| Migrations | Alembic |
| Cache | Redis 7 |
| Vector Search | pgvector (primary) + Pinecone (production scale) |
| AI — Chat | Anthropic Claude (`claude-sonnet-4-6`) |
| AI — Video | Google Gemini 2.0 Flash (`gemini-2.0-flash`) |
| AI — Audio | OpenAI Whisper (Deepgram for real-time streaming) |
| Web Search | Tavily API (primary) + DuckDuckGo (free fallback) |
| Voice TTS | ElevenLabs (primary) + Amazon Polly (fallback) |
| File Parsing | PyPDF2, python-docx, openpyxl, python-pptx, pytesseract |
| Web Crawling | trafilatura + BeautifulSoup |
| Auth | JWT (python-jose) + bcrypt + refresh token rotation |
| Task Queue | Celery + Redis broker |
| Object Storage | AWS S3 + boto3 |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, standalone output) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 3 |
| Auth | NextAuth.js (credentials + Google OAuth + Microsoft Azure AD) |
| State | Zustand + TanStack React Query 5 |
| Charts | Recharts |
| Animations | Framer Motion |
| Testing | Vitest + Playwright + React Testing Library |
| Build | Turbopack (dev) |

### Infrastructure (AWS)
| Layer | Technology |
|---|---|
| Orchestration | Amazon EKS (Kubernetes) |
| CI/CD | GitHub Actions → ArgoCD (GitOps) |
| IaC | Terraform + Terragrunt |
| Container Registry | Amazon ECR |
| CDN | CloudFront |
| DNS | Route 53 + ACM (SSL) |
| Secrets | AWS Secrets Manager |
| Monitoring | Prometheus + Grafana + CloudWatch |
| Logging | ELK Stack (OpenSearch) |
| Tracing | OpenTelemetry + AWS X-Ray |
| Auto-scaling | Kubernetes HPA + Karpenter |

---

## Project Structure

```
Enterprise-Grade-AI-Knowledge-Copilot/
├── frontend/                          # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/                # Login, Register, Forgot/Reset Password
│   │   │   ├── (dashboard)/           # All authenticated routes
│   │   │   │   ├── home/              # Main dashboard with KPIs
│   │   │   │   ├── chat/              # AI chat interface + conversation history
│   │   │   │   ├── voice/             # Voice assistant
│   │   │   │   ├── playground/        # AI prompt playground
│   │   │   │   ├── meetings/          # Meeting rooms + recordings library
│   │   │   │   ├── knowledge/         # Documents, collections, upload, crawlers
│   │   │   │   ├── knowledge-base/    # Knowledge base home
│   │   │   │   ├── video/             # Video library + AI player
│   │   │   │   ├── search/            # Enterprise search with filters
│   │   │   │   ├── workflows/         # Workflow list + visual builder
│   │   │   │   ├── agents/            # Agent marketplace + builder wizard
│   │   │   │   ├── analytics/         # Usage, AI insights, knowledge gaps, reports
│   │   │   │   ├── notifications/     # Notification center
│   │   │   │   ├── teams/             # Team management
│   │   │   │   ├── profile/           # User profile + settings
│   │   │   │   ├── api-keys/          # API key management
│   │   │   │   └── admin/             # Admin panel (11 sub-pages)
│   │   │   ├── (marketing)/           # 11 public marketing pages
│   │   │   └── api/                   # Next.js API routes (NextAuth, webhooks)
│   │   ├── components/
│   │   │   ├── ui/                    # Base UI component library
│   │   │   ├── layout/                # Sidebar, topbar, command palette
│   │   │   ├── chat/                  # Chat interface components
│   │   │   ├── voice/                 # Voice assistant components
│   │   │   ├── knowledge/             # Knowledge management components
│   │   │   ├── analytics/             # Analytics chart components
│   │   │   ├── search/                # Search interface components
│   │   │   └── providers/             # Auth and React Query providers
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # API client, auth config, utilities
│   │   ├── stores/                    # Zustand state stores
│   │   └── types/                     # TypeScript type definitions
│   ├── tests/
│   │   ├── unit/                      # Vitest unit tests
│   │   └── e2e/                       # Playwright end-to-end tests
│   └── Dockerfile
│
├── backend/                           # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── config.py                  # Settings via pydantic-settings
│   │   ├── database.py                # SQLAlchemy async engine + indexes
│   │   ├── dependencies.py            # Auth + DB dependency injection
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── knowledge.py
│   │   │   ├── search.py
│   │   │   └── workflow.py
│   │   ├── routers/                   # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── conversations.py       # Chat + SSE streaming
│   │   │   ├── knowledge.py           # Document upload + video processing
│   │   │   ├── search.py
│   │   │   ├── voice.py
│   │   │   ├── meetings.py
│   │   │   ├── agents.py              # Research agent with live web search
│   │   │   ├── workflows.py
│   │   │   ├── analytics.py
│   │   │   ├── admin.py
│   │   │   ├── billing.py
│   │   │   ├── teams.py
│   │   │   ├── video.py
│   │   │   ├── websocket.py           # WebSocket handlers
│   │   │   ├── connectors_oauth.py    # Connector OAuth flows
│   │   │   └── knowledge_oauth_sync.py
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_service.py          # Claude streaming + RAG pipeline
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py    # Chunking + embedding + indexing
│   │   │   ├── search_service.py      # Hybrid search orchestration
│   │   │   ├── vector_store.py        # pgvector + Pinecone abstraction
│   │   │   └── workflow_service.py
│   │   └── core/
│   │       └── security.py            # JWT + password hashing
│   ├── alembic/                       # Database migration scripts
│   ├── tests/                         # pytest test suite
│   ├── uploads/                       # Local file storage (dev only)
│   ├── requirements.txt
│   └── seed.py                        # Database seeder (demo accounts)
│
├── infrastructure/
│   ├── terraform/                     # AWS infrastructure as code
│   │   ├── environments/              # dev / staging / production configs
│   │   └── modules/                   # vpc, eks, rds, elasticache, s3, etc.
│   └── ecs/                           # ECS task definitions
│
├── docs/
│   └── PROJECT_STATUS.md              # Feature completion tracker
│
├── .github/
│   └── workflows/
│       ├── ci-backend.yml             # Backend CI pipeline
│       ├── cd-backend.yml             # Backend CD pipeline
│       └── cd-frontend-amplify.yml    # Frontend CD to AWS Amplify
│
├── docker-compose.yml                 # Local development orchestration
├── CLAUDE.md                          # Full PRD and project spec
├── DEPLOYMENT.md                      # AWS deployment guide
└── Makefile                           # Common commands
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.12+ |
| Node.js | 18+ |
| Docker Desktop | Latest (for Redis) |
| PostgreSQL | 16+ (or Supabase project) |
| Anthropic API key | Required for AI chat |
| Google AI Studio key | Recommended (Gemini video analysis) |
| OpenAI API key | Optional (Whisper fallback) |
| Tavily API key | Optional (web search, falls back to DuckDuckGo) |

### Docker (All Services)

```bash
git clone https://github.com/your-org/Enterprise-Grade-AI-Knowledge-Copilot.git
cd Enterprise-Grade-AI-Knowledge-Copilot
cp backend/.env.example backend/.env      # Add your API keys
cp frontend/.env.example frontend/.env.local
docker-compose up -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8010 |
| Swagger UI | http://localhost:8010/docs |
| ReDoc | http://localhost:8010/redoc |

### Manual Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in required keys
alembic upgrade head            # Run migrations
python seed.py                  # Seed demo accounts
uvicorn app.main:app --reload --port 8010
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # Fill in required values
npm run build                   # Required for standalone output

# Copy static assets after every build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Start server
export $(cat .env.local | grep -v '^#' | grep '=' | xargs)
PORT=3001 node .next/standalone/server.js
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/knowledgeforge

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY=                             # openssl rand -hex 32
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# ── AI APIs ───────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...            # Required — Claude chat + agents
OPENAI_API_KEY=sk-...                   # Optional — Whisper fallback
GOOGLE_API_KEY=AIza...                  # Recommended — Gemini video processing
TAVILY_API_KEY=tvly-...                 # Optional — web search (DuckDuckGo fallback)

# ── Voice ─────────────────────────────────────────────────────────────────────
DEEPGRAM_API_KEY=                       # Real-time voice transcription
ELEVENLABS_API_KEY=                     # TTS voice synthesis

# ── Storage ───────────────────────────────────────────────────────────────────
AWS_S3_BUCKET=knowledgeforge-documents
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# ── Vector DB ─────────────────────────────────────────────────────────────────
PINECONE_API_KEY=                       # Optional — production-scale vector search
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=knowledgeforge

# ── App ───────────────────────────────────────────────────────────────────────
CORS_ORIGINS=["http://localhost:3001"]
MAX_UPLOAD_SIZE_MB=50
```

### Frontend (`frontend/.env.local`)

```env
# ── API ───────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8010
NEXT_PUBLIC_WS_URL=ws://localhost:8010

# ── Auth ──────────────────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=                        # openssl rand -hex 32

# ── Google OAuth ──────────────────────────────────────────────────────────────
# Redirect URI: http://localhost:3001/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Microsoft OAuth ───────────────────────────────────────────────────────────
# Redirect URI: http://localhost:3001/api/auth/callback/azure-ad
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common
```

---

## Demo Credentials

The backend auto-seeds two accounts on first startup (`python seed.py`). Quick-login buttons for both are available directly on the login page.

| Role | Email | Password |
|---|---|---|
| Demo User | `demo@knowledgeforge.ai` | `demo12345` |
| Super Admin | `admin@knowledgeforge.ai` | `Admin1234!` |

---

## Development Guide

### Common Commands

```bash
# Start all services
docker-compose up -d

# Backend — run tests
cd backend && pytest tests/ -v

# Backend — create a new migration
alembic revision --autogenerate -m "add_feature_x"
alembic upgrade head

# Frontend — development server
cd frontend && npm run dev

# Frontend — run unit tests
npm run test

# Frontend — run e2e tests
npm run test:e2e

# Lint all code
cd frontend && npm run lint
cd backend && ruff check app/
```

### Code Style

- **Backend**: [Ruff](https://docs.astral.sh/ruff/) for linting, Black for formatting, strict type hints throughout
- **Frontend**: ESLint + Prettier, TypeScript strict mode, component-per-file convention

### Adding a New API Endpoint

1. Define Pydantic schemas in `backend/app/schemas/`
2. Add business logic to `backend/app/services/`
3. Create or extend a router in `backend/app/routers/`
4. Register the router in `backend/app/main.py`
5. Write tests in `backend/tests/`

### Adding a New Frontend Page

1. Create a directory under `frontend/src/app/(dashboard)/your-page/`
2. Add `page.tsx` with the page component
3. Add the route to the sidebar in `frontend/src/components/layout/sidebar.tsx`

---

## API Reference

Interactive documentation is available at:

| Interface | URL |
|---|---|
| Swagger UI | http://localhost:8010/docs |
| ReDoc | http://localhost:8010/redoc |

### Endpoint Groups

| Prefix | Description |
|---|---|
| `/auth` | Login, register, token refresh, OAuth2, MFA |
| `/conversations` | Chat conversations and SSE streaming |
| `/knowledge` | Document upload, collections, connectors, video |
| `/search` | Full-text and semantic search |
| `/voice` | Voice session management, TTS, STT |
| `/meetings` | Meeting rooms, recordings, transcripts, recaps |
| `/agents` | AI agent execution (research, writing, analysis) |
| `/workflows` | Workflow automation CRUD and execution |
| `/analytics` | Usage stats, AI performance, knowledge gaps |
| `/admin` | User and system administration |
| `/billing` | Subscription management, invoices, Stripe |
| `/teams` | Team management |
| `/ws` | WebSocket endpoints (chat, voice, meetings) |

---

## OAuth Setup

### Google Sign-In

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web Application)
2. Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
3. Set OAuth consent screen to **External**
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `frontend/.env.local`
5. Rebuild the frontend

### Microsoft Sign-In

1. [portal.azure.com](https://portal.azure.com) → App registrations → New registration
2. Add redirect URI: `http://localhost:3001/api/auth/callback/azure-ad`
3. Create a client secret under Certificates & Secrets
4. Add `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID=common` to `frontend/.env.local`
5. Rebuild the frontend

---

## Video Processing

Videos are processed by **Gemini 2.0 Flash** when `GOOGLE_API_KEY` is set. Gemini understands the full video — audio, visuals, slides, on-screen text, and diagrams — and returns:

1. Timestamped verbatim transcript
2. Visual content descriptions (slides, diagrams, on-screen text)
3. Key topics list
4. Executive summary

All content is chunked and indexed into the RAG pipeline for instant retrieval in chat. If `GOOGLE_API_KEY` is not set, the system falls back to **OpenAI Whisper** (audio-only transcription).

---

## AI Agents

### Research Agent

Combines internal KB retrieval with live web search:

1. Searches the internal knowledge base (vector + full-text)
2. Runs live web search via Tavily API (DuckDuckGo fallback if no Tavily key)
3. Synthesizes both into a cited report with separate web and internal source tabs

Supports file/image/document attachments — drag-and-drop or click to attach PDFs, DOCX, CSVs, and images. Text is extracted and appended to the query context.

### Other Agents

| Agent | Best For |
|---|---|
| Writing Agent | Draft documents, emails, reports from org context |
| Data Analyst | Analyze CSV/Excel attachments, generate data insights |
| Support Agent | Answer employee questions, cite knowledge base |
| Compliance Agent | Check documents against policy rules |
| Onboarding Agent | Guide new hires through company knowledge |
| Custom Agent | Full control over behavior, tools, knowledge scope |

---

## API Keys

Generate multi-model API keys at `/api-keys`:

- Select provider(s): **Claude**, **OpenAI**, **Gemini**, **Mistral**, **Llama**
- Scope to specific models (e.g. only `claude-sonnet-4-6`)
- Set granular permissions: chat, search, agents, knowledge, analytics, admin
- Configure rate limits and key expiration

```bash
curl -X POST http://localhost:8010/v1/chat \
  -H "Authorization: Bearer kf_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4-6", "messages": [{"role": "user", "content": "Summarize our Q4 strategy"}]}'
```

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v                        # All tests
pytest tests/test_auth.py -v            # Specific module
pytest tests/ --cov=app --cov-report=html  # Coverage report
```

### Frontend

```bash
cd frontend
npm run test                            # Vitest unit tests
npm run test:e2e                        # Playwright e2e tests
npm run test:coverage                   # Coverage report
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full AWS deployment instructions including:

- ECS task definition setup
- RDS PostgreSQL provisioning
- Amplify frontend deployment
- GitHub Actions CI/CD pipeline configuration
- Environment variable management via AWS Secrets Manager

For Kubernetes / EKS deployment, see the Terraform configs in `infrastructure/terraform/` and Kubernetes manifests under `infrastructure/ecs/`.

---

## Architecture Notes

### RAG Pipeline

```
Upload → Parse → Chunk → Embed → Store (pgvector)
                                         ↓
Query → Embed → Vector Search ──────────→ Retrieve chunks
      → BM25  → Full-text Search ────────→ Rerank → Claude → SSE stream
```

1. **Ingest** — Documents are uploaded, parsed (PDF/DOCX/video/OCR), semantically chunked, and stored in `document_chunks` with pgvector embeddings
2. **Retrieve** — On each chat message: vector similarity search + PostgreSQL GIN full-text search run in parallel; results are merged and reranked
3. **Generate** — Claude `claude-sonnet-4-6` streams the response via SSE with cited source chunks

### Authentication Flow

```
Login → Backend JWT (60 min) + Refresh Token (30 days)
     → NextAuth session stores both tokens
     → 2 min before expiry → auto-refresh via stored refresh token
     → No re-login required for 30 days
```

### Performance Optimizations

| Optimization | Detail |
|---|---|
| Redis caching | Analytics (120s TTL), home stats (60s), sessions (5 min) |
| Connection pooling | SQLAlchemy pool_size=20, max_overflow=40 |
| SSE streaming | Chat responses stream token-by-token, no buffering |
| DB indexes | GIN full-text, pgvector IVFFLAT, conversation and message indexes |
| Per-doc chunk cap | Max 2 chunks per document in RAG results (prevents dominance) |
| Stop-word filtering | 40+ common words excluded from full-text ILIKE matching |

### Multi-Tenancy

Data isolation is enforced at the application layer with per-organization filtering on all database queries. Each organization gets its own Pinecone namespace for vector search isolation.

---

## Contributing

1. Fork the repository and create a feature branch from `dev`
2. Write tests for any new functionality
3. Ensure all tests pass: `pytest tests/ -v` and `npm run test`
4. Submit a pull request to `dev` (not `main`)
5. PRs to `main` trigger the CD pipeline — all PRs must pass CI

---

## License

Proprietary — KnowledgeForge. All rights reserved.
