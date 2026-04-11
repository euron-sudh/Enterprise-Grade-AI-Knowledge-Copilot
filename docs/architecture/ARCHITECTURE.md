# KnowledgeForge — System Architecture

**Version:** 1.1.0
**Last Updated:** 2026-04-11
**Status:** In Development — Deployed to AWS (ap-south-1)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema](#5-database-schema)
6. [RAG Pipeline](#6-rag-pipeline)
7. [Document Ingestion Pipeline](#7-document-ingestion-pipeline)
8. [Search Architecture](#8-search-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Real-Time Communication](#10-real-time-communication)
11. [Background Workers](#11-background-workers)
12. [AI & LLM Layer](#12-ai--llm-layer)
13. [Data Source Connectors](#13-data-source-connectors)
14. [Storage Architecture](#14-storage-architecture)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Infrastructure & Networking](#16-infrastructure--networking)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [Security](#18-security)
19. [Ports & URLs Reference](#19-ports--urls-reference)

---

## 1. System Overview

KnowledgeForge is an enterprise AI Knowledge Copilot that ingests, indexes, and reasons over organizational knowledge — documents, wikis, Slack threads, emails, meeting recordings, video content, and code repositories. Employees interact via chat, voice, and meetings to get instant, cited, context-aware answers.

### Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | PostgreSQL 16 (async via SQLAlchemy + asyncpg) |
| Cache / Queue Broker | Redis 7 |
| Vector Database | Pinecone (serverless, AWS) |
| Task Queue | Celery 5 + Redis broker |
| Primary LLM | Anthropic Claude (streaming) |
| Fallback LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Object Storage | AWS S3 |
| Auth | NextAuth.js 4 (frontend) + JWT (backend) |
| Deployment | AWS Amplify (frontend) + ECS Fargate (backend) |
| IaC | Terraform modules + ECS task definitions |

---

## 2. High-Level Architecture

![KnowledgeForge System Architecture](./system-architecture.png)

```
+----------------------------------------------------------------+
—                         INTERNET                               —
+----------------------------------------------------------------+
             —                                  —
             ?                                  ?
+------------------------+       +------------------------------+
—   AWS Amplify (SSR)    —       —     Application Load         —
—   Next.js Frontend     —       —     Balancer (ALB)           —
—   Port 3000            —       —                              —
—                        —       +------------------------------+
—  dev.d2dg07mc33522q.   —                  —
—  amplifyapp.com        —                  ?
—                        —       +------------------------------+
—  /api/backend/* -------+------?—  ECS Fargate                 —
—  (rewrite proxy)       —       —  FastAPI Backend              —
+------------------------+       —  Port 8000, 2 workers        —
                                 +------------------------------+
                                        —   —   —   —
               +------------------------+   —   —   +------------------+
               —                            —   —                      —
               ?                            ?   ?                      ?
+------------------+  +--------------+ +------------+  +-------------------+
—  RDS PostgreSQL  —  —  ElastiCache — — S3 Bucket  —  — External APIs     —
—  (asyncpg, SSL)  —  —  Redis 7     — — (documents)—  — — Anthropic Claude—
—                  —  —              — —            —  — — OpenAI          —
—  Pool: 10+20    —  —  Sessions,   — — Presigned  —  — — Pinecone        —
—                  —  —  Celery      — — URLs for   —  — — Deepgram (STT)  —
—  5 model files   —  —  broker      — — uploads    —  — — Google Gemini   —
—  13 tables       —  —              — —            —  — — Stripe          —
+------------------+  +--------------+ +------------+  — — Tavily Search   —
                                                       +-------------------+
                        +--------------------------+
                        —  Celery Workers           —
                        —  (4 concurrency)          —
                        —                           —
                        —  — Document ingestion     —
                        —  — Embedding generation   —
                        —  — Video processing       —
                        —  — Connector sync (hourly)—
                        —  — Cleanup (daily)        —
                        +--------------------------+
```

---

## 3. Frontend Architecture

### Framework & Rendering

- **Next.js 14** with App Router and `force-dynamic` rendering (all pages SSR on demand)
- **Turbopack** for dev builds
- All dashboard routes are protected via `next-auth/middleware`

### Route Structure

```
src/app/
+-- (auth)/                    # Unauthenticated: login, register, forgot-password, SSO
—   +-- layout.tsx             # Minimal layout (no sidebar)
+-- (dashboard)/               # Authenticated routes — all protected by middleware
—   +-- layout.tsx             # Sidebar + Topbar layout
—   +-- home/                  # Main dashboard
—   +-- chat/                  # AI chat (core feature)
—   +-- knowledge-base/        # Document management + connectors
—   +-- search/                # Enterprise semantic search
—   +-- voice/                 # Voice assistant
—   +-- video/                 # Video library + upload
—   +-- meetings/              # Meeting rooms + recaps
—   +-- agents/                # AI agents marketplace
—   +-- workflows/             # Automation builder
—   +-- analytics/             # Usage & AI performance metrics
—   +-- admin/                 # User/org/role management
—   +-- teams/                 # Team management
—   +-- profile/               # User settings
—   +-- notifications/         # Notification center
—   +-- playground/            # AI prompt playground
—   +-- api-keys/              # API key management
+-- (marketing)/               # Public pages: about, blog, docs, pricing, etc.
+-- api/
—   +-- auth/[...nextauth]/    # NextAuth route handler
—   +-- backend/:path*/        # Proxy rewrite ? FastAPI backend
—   +-- health/                # Frontend health check
+-- providers.tsx              # React Query + Session + Theme context
```

### State Management

| Store | Library | Purpose |
|-------|---------|---------|
| `chatStore` | Zustand | Active conversation, messages, streaming state |
| `knowledgeStore` | Zustand | Documents, collections, connectors |
| `voiceStore` | Zustand | Voice recording, playback, transcript |
| `uiStore` | Zustand | Sidebar toggle, modals, theme |
| `workflowStore` | Zustand | Workflow editor canvas state |
| Server state | TanStack Query v5 | API data fetching, caching, mutations |

### Key Component Groups

| Directory | Components |
|-----------|-----------|
| `ui/` | Button, Input, Modal, Card, Badge, Avatar, Tabs, Spinner, CommandPalette |
| `chat/` | ChatInterface, ConversationList, MessageInput, MessageList, SourceCitationPanel |
| `layout/` | Sidebar, Topbar, Header, CommandPalette, NotificationProvider, SessionSync |
| `knowledge/` | DocumentUpload, ConnectorCard, GoogleDriveConnectModal, GitHubConnectModal, GlobalFileDropOverlay |
| `voice/` | VoiceAssistant, AudioWaveform |
| `analytics/` | MetricsGrid, UsageChart |
| `search/` | SearchInterface |

### API Client Layer

All backend communication flows through `src/lib/api/token.ts`:

```
authFetch(url, options, token, user, config)
  +-- resolveFetchUrl(url, preferDirectBackend?)
       +-- preferDirectBackend=true ? NEXT_PUBLIC_API_URL directly (bypasses Lambda)
       +-- default ? /api/backend/* ? Next.js rewrite ? backend
  +-- fetchWithFallback(primaryUrl, options)
       +-- Try primary URL
       +-- If 5xx ? retry against direct backend URL
```

Domain-specific clients in `src/lib/api/`: `auth.ts`, `chat.ts`, `knowledge.ts`, `search.ts`, `voice.ts`, `meetings.ts`, `analytics.ts`, `workflows.ts`, `admin.ts`

### Key Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.29 | Framework |
| react | 18.2 | UI library |
| next-auth | 4.24 | Authentication (OAuth + credentials) |
| @tanstack/react-query | 5.24 | Data fetching & caching |
| zustand | 4.5 | Client state management |
| socket.io-client | 4.7 | WebSocket real-time |
| tailwindcss | 3.4 | Styling |
| framer-motion | 11.0 | Animations |
| @tiptap/* | 2.2 | Rich text editor |
| recharts | 2.12 | Charts & analytics |
| react-markdown + rehype-highlight + react-katex | — | Markdown/code/math rendering |
| zod | 3.22 | Schema validation |
| axios | 1.6 | HTTP client |

---

## 4. Backend Architecture

### Framework

- **FastAPI** with async/await throughout
- **Uvicorn** ASGI server (2 workers, port 8000)
- **Middleware:** CORS (configurable origins), GZip (min 1000 bytes)
- **Auto-migration:** Alembic `upgrade head` runs on startup; falls back to `create_all` on failure
- **Auto-seed:** Creates demo and admin users on first boot

### Configuration (`app/config.py`)

Pydantic-settings with `.env` file loading. Key properties:

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...localhost:5432/knowledgeforge` | Async PG connection |
| `REDIS_URL` | `redis://localhost:6379` | Cache + Celery broker |
| `AWS_S3_BUCKET` | *(empty)* | S3 bucket for file storage |
| `AWS_S3_REGION` | `ap-south-1` | S3 region |
| `PINECONE_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `PINECONE_EMBEDDING_DIMENSION` | `1536` | Vector dimensions |
| `CORS_ORIGINS` | `localhost:3000,3001,3002` | Allowed CORS origins |
| `MAX_UPLOAD_SIZE_MB` | `50` | Upload size limit |

Feature flags computed from env:
- `has_s3` ? `bool(AWS_S3_BUCKET)` — works with ECS IAM roles (no explicit keys needed)
- `has_anthropic_key`, `has_tavily_key`, `has_google_key`, `has_google_search`, `has_stripe`, `has_smtp`

### Router Map (16 routers)

| Router | Prefix | Key Endpoints |
|--------|--------|--------------|
| **Auth** | `/auth` | `/register`, `/login`, `/refresh`, `/me`, `/mfa/setup`, `/mfa/verify` |
| **Conversations** | — | `/conversations`, `/conversations/{id}/messages` (SSE streaming) |
| **Knowledge** | `/knowledge` | `/documents/upload`, `/documents/presigned-upload`, `/documents/register-s3`, `/connectors`, `/collections` |
| **Search** | — | `/search` (hybrid semantic + keyword) |
| **Analytics** | `/analytics` | `/dashboard`, `/usage`, `/ai-performance` |
| **Voice** | `/voice` | `/sessions`, `/transcribe`, WebSocket STT |
| **Meetings** | `/meetings` | CRUD, `/join`, `/record`, `/transcript`, `/recap` |
| **Agents** | `/agents` | CRUD, `/execute`, `/templates` |
| **Workflows** | `/workflows` | CRUD, `/execute`, `/runs` |
| **Admin** | `/admin` | `/users`, `/roles`, `/audit-logs`, `/system-health` |
| **Teams** | `/teams` | CRUD, member management |
| **Billing** | — | `/billing/subscription`, `/billing/plans`, Stripe webhooks |
| **WebSocket** | — | `/ws/chat/{conversation_id}`, `/ws/notifications` |
| **Video** | — | `/knowledge/videos/upload`, streaming |
| **Connectors OAuth** | — | `/connectors/oauth/{provider}/start`, `/callback` |
| **Knowledge OAuth Sync** | — | Background sync orchestration for OAuth connectors |

### Service Layer

| Service | File | Responsibility |
|---------|------|---------------|
| `ai_service` | `services/ai_service.py` | LLM streaming, RAG retrieval, web search augmentation |
| `document_service` | `services/document_service.py` | File upload, text extraction, chunking, Pinecone vectorization |
| `vector_store` | `services/vector_store.py` | Pinecone client (singleton), embed, upsert, query |
| `search_service` | `services/search_service.py` | Hybrid search orchestration, query logging |
| `auth_service` | `services/auth_service.py` | JWT management, password hashing |
| `workflow_service` | `services/workflow_service.py` | Workflow execution engine |

### Core Modules

| Module | Purpose |
|--------|---------|
| `core/security.py` | JWT encode/decode (python-jose), password hashing (passlib+bcrypt), TOTP MFA |
| `core/storage.py` | Storage abstraction — `LocalStorage` (disk) vs `S3Storage` (boto3). Auto-selects by `AWS_S3_BUCKET`. Presigned URLs for S3. |

### Dependency Injection (`app/dependencies.py`)

| Dependency | Description |
|-----------|-------------|
| `get_db()` | Async SQLAlchemy session with auto-commit/rollback |
| `get_current_user()` | JWT from `Authorization: Bearer` header or `?token=` query param |
| `get_optional_user()` | Non-required auth variant |
| `check_storage_limit()` | Plan-based upload size enforcement |

---

## 5. Database Schema

**Engine:** PostgreSQL 16 via SQLAlchemy 2.0 async (asyncpg driver)
**Pool:** `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`
**Migrations:** Alembic (auto-run on startup)
**SSL:** Enabled in production via `DATABASE_SSL=true`

### Entity-Relationship Diagram

```
+------------------+     +----------------------+
—      users       —     —      invites          —
—------------------—     —----------------------—
— id (UUID PK)     —?--+ — id, token, email     —
— email (unique)   —   — — role, created_by_id   —
— name             —   — — used_by_id, expires_at—
— hashed_password  —   — +----------------------+
— role (enum)      —   —
— is_active        —   — +----------------------+
— mfa_enabled      —   — —   refresh_tokens     —
— stripe_*         —   — —----------------------—
— subscription_*   —   +-— user_id (FK)         —
— created_at       —     — token (128 chars)     —
+------------------+     — expires_at, revoked   —
       —                 +----------------------+
       —
       — user_id FK on all tables below
       —
       +----------------------------------------------+
       —                                              —
       ?                                              ?
+------------------+                       +----------------------+
—  conversations   —                       —    collections       —
—------------------—                       —----------------------—
— id, user_id      —                       — id, user_id          —
— title, model     —                       — name, description    —
— is_pinned        —                       — color (default       —
— is_shared        —                       —   #6366f1)           —
— share_token      —                       +----------------------+
— message_count    —                                  —
— tags (ARRAY)     —                                  —
+------------------+                                  —
       —                                              —
       ?                                              ?
+------------------+                       +----------------------+
—    messages      —                       —     documents        —
—------------------—                       —----------------------—
— id               —                       — id, user_id          —
— conversation_id  —                       — collection_id (FK)   —
— role (enum)      —                       — name, original_name  —
— content (Text)   —                       — file_path            —
— model            —                       — duplicate_key (idx)  —
— sources (JSONB)  —                       — file_type, file_size —
— feedback_rating  —                       — status (enum):       —
— feedback_comment —                       —  processing/indexed/ —
— token_count      —                       —  failed              —
— processing_time  —                       — page_count           —
+------------------+                       — word_count           —
                                           — tags (ARRAY)         —
                                           +----------------------+
                                                      —
                                                      ?
                                           +----------------------+
                                           —  document_chunks     —
                                           —----------------------—
                                           — id                   —
                                           — document_id (FK)     —
                                           — content (Text)       —
                                           — chunk_index          —
                                           — token_count          —
                                           +----------------------+

+------------------+    +------------------+    +----------------------+
—   connectors     —    —  saved_searches  —    —      meetings        —
—------------------—    —------------------—    —----------------------—
— id, user_id      —    — id, user_id      —    — id, user_id          —
— type, name       —    — name, query      —    — title, status        —
— status (enum):   —    — filters (JSONB)  —    — scheduled_at         —
—  connected/      —    +------------------+    — recording_url        —
—  disconnected/   —                            — transcript_url       —
—  syncing/error   —    +------------------+    — recap (JSONB)        —
— config (JSONB)   —    —   search_logs    —    — action_items (JSONB) —
— last_sync_at     —    —------------------—    — participants (JSONB) —
— document_count   —    — user_id, query   —    +----------------------+
+------------------+    — result_count     —
                        — took_ms          —
                        +------------------+

+------------------+    +----------------------+
—    workflows     —    —   workflow_runs       —
—------------------—    —----------------------—
— id, user_id      —    — id, workflow_id       —
— name, description—    — user_id               —
— trigger_type:    —    — status (enum):        —
—  manual/schedule/—    —  running/success/     —
—  document_upload/—    —  failed               —
—  event/webhook   —    — trigger_data (JSONB)  —
— trigger_config   —    — step_results (JSONB)  —
— steps (JSONB)    —    — error                 —
— status, run_count—    — started_at            —
+------------------+    +----------------------+
```

### User Roles (Enum)

| Role | Level |
|------|-------|
| `super_admin` | Platform-wide admin (seeded: `admin@knowledgeforge.ai`) |
| `admin` | Organization admin (seeded: `demo@knowledgeforge.ai`) |
| `team_admin` | Team-level admin |
| `member` | Standard user |
| `viewer` | Read-only |
| `guest` | Limited access |

---

## 6. RAG Pipeline

The Retrieval-Augmented Generation pipeline is the core intelligence of the system.

```
User Query
    —
    ?
+---------------------------------------------------+
—  1. QUERY ANALYSIS                                —
—  — Strip stop words                               —
—  — Detect connector type ("from github",          —
—    "emails", etc.)                                 —
—  — Detect inventory queries ("how many docs")     —
—  — Detect recency queries ("latest", "recent")    —
+---------------------------------------------------+
                        —
                        ?
+---------------------------------------------------+
—  2. RETRIEVAL — _search_relevant_chunks()         —
—                                                   —
—  Priority 1: Pinecone Semantic Search             —
—  +-- Embed query ? text-embedding-3-small         —
—  +-- Query Pinecone (namespace=user_id)           —
—  +-- Optional type filter ($in operator)          —
—  +-- top_k = limit * 2                            —
—  +-- Max 2 chunks per document                    —
—  +-- Return if results found                      —
—                                                   —
—  Priority 2: PostgreSQL Keyword Search (fallback) —
—  +-- ILIKE '%keyword%' on chunk content           —
—  +-- ILIKE on document name                       —
—  +-- Score by keyword match ratio                 —
—  +-- Max 2 chunks per document                    —
—                                                   —
—  Priority 3: Recent Documents (last resort)       —
—  +-- Latest documents by created_at DESC          —
—  +-- 1 chunk per document, score 0.2              —
+---------------------------------------------------+
                        —
                        ?
+---------------------------------------------------+
—  3. WEB SEARCH AUGMENTATION (optional)            —
—                                                   —
—  Triggered when:                                  —
—  — Time-sensitive keywords ("latest", "news")     —
—  — KB returned 0 chunks                           —
—  — All chunks scored = 0.4 (filler only)          —
—                                                   —
—  Providers (priority order):                      —
—  1. Tavily API (if TAVILY_API_KEY set)            —
—  2. Google Custom Search (if keys set)            —
+---------------------------------------------------+
                        —
                        ?
+---------------------------------------------------+
—  4. LLM GENERATION (streaming SSE)                —
—                                                   —
—  Primary: Anthropic Claude (streaming)            —
—  Fallback: OpenAI GPT-4o-mini                     —
—  Last resort: Mock canned responses               —
—                                                   —
—  System prompt includes:                          —
—  — Role: "AI knowledge assistant"                 —
—  — Document inventory summary                     —
—  — Retrieved context chunks                       —
—  — Web search results (if any)                    —
—  — Citation instruction                           —
—                                                   —
—  SSE stream events:                               —
—  1. {"type": "sources", "data": [...]}            —
—  2. {"type": "delta", "data": "..."}  (repeated)  —
—  3. {"type": "done", "data": {message_id}}        —
+---------------------------------------------------+
```

---

## 7. Document Ingestion Pipeline

```
+--------------------------------------------------------------+
—                     UPLOAD PATHS                             —
—                                                              —
—  Path A: Presigned S3 URL (production — bypasses Lambda)     —
—  +---------+  GET /presigned-upload  +---------+            —
—  — Browser —--------------------------— Backend —            —
—  —         —?--- {uploadUrl, s3Key} --—         —            —
—  —         —                         +---------+            —
—  —         —  PUT (file body)        +---------+            —
—  —         —-------------------------—   S3    —            —
—  —         —?--- 200 OK ------------— Bucket  —            —
—  —         —                         +---------+            —
—  —         —  POST /register-s3      +---------+            —
—  —         —--------------------------— Backend —            —
—  +---------+                         — (fetch  —            —
—                                      — from S3)—            —
—  Path B: Direct Multipart (fallback / local dev)             —
—  +---------+  POST /documents/upload +---------+            —
—  — Browser —--------------------------— Backend —            —
—  +---------+                         +---------+            —
+--------------------------------------------------------------+
                           —
                           ?
                 document_service.upload_documents()
                           —
              +-------------------------+
              —  For each file:         —
              —  1. Read content        —
              —  2. Check max size      —
              —  3. Deduplicate (hash)  —
              —  4. Save to disk/S3     —
              —  5. Create Document row —
              —  6. process_document()  —
              +-------------------------+
                           —
                           ?
                  process_document()
                           —
              +-------------------------+
              —  1. Extract text        —
              —     +-- PDF (PyPDF2)    —
              —     +-- DOCX            —
              —     +-- XLSX (openpyxl) —
              —     +-- PPTX            —
              —     +-- Images (Claude  —
              —     —   Haiku Vision)   —
              —     +-- CSV, MD, HTML   —
              —     +-- Plain text      —
              —                         —
              —  2. Chunk text          —
              —     500 tokens/chunk    —
              —     50 token overlap    —
              —     Sentence-boundary   —
              —     aware               —
              —                         —
              —  3. Create DocumentChunk—
              —     records in PG       —
              —                         —
              —  4. Upsert to Pinecone  —
              —     (if enabled)        —
              —     Namespace: user_id  —
              —     Batch: 100 vectors  —
              —                         —
              —  5. Update document     —
              —     status ? "indexed"  —
              +-------------------------+
```

### Supported File Types

| Format | Parser | Notes |
|--------|--------|-------|
| PDF | PyPDF2 | Page-by-page text extraction |
| DOCX | python-docx | Paragraph extraction |
| XLSX | openpyxl | Sheet ? row ? cell extraction |
| PPTX | python-pptx | Slide text extraction |
| Images (PNG, JPG, GIF, WebP) | Anthropic Claude Haiku Vision API | AI-generated description |
| Video/Audio | Google Gemini 2.0 Flash ? OpenAI Whisper fallback | Transcript + analysis |
| CSV, TSV | Built-in | Row-based parsing |
| Markdown, HTML, TXT | Built-in/BeautifulSoup | Direct text extraction |

### Duplicate Detection

Documents are deduplicated using a `duplicate_key` computed from `SHA256(user_id + filename + file_size)`. On collision, the existing document's chunks are deleted and re-created (upsert behavior).

---

## 8. Search Architecture

### Hybrid Search

```
User Query
    —
    +--? Pinecone Semantic Search
    —    — Embed query via text-embedding-3-small
    —    — Query namespace=user_id
    —    — Score by cosine similarity
    —
    +--? PostgreSQL Keyword Search
    —    — ILIKE on document_chunks.content
    —    — ILIKE on documents.name
    —
    +--? Merge & Rank
         — Combined results sorted by score
         — Deduplicated by document_id
         — Logged to search_logs table
```

### Search Features

- **Autocomplete:** Trending queries (from search_logs aggregation)
- **Saved searches:** User can bookmark queries with filters
- **Faceted filters:** Source type, date range, document type
- **Query logging:** All searches logged for analytics (query, result_count, took_ms)

---

## 9. Authentication & Authorization

### Auth Flow

```
+-----------------------------------------------+
—              FRONTEND (NextAuth.js)            —
—                                               —
—  Providers:                                   —
—  — CredentialsProvider ? POST /auth/login     —
—  — GoogleProvider (OAuth2)                    —
—  — AzureADProvider (OAuth2)                   —
—                                               —
—  Session: JWT strategy (no DB sessions)       —
—  Token: Stored in secure HTTP-only cookie     —
+-----------------------------------------------+
                    — accessToken in
                    — Authorization: Bearer header
                    ?
+-----------------------------------------------+
—              BACKEND (FastAPI)                 —
—                                               —
—  JWT Verification:                            —
—  — Algorithm: HS256                           —
—  — Claims: sub (user_id), exp                 —
—  — Access token: 60 min default               —
—  — Refresh token: 30 days                     —
—                                               —
—  MFA (optional):                              —
—  — TOTP via pyotp                             —
—  — QR code generation                         —
—  — Backup codes (JSON array)                  —
—                                               —
—  Password:                                    —
—  — Hashing: passlib + bcrypt                  —
—  — Reset: Secure token flow                   —
+-----------------------------------------------+
```

### Role-Based Access Control

| Role | Permissions |
|------|-----------|
| `super_admin` | Full platform access, user management, system config |
| `admin` | Organization admin, invite/manage users, billing |
| `team_admin` | Manage team members, team-scoped resources |
| `member` | Full knowledge base access, chat, search, upload |
| `viewer` | Read-only access to shared resources |
| `guest` | Limited access to shared conversations/documents |

### Pre-seeded Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@knowledgeforge.ai` | `Admin@123` | super_admin |
| `demo@knowledgeforge.ai` | `Demo@123` | admin |

---

## 10. Real-Time Communication

### WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ws/chat/{conversation_id}` | Real-time chat message streaming |
| `/ws/notifications` | Push notifications to connected clients |

### SSE (Server-Sent Events)

Chat responses are streamed via SSE through the REST endpoint `POST /conversations/{id}/messages`:

```
Event stream:
  data: {"type": "sources", "data": [{...citations}]}
  data: {"type": "delta", "data": "partial response text"}
  data: {"type": "delta", "data": "more text..."}
  data: {"type": "done", "data": {"message_id": "uuid"}}
```

### Client-Side

- `socket.io-client` for WebSocket connections
- Custom `useWebSocket` hook with auto-reconnect
- `useChat` hook manages streaming state

---

## 11. Background Workers

### Celery Configuration

| Setting | Value |
|---------|-------|
| Broker | Redis |
| Result backend | Redis |
| Concurrency | 4 workers |
| Soft time limit | 600s (10 min) |
| Hard time limit | 660s (11 min) |
| Serializer | JSON |

### Periodic Tasks (Celery Beat)

| Task | Schedule | Description |
|------|----------|-------------|
| `sync-connectors-hourly` | Every 3600s | Sync all connected data source connectors |
| `cleanup-daily` | Every 86400s | Clean up stale sessions, temp files, old logs |

### Task Modules

| Module | Tasks |
|--------|-------|
| `workers/tasks/ingestion.py` | Document processing jobs |
| `workers/tasks/embedding.py` | Batch embedding generation |
| `workers/tasks/video_processing.py` | Video transcription + analysis |
| `workers/tasks/notifications.py` | Email/push notification delivery |
| `workers/tasks/sync.py` | Connector sync orchestration |
| `workers/tasks/cleanup.py` | Stale data cleanup |

### Docker Compose Services (local dev)

```yaml
services:
  redis:         # Redis 7 Alpine — port 6379
  celery-worker: # 4 concurrency
  celery-beat:   # Periodic scheduler
  flower:        # Monitoring UI on port 5555 (opt-in: --profile monitoring)
```

---

## 12. AI & LLM Layer

### Provider Hierarchy

```
+---------------------------------------------+
—              AI Provider Stack              —
—                                             —
—  1. Anthropic Claude (primary)              —
—     — Streaming via anthropic SDK           —
—     — Used for: chat, meeting recaps,       —
—       image analysis (Claude Haiku Vision)  —
—                                             —
—  2. OpenAI GPT-4o-mini (fallback)           —
—     — Used when ANTHROPIC_API_KEY missing   —
—     — Also provides embeddings              —
—       (text-embedding-3-small)              —
—                                             —
—  3. Google Gemini 2.0 Flash                 —
—     — Video understanding (multimodal)      —
—     — Transcript + visual + summary         —
—                                             —
—  4. OpenAI Whisper                          —
—     — Audio-only fallback for video         —
—                                             —
—  5. Mock Mode (no API keys)                 —
—     — Canned responses by topic detection   —
—     — Allows UI development without costs   —
+---------------------------------------------+
```

### Embedding & Vector Store

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` (OpenAI) |
| Dimensions | 1536 |
| Vector DB | Pinecone (serverless, AWS, cosine metric) |
| Namespace strategy | Per-user (`str(user_id)`) |
| Batch size | 100 vectors per upsert |
| Auto-create index | Yes (if missing) |

### Web Search Augmentation

When the knowledge base doesn't have a strong answer:

1. **Tavily Search API** (preferred if `TAVILY_API_KEY` set)
2. **Google Custom Search API** (fallback if `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` set)

Triggered when:
- Query contains time-sensitive keywords ("latest", "news", "today")
- KB returned zero results
- All KB results scored = 0.4

---

## 13. Data Source Connectors

### Supported Connectors

| Connector | Auth Type | Sync Method |
|-----------|-----------|-------------|
| **Google Drive** | OAuth2 (Google) | Files API, incremental sync |
| **Gmail** | OAuth2 (Google) | Messages + attachments |
| **GitHub** | OAuth2 (GitHub) | Repos ? tree ? file content, paginated |
| **Slack** | Token-based | Conversations + messages |
| **Notion** | Token-based | Pages + blocks |
| **Confluence** | Token-based | Spaces + pages |
| **GitLab** | Token-based | Repos, issues, wikis |
| **Jira** | Token-based | Issues + comments |
| **Salesforce** | Token-based | Records + attachments |

### Sync Architecture

```
Celery Beat (hourly)
    —
    ?
sync-connectors-hourly task
    —
    +--? For each connector where status='connected':
    —    —
    —    +-- Check if sync is stale (> 30 min since last)
    —    +-- Set status ? 'syncing'
    —    +-- Fetch content from source API
    —    +-- Deduplicate (upsert by duplicate_key)
    —    +-- Create Document + DocumentChunk records
    —    +-- Upsert to Pinecone vector store
    —    +-- Update connector.document_count
    —    +-- Set status ? 'connected'
    —
    +-- On error: status ? 'error', log diagnostics
```

### OAuth Connectors Flow

```
Frontend                    Backend                     Provider
   —                           —                           —
   —  Click "Connect Google"   —                           —
   —--------------------------?—                           —
   —                           —  GET /connectors/oauth/   —
   —                           —  google_drive/start       —
   —                           —--------------------------?—
   —?--redirect to Google---------------------------------—
   —                           —                           —
   —--consent + authorize---------------------------------?—
   —                           —                           —
   —  /callback?code=xxx       —                           —
   —--------------------------?—  Exchange code for token  —
   —                           —--------------------------?—
   —                           —?--access_token + refresh--—
   —                           —                           —
   —                           —  Store in connector.config—
   —                           —  Trigger background sync  —
   —?-- "Connected" ----------—                           —
```

---

## 14. Storage Architecture

### Dual-Mode Storage

| Mode | Condition | Behavior |
|------|-----------|----------|
| **S3** | `AWS_S3_BUCKET` is set | Files uploaded via presigned URL ? browser PUT ? S3. Backend fetches from S3 for processing. |
| **Local** | No S3 config | Files saved to `uploads/` directory (ephemeral on ECS — lost on redeploy) |

### S3 Configuration (Production)

| Setting | Value |
|---------|-------|
| Bucket | `knowledgeforge-documents-prod` |
| Region | `ap-south-1` |
| Key pattern | `uploads/{user_id}/{uuid}_{filename}` |
| Presigned URL expiry | 600 seconds (10 min) |
| CORS | Allows PUT/POST/GET/HEAD from Amplify domain |
| Signature | SigV4 (required for ap-south-1) |

### Video Storage

Videos are uploaded directly to the backend (not presigned) using `preferDirectBackend: true` in `authFetch()` to bypass the Amplify Lambda body limit. Stored locally at `uploads/videos/` and transcribed via Gemini/Whisper.

---

## 15. Deployment Architecture

### Production Environment

```
+-------------------------------------------------------------+
—                    AWS ap-south-1                            —
—                                                             —
—  +-----------------------------------------------------+    —
—  —                  VPC                                —    —
—  —                                                     —    —
—  —  +-- Public Subnets --------------------------+     —    —
—  —  —  — ALB (Application Load Balancer)         —     —    —
—  —  —  — NAT Gateway                             —     —    —
—  —  +--------------------------------------------+     —    —
—  —                                                     —    —
—  —  +-- Private Subnets -------------------------+     —    —
—  —  —  — ECS Fargate (backend, 1 vCPU, 2GB RAM)  —     —    —
—  —  —  — RDS PostgreSQL 16 (SSL enabled)         —     —    —
—  —  —  — ElastiCache Redis 7                     —     —    —
—  —  +--------------------------------------------+     —    —
—  +-----------------------------------------------------+    —
—                                                             —
—  +---------------------+  +----------------------------+    —
—  —  AWS Amplify        —  —  S3                        —    —
—  —  (SSR Lambda)       —  —  knowledgeforge-documents  —    —
—  —  Next.js Frontend   —  —  -prod                     —    —
—  +---------------------+  +----------------------------+    —
—                                                             —
—  +---------------------+  +----------------------------+    —
—  —  ECR                —  —  Secrets Manager           —    —
—  —  Container Registry —  —  All secrets injected into —    —
—  —                     —  —  ECS task at runtime       —    —
—  +---------------------+  +----------------------------+    —
—                                                             —
—  +---------------------+                                    —
—  —  CloudWatch Logs    —                                    —
—  —  /ecs/knowledgeforge—                                    —
—  —  -backend-prod      —                                    —
—  +---------------------+                                    —
+-------------------------------------------------------------+
```

### ECS Task Definition

| Setting | Value |
|---------|-------|
| Launch type | Fargate |
| CPU | 1024 (1 vCPU) |
| Memory | 2048 MB |
| Network mode | awsvpc |
| Container port | 8000 |
| Health check | `HTTP GET /health` every 30s |
| Image | `971037436717.dkr.ecr.ap-south-1.amazonaws.com/knowledgeforge-backend-prod:latest` |
| Log driver | awslogs ? `/ecs/knowledgeforge-backend-prod` |

### Secrets (AWS Secrets Manager)

All sensitive configuration injected via `valueFrom` in the ECS task definition:

`DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SLACK_CLIENT_SECRET`, `NOTION_CLIENT_SECRET`

### Amplify Build (Frontend)

```yaml
# amplify.yml
build:
  commands:
    - echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.production
    - echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env.production
    # ... other server-side vars
    - npm ci
    - npm run build
artifacts:
  baseDirectory: .next
  files: ['**/*']
```

### Deployment Flow

```
Developer
    —
    +-- git push origin dev
    —
    +--? Amplify auto-detects push ? builds + deploys frontend
    —
    +--? Manual backend deploy:
         1. docker build --platform linux/amd64 -t ECR_URI .
         2. docker push ECR_URI
         3. aws ecs update-service --force-new-deployment
         4. Alembic migrations run automatically on container start
```

---

## 16. Infrastructure & Networking

### Terraform Modules

| Module | Resources |
|--------|----------|
| `vpc/` | VPC, public/private subnets, NAT Gateway, IGW |
| `rds/` | PostgreSQL 16 instance |
| `elasticache/` | Redis cluster |
| `s3/` | S3 buckets + CORS configuration |
| `ecr/` | Container registries |
| `alb/` | Application Load Balancer |
| `acm/` | SSL certificates |
| `route53/` | DNS zones |
| `waf/` | WAF rules |
| `secrets/` | Secrets Manager |
| `monitoring/` | CloudWatch alarms + SNS |
| `iam/` | IAM roles & policies |
| `backup/` | Backup plans |
| `ses/` | Email sending |

### IAM Roles

| Role | Permissions |
|------|-----------|
| **Execution Role** | ECR pull, Secrets Manager read, CloudWatch Logs write |
| **Task Role** | S3 (get, put, delete objects), SES send email |

---

## 17. Monitoring & Observability

### Current Setup

| Component | Tool |
|-----------|------|
| Logs | AWS CloudWatch (`/ecs/knowledgeforge-backend-prod`) |
| Health checks | HTTP `/health`, `/health/ready`, `/health/live` |
| Worker monitoring | Celery Flower (port 5555, local only) |

### Health Endpoints

| Endpoint | Checks |
|----------|--------|
| `GET /health` | Basic liveness |
| `GET /health/ready` | PostgreSQL connection + Redis ping |
| `GET /health/live` | Container liveness |

### Application Logging

- **Format:** Structured with timestamp, module, level, message
- **Level:** INFO by default
- **Key events logged:**
  - Document upload/indexing/failure
  - Pinecone upsert success/failure
  - Connector sync progress + diagnostics
  - Presigned URL generation
  - RAG retrieval path (Pinecone vs keyword vs fallback)

---

## 18. Security

### Transport

- TLS everywhere in production (ALB terminates SSL)
- Database SSL enabled (`DATABASE_SSL=true`)
- S3 presigned URLs expire in 10 minutes

### Application Security

| Control | Implementation |
|---------|---------------|
| CORS | Configurable allowed origins |
| XSS | `X-Content-Type-Options: nosniff` |
| Clickjacking | `X-Frame-Options: DENY` |
| Referrer | `strict-origin-when-cross-origin` |
| Password hashing | bcrypt via passlib |
| JWT | HS256, 60-min access / 30-day refresh |
| MFA | TOTP (pyotp) with backup codes |
| Input validation | Pydantic models on all endpoints |
| File upload | Size limit (50MB), type whitelist |

### Secrets Management

- **Production:** All secrets in AWS Secrets Manager, injected into ECS tasks at runtime
- **Local dev:** `.env` files (gitignored)
- **No hardcoded secrets** in code or task definitions (only ARN references)

---

## 19. Ports & URLs Reference

### Local Development

| Service | Port | URL |
|---------|------|-----|
| Frontend (Next.js) | 3000 | `http://localhost:3000` |
| Backend (FastAPI) | 8000 | `http://localhost:8000` |
| Redis | 6379 | `redis://localhost:6379` |
| PostgreSQL | 5432 | `postgresql://localhost:5432/knowledgeforge` |
| Celery Flower | 5555 | `http://localhost:5555` |

### Production

| Service | URL |
|---------|-----|
| Frontend | `https://dev.d2dg07mc33522q.amplifyapp.com` |
| Backend | ECS Fargate behind ALB (internal) |
| Frontend ? Backend proxy | `/api/backend/*` rewrites to `NEXT_PUBLIC_API_URL` |
| S3 Documents | `s3://knowledgeforge-documents-prod` |
| CloudWatch Logs | `/ecs/knowledgeforge-backend-prod` |

### API Base Paths

| Prefix | Description |
|--------|-------------|
| `/auth/*` | Authentication endpoints |
| `/knowledge/*` | Document & connector management |
| `/conversations/*` | Chat conversations & messages |
| `/search` | Hybrid search endpoint |
| `/analytics/*` | Usage & performance metrics |
| `/voice/*` | Voice assistant endpoints |
| `/meetings/*` | Meeting management |
| `/agents/*` | AI agent management |
| `/workflows/*` | Workflow automation |
| `/admin/*` | Admin panel endpoints |
| `/teams/*` | Team management |
| `/billing/*` | Subscription & payment |
| `/ws/*` | WebSocket endpoints |
| `/health/*` | Health checks |
