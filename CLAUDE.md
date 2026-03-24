# PROJECT 8: Enterprise-Grade AI Knowledge Copilot

## Product Requirements Document (PRD)

**Project Name:** KnowledgeForge AI Copilot
**Version:** 1.0.0
**Status:** In Development
**Last Updated:** 2026-03-16
**Deployment Target:** AWS (Fully Autonomous — Zero Human Intervention)

---

## 1. Executive Summary

KnowledgeForge is an enterprise-grade AI Knowledge Copilot that serves as a company-wide AI brain. Employees interact with it via **chat**, **voice**, and **meetings/video**. It ingests, indexes, and reasons over every piece of organizational knowledge — documents, wikis, Slack threads, emails, meeting recordings, video content, codebases, and databases — then provides instant, cited, context-aware answers through multiple modalities.

**Target Market:** Enterprises (500+ employees), consulting firms, SaaS companies, legal firms, healthcare organizations, financial institutions.

**Core Value Proposition:** Eliminate information silos. Reduce time-to-answer from hours to seconds. Capture and preserve institutional knowledge. Enable employees to leverage the full collective intelligence of the organization.

---

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.x
- **State Management:** Zustand + React Query (TanStack Query)
- **Real-time:** Socket.IO client / WebSocket native
- **Voice:** Web Speech API + custom WebRTC integration
- **Video:** Daily.co SDK / LiveKit client
- **Rich Text:** Tiptap editor for document collaboration
- **Charts/Analytics:** Recharts + D3.js
- **Testing:** Vitest + Playwright + React Testing Library
- **Build:** Turbopack

### Backend
- **Framework:** Python 3.12+ with FastAPI
- **Async Runtime:** Uvicorn + asyncio
- **AI/LLM:** LangChain + LlamaIndex + Claude API (Anthropic SDK) + OpenAI API
- **Vector Database:** Pinecone (primary) + pgvector (fallback)
- **Primary Database:** PostgreSQL 16 (via SQLAlchemy + Alembic)
- **Cache:** Redis 7 (sessions, rate limiting, hot cache)
- **Search:** Elasticsearch 8 (full-text search + hybrid retrieval)
- **Message Queue:** Apache Kafka (event streaming) + Celery (task queue)
- **Object Storage:** AWS S3
- **Voice/Speech:** Deepgram (STT) + ElevenLabs / Amazon Polly (TTS)
- **Video Processing:** FFmpeg + AWS MediaConvert
- **Auth:** NextAuth.js (frontend) + FastAPI-Users + OAuth2/OIDC + SAML 2.0
- **Testing:** pytest + httpx + factory_boy + faker
- **API Docs:** Auto-generated OpenAPI 3.1 (Swagger + ReDoc)

### Infrastructure & Deployment (AWS — Fully Autonomous)
- **Container Orchestration:** Amazon EKS (Kubernetes)
- **CI/CD:** GitHub Actions → AWS CodePipeline → ArgoCD (GitOps)
- **IaC:** Terraform + Terragrunt (all infrastructure as code)
- **Container Registry:** Amazon ECR
- **CDN:** CloudFront
- **DNS:** Route 53
- **SSL/TLS:** AWS Certificate Manager (ACM)
- **Secrets:** AWS Secrets Manager + HashiCorp Vault
- **Monitoring:** Prometheus + Grafana + AWS CloudWatch
- **Logging:** ELK Stack (Elasticsearch + Logstash + Kibana) on AWS OpenSearch
- **Tracing:** OpenTelemetry + AWS X-Ray + Jaeger
- **Alerting:** PagerDuty + Grafana Alerting + SNS
- **Auto-scaling:** Kubernetes HPA + Karpenter (node auto-scaling)
- **Database Hosting:** Amazon RDS (PostgreSQL) + Amazon ElastiCache (Redis)
- **Networking:** VPC + Private Subnets + NAT Gateway + ALB + WAF
- **Backup:** AWS Backup (automated daily + PITR)
- **Cost Management:** AWS Cost Explorer + Kubecost

---

## 3. Project Structure

```
project8/
├── CLAUDE.md                          # This PRD file
├── README.md                          # Project overview and setup guide
├── docker-compose.yml                 # Local development orchestration
├── docker-compose.prod.yml            # Production-like local testing
├── Makefile                           # Common commands and shortcuts
├── .github/
│   ├── workflows/
│   │   ├── ci-frontend.yml            # Frontend CI pipeline
│   │   ├── ci-backend.yml             # Backend CI pipeline
│   │   ├── cd-staging.yml             # Auto-deploy to staging
│   │   ├── cd-production.yml          # Production deploy (auto, gated by tests)
│   │   ├── security-scan.yml          # SAST/DAST security scanning
│   │   ├── dependency-audit.yml       # Dependency vulnerability checks
│   │   └── e2e-tests.yml             # End-to-end test pipeline
│   ├── CODEOWNERS                     # Code ownership rules
│   └── pull_request_template.md       # PR template
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── postcss.config.js
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── .env.example
│   ├── .env.local                     # Local dev env (gitignored)
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   ├── manifest.json
│   │   └── assets/
│   │       ├── images/
│   │       ├── icons/
│   │       └── sounds/                # Notification sounds
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── page.tsx               # Landing/dashboard page
│   │   │   ├── loading.tsx            # Root loading state
│   │   │   ├── error.tsx              # Root error boundary
│   │   │   ├── not-found.tsx          # 404 page
│   │   │   ├── globals.css            # Global styles
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reset-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── sso/
│   │   │   │   │   └── page.tsx       # SSO callback
│   │   │   │   └── layout.tsx         # Auth layout (no sidebar)
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx         # Dashboard layout (sidebar + topbar)
│   │   │   │   ├── home/
│   │   │   │   │   └── page.tsx       # Main dashboard
│   │   │   │   ├── chat/
│   │   │   │   │   ├── page.tsx       # Chat home (new conversation)
│   │   │   │   │   ├── [conversationId]/
│   │   │   │   │   │   └── page.tsx   # Active conversation
│   │   │   │   │   └── shared/
│   │   │   │   │       └── [shareId]/
│   │   │   │   │           └── page.tsx # Shared conversation view
│   │   │   │   ├── voice/
│   │   │   │   │   ├── page.tsx       # Voice assistant interface
│   │   │   │   │   └── call/
│   │   │   │   │       └── [callId]/
│   │   │   │   │           └── page.tsx # Active voice call
│   │   │   │   ├── meetings/
│   │   │   │   │   ├── page.tsx       # Meetings list
│   │   │   │   │   ├── schedule/
│   │   │   │   │   │   └── page.tsx   # Schedule a meeting
│   │   │   │   │   ├── [meetingId]/
│   │   │   │   │   │   ├── page.tsx   # Meeting room
│   │   │   │   │   │   ├── recap/
│   │   │   │   │   │   │   └── page.tsx # Meeting recap
│   │   │   │   │   │   └── transcript/
│   │   │   │   │   │       └── page.tsx # Full transcript
│   │   │   │   │   └── recordings/
│   │   │   │   │       └── page.tsx   # Meeting recordings library
│   │   │   │   ├── knowledge-base/
│   │   │   │   │   ├── page.tsx       # Knowledge base home
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── page.tsx   # Upload documents
│   │   │   │   │   ├── sources/
│   │   │   │   │   │   ├── page.tsx   # Connected sources list
│   │   │   │   │   │   └── [sourceId]/
│   │   │   │   │   │       └── page.tsx # Source detail/config
│   │   │   │   │   ├── documents/
│   │   │   │   │   │   ├── page.tsx   # Document library
│   │   │   │   │   │   └── [docId]/
│   │   │   │   │   │       └── page.tsx # Document viewer
│   │   │   │   │   ├── collections/
│   │   │   │   │   │   ├── page.tsx   # Collections list
│   │   │   │   │   │   └── [collectionId]/
│   │   │   │   │   │       └── page.tsx # Collection detail
│   │   │   │   │   └── crawlers/
│   │   │   │   │       ├── page.tsx   # Web crawler configs
│   │   │   │   │       └── [crawlerId]/
│   │   │   │   │           └── page.tsx # Crawler detail
│   │   │   │   ├── video/
│   │   │   │   │   ├── page.tsx       # Video library
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── page.tsx   # Upload video
│   │   │   │   │   └── [videoId]/
│   │   │   │   │       └── page.tsx   # Video player + AI analysis
│   │   │   │   ├── search/
│   │   │   │   │   └── page.tsx       # Global enterprise search
│   │   │   │   ├── workflows/
│   │   │   │   │   ├── page.tsx       # Workflow automations list
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx   # Workflow builder
│   │   │   │   │   └── [workflowId]/
│   │   │   │   │       └── page.tsx   # Workflow detail/editor
│   │   │   │   ├── agents/
│   │   │   │   │   ├── page.tsx       # AI agents marketplace
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx   # Agent builder
│   │   │   │   │   └── [agentId]/
│   │   │   │   │       └── page.tsx   # Agent config/detail
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── page.tsx       # Analytics dashboard
│   │   │   │   │   ├── usage/
│   │   │   │   │   │   └── page.tsx   # Usage metrics
│   │   │   │   │   ├── insights/
│   │   │   │   │   │   └── page.tsx   # AI-generated insights
│   │   │   │   │   ├── knowledge-gaps/
│   │   │   │   │   │   └── page.tsx   # Knowledge gap analysis
│   │   │   │   │   └── reports/
│   │   │   │   │       └── page.tsx   # Custom reports
│   │   │   │   ├── notifications/
│   │   │   │   │   └── page.tsx       # Notification center
│   │   │   │   ├── teams/
│   │   │   │   │   ├── page.tsx       # Team management
│   │   │   │   │   └── [teamId]/
│   │   │   │   │       └── page.tsx   # Team detail
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx       # User profile/settings
│   │   │   │   └── playground/
│   │   │   │       └── page.tsx       # AI prompt playground
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx         # Admin layout
│   │   │   │   ├── page.tsx           # Admin dashboard
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx       # User management
│   │   │   │   │   └── [userId]/
│   │   │   │   │       └── page.tsx   # User detail
│   │   │   │   ├── organizations/
│   │   │   │   │   ├── page.tsx       # Org management
│   │   │   │   │   └── [orgId]/
│   │   │   │   │       └── page.tsx   # Org detail
│   │   │   │   ├── roles/
│   │   │   │   │   └── page.tsx       # RBAC role management
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── page.tsx       # Integration marketplace
│   │   │   │   │   └── [integrationId]/
│   │   │   │   │       └── page.tsx   # Integration config
│   │   │   │   ├── billing/
│   │   │   │   │   └── page.tsx       # Billing & subscription
│   │   │   │   ├── compliance/
│   │   │   │   │   └── page.tsx       # Compliance dashboard
│   │   │   │   ├── audit-logs/
│   │   │   │   │   └── page.tsx       # Audit log viewer
│   │   │   │   ├── ai-models/
│   │   │   │   │   └── page.tsx       # AI model configuration
│   │   │   │   ├── security/
│   │   │   │   │   └── page.tsx       # Security settings
│   │   │   │   ├── data-governance/
│   │   │   │   │   └── page.tsx       # Data governance policies
│   │   │   │   └── system-health/
│   │   │   │       └── page.tsx       # System health monitor
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       │   └── [...nextauth]/
│   │   │       │       └── route.ts   # NextAuth API route
│   │   │       ├── webhooks/
│   │   │       │   ├── stripe/
│   │   │       │   │   └── route.ts
│   │   │       │   └── slack/
│   │   │       │       └── route.ts
│   │   │       └── health/
│   │   │           └── route.ts       # Frontend health check
│   │   ├── components/
│   │   │   ├── ui/                    # Base UI components (shadcn/ui style)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── spinner.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── slider.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── radio-group.tsx
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── command.tsx         # Command palette (Cmd+K)
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── file-upload.tsx
│   │   │   │   ├── date-picker.tsx
│   │   │   │   ├── color-picker.tsx
│   │   │   │   └── index.ts
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx         # Collapsible sidebar
│   │   │   │   ├── topbar.tsx          # Top navigation bar
│   │   │   │   ├── footer.tsx
│   │   │   │   ├── breadcrumbs.tsx
│   │   │   │   ├── mobile-nav.tsx      # Mobile navigation
│   │   │   │   └── theme-toggle.tsx    # Light/dark mode toggle
│   │   │   ├── chat/
│   │   │   │   ├── chat-interface.tsx   # Main chat container
│   │   │   │   ├── message-bubble.tsx   # Individual message
│   │   │   │   ├── message-list.tsx     # Scrollable message list
│   │   │   │   ├── chat-input.tsx       # Rich input with attachments
│   │   │   │   ├── citation-card.tsx    # Source citation display
│   │   │   │   ├── follow-up-suggestions.tsx
│   │   │   │   ├── conversation-list.tsx # Sidebar conversation history
│   │   │   │   ├── conversation-search.tsx
│   │   │   │   ├── typing-indicator.tsx
│   │   │   │   ├── code-block.tsx       # Syntax-highlighted code
│   │   │   │   ├── markdown-renderer.tsx
│   │   │   │   ├── reaction-picker.tsx
│   │   │   │   ├── thread-view.tsx      # Threaded conversation
│   │   │   │   ├── share-dialog.tsx     # Share conversation
│   │   │   │   └── feedback-buttons.tsx # Thumbs up/down + feedback
│   │   │   ├── voice/
│   │   │   │   ├── voice-interface.tsx  # Voice assistant UI
│   │   │   │   ├── waveform-visualizer.tsx # Audio waveform display
│   │   │   │   ├── voice-controls.tsx   # Mute, volume, etc.
│   │   │   │   ├── transcript-live.tsx  # Live transcription display
│   │   │   │   ├── voice-settings.tsx   # Voice preferences
│   │   │   │   └── push-to-talk.tsx     # PTT button component
│   │   │   ├── video/
│   │   │   │   ├── video-player.tsx     # Custom video player
│   │   │   │   ├── video-grid.tsx       # Meeting video grid
│   │   │   │   ├── screen-share.tsx     # Screen sharing controls
│   │   │   │   ├── video-upload.tsx     # Video upload with progress
│   │   │   │   ├── video-timeline.tsx   # Interactive timeline with AI markers
│   │   │   │   ├── chapter-markers.tsx  # AI-generated chapters
│   │   │   │   ├── video-search.tsx     # Search within video content
│   │   │   │   └── recording-controls.tsx
│   │   │   ├── meetings/
│   │   │   │   ├── meeting-room.tsx     # Video meeting room
│   │   │   │   ├── meeting-scheduler.tsx
│   │   │   │   ├── meeting-recap-card.tsx
│   │   │   │   ├── action-items.tsx     # Extracted action items
│   │   │   │   ├── meeting-notes.tsx    # AI-generated notes
│   │   │   │   ├── participant-list.tsx
│   │   │   │   ├── meeting-controls.tsx  # Join/leave/record
│   │   │   │   └── calendar-integration.tsx
│   │   │   ├── knowledge/
│   │   │   │   ├── document-viewer.tsx  # Universal doc viewer
│   │   │   │   ├── document-card.tsx    # Doc preview card
│   │   │   │   ├── upload-zone.tsx      # Drag & drop upload
│   │   │   │   ├── source-connector.tsx # Data source connector UI
│   │   │   │   ├── collection-card.tsx  # Knowledge collection
│   │   │   │   ├── indexing-progress.tsx # Indexing status display
│   │   │   │   ├── knowledge-graph.tsx  # Visual knowledge graph
│   │   │   │   ├── document-tree.tsx    # Hierarchical doc browser
│   │   │   │   ├── version-history.tsx  # Document version history
│   │   │   │   └── permission-manager.tsx # Doc-level permissions
│   │   │   ├── search/
│   │   │   │   ├── search-bar.tsx       # Global search
│   │   │   │   ├── search-results.tsx   # Results with filters
│   │   │   │   ├── search-filters.tsx   # Faceted search filters
│   │   │   │   ├── search-suggestions.tsx # Autocomplete
│   │   │   │   └── semantic-search-toggle.tsx
│   │   │   ├── workflows/
│   │   │   │   ├── workflow-canvas.tsx  # Visual workflow builder
│   │   │   │   ├── workflow-node.tsx    # Individual workflow step
│   │   │   │   ├── workflow-edge.tsx    # Connection between nodes
│   │   │   │   ├── trigger-config.tsx   # Trigger configuration
│   │   │   │   └── action-config.tsx    # Action configuration
│   │   │   ├── agents/
│   │   │   │   ├── agent-card.tsx       # Agent preview card
│   │   │   │   ├── agent-builder.tsx    # Agent creation UI
│   │   │   │   ├── tool-selector.tsx    # Tool/capability picker
│   │   │   │   ├── agent-chat.tsx       # Chat with specific agent
│   │   │   │   └── agent-logs.tsx       # Agent execution logs
│   │   │   ├── analytics/
│   │   │   │   ├── usage-chart.tsx      # Usage over time
│   │   │   │   ├── top-queries.tsx      # Most asked questions
│   │   │   │   ├── knowledge-coverage.tsx # Coverage heatmap
│   │   │   │   ├── user-engagement.tsx  # User engagement metrics
│   │   │   │   ├── response-quality.tsx # Quality metrics
│   │   │   │   ├── cost-tracker.tsx     # AI cost tracking
│   │   │   │   └── report-builder.tsx   # Custom report builder
│   │   │   ├── admin/
│   │   │   │   ├── user-table.tsx       # User management table
│   │   │   │   ├── role-editor.tsx      # RBAC role editor
│   │   │   │   ├── org-settings.tsx     # Organization settings
│   │   │   │   ├── integration-card.tsx # Integration config card
│   │   │   │   ├── model-config.tsx     # AI model configuration
│   │   │   │   ├── billing-overview.tsx # Billing dashboard
│   │   │   │   ├── audit-log-table.tsx  # Audit log viewer
│   │   │   │   ├── compliance-checker.tsx
│   │   │   │   └── system-status.tsx    # System health display
│   │   │   └── shared/
│   │   │       ├── error-boundary.tsx
│   │   │       ├── loading-screen.tsx
│   │   │       ├── empty-state.tsx
│   │   │       ├── confirmation-dialog.tsx
│   │   │       ├── rich-text-editor.tsx  # Tiptap-based editor
│   │   │       ├── markdown-editor.tsx
│   │   │       ├── json-viewer.tsx
│   │   │       ├── copy-button.tsx
│   │   │       ├── hotkey-hint.tsx
│   │   │       └── feature-flag-gate.tsx
│   │   ├── hooks/
│   │   │   ├── use-chat.ts              # Chat state management
│   │   │   ├── use-voice.ts             # Voice recording/playback
│   │   │   ├── use-websocket.ts         # WebSocket connection
│   │   │   ├── use-auth.ts              # Auth state & guards
│   │   │   ├── use-search.ts            # Search with debounce
│   │   │   ├── use-upload.ts            # File upload with progress
│   │   │   ├── use-media-devices.ts     # Camera/mic management
│   │   │   ├── use-notifications.ts     # Push notifications
│   │   │   ├── use-keyboard-shortcuts.ts # Global hotkeys
│   │   │   ├── use-infinite-scroll.ts   # Infinite scrolling
│   │   │   ├── use-clipboard.ts         # Copy to clipboard
│   │   │   ├── use-theme.ts             # Theme management
│   │   │   ├── use-local-storage.ts     # Persisted local state
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-intersection.ts
│   │   │   └── use-permissions.ts       # RBAC permission checks
│   │   ├── lib/
│   │   │   ├── api-client.ts            # Axios/fetch wrapper
│   │   │   ├── auth.ts                  # NextAuth configuration
│   │   │   ├── socket.ts               # Socket.IO client setup
│   │   │   ├── webrtc.ts               # WebRTC utilities
│   │   │   ├── constants.ts            # App constants
│   │   │   ├── utils.ts                # General utilities
│   │   │   ├── validators.ts           # Zod schemas
│   │   │   ├── formatters.ts           # Date, number formatters
│   │   │   ├── crypto.ts              # Client-side encryption helpers
│   │   │   ├── analytics.ts           # Analytics event tracking
│   │   │   ├── feature-flags.ts       # Feature flag client
│   │   │   └── error-tracking.ts      # Sentry/error reporting
│   │   ├── stores/
│   │   │   ├── chat-store.ts           # Chat state (Zustand)
│   │   │   ├── voice-store.ts          # Voice state
│   │   │   ├── meeting-store.ts        # Meeting state
│   │   │   ├── user-store.ts           # User preferences
│   │   │   ├── notification-store.ts   # Notification state
│   │   │   ├── ui-store.ts             # UI state (sidebar, modals)
│   │   │   └── search-store.ts         # Search state
│   │   ├── types/
│   │   │   ├── api.ts                  # API response types
│   │   │   ├── chat.ts                 # Chat-related types
│   │   │   ├── voice.ts               # Voice-related types
│   │   │   ├── meeting.ts             # Meeting types
│   │   │   ├── document.ts            # Document types
│   │   │   ├── user.ts                # User/auth types
│   │   │   ├── search.ts              # Search types
│   │   │   ├── workflow.ts            # Workflow types
│   │   │   ├── agent.ts               # Agent types
│   │   │   ├── analytics.ts           # Analytics types
│   │   │   ├── admin.ts               # Admin types
│   │   │   └── common.ts              # Shared/generic types
│   │   ├── styles/
│   │   │   ├── themes/
│   │   │   │   ├── light.ts
│   │   │   │   ├── dark.ts
│   │   │   │   └── high-contrast.ts   # Accessibility theme
│   │   │   └── animations.css         # Custom animations
│   │   └── middleware.ts              # Next.js middleware (auth, redirects)
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   ├── integration/
│   │   │   ├── chat-flow.test.ts
│   │   │   ├── voice-flow.test.ts
│   │   │   └── auth-flow.test.ts
│   │   └── e2e/
│   │       ├── chat.spec.ts
│   │       ├── voice.spec.ts
│   │       ├── meetings.spec.ts
│   │       ├── knowledge-base.spec.ts
│   │       ├── search.spec.ts
│   │       ├── admin.spec.ts
│   │       └── onboarding.spec.ts
│   └── Dockerfile
│
├── backend/
│   ├── pyproject.toml                  # Python project config (uv/poetry)
│   ├── alembic.ini                     # Alembic migration config
│   ├── Dockerfile
│   ├── .env.example
│   ├── conftest.py                     # Shared test fixtures
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI app entry point
│   │   ├── config.py                   # Settings (pydantic-settings)
│   │   ├── dependencies.py             # FastAPI dependency injection
│   │   ├── exceptions.py               # Custom exception classes
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # JWT/OAuth2 middleware
│   │   │   ├── cors.py                 # CORS configuration
│   │   │   ├── rate_limit.py           # Rate limiting middleware
│   │   │   ├── request_id.py           # Request ID injection
│   │   │   ├── logging.py             # Request/response logging
│   │   │   ├── tenant.py              # Multi-tenant context middleware
│   │   │   └── error_handler.py       # Global error handler
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py              # Root API router
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py          # V1 API router
│   │   │   │   ├── auth/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Auth endpoints
│   │   │   │   │   ├── schemas.py     # Auth request/response schemas
│   │   │   │   │   ├── service.py     # Auth business logic
│   │   │   │   │   ├── oauth.py       # OAuth2/OIDC providers
│   │   │   │   │   ├── saml.py        # SAML 2.0 integration
│   │   │   │   │   └── mfa.py         # Multi-factor authentication
│   │   │   │   ├── chat/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Chat REST endpoints
│   │   │   │   │   ├── websocket.py   # Chat WebSocket handler
│   │   │   │   │   ├── schemas.py     # Chat schemas
│   │   │   │   │   ├── service.py     # Chat service (orchestration)
│   │   │   │   │   ├── streaming.py   # SSE streaming responses
│   │   │   │   │   └── history.py     # Conversation history manager
│   │   │   │   ├── voice/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Voice endpoints
│   │   │   │   │   ├── websocket.py   # Voice WebSocket (real-time STT)
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Voice processing service
│   │   │   │   │   ├── stt.py         # Speech-to-text (Deepgram)
│   │   │   │   │   ├── tts.py         # Text-to-speech (ElevenLabs/Polly)
│   │   │   │   │   └── vad.py         # Voice activity detection
│   │   │   │   ├── meetings/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Meeting endpoints
│   │   │   │   │   ├── websocket.py   # Meeting real-time signaling
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Meeting service
│   │   │   │   │   ├── recording.py   # Recording management
│   │   │   │   │   ├── transcription.py # Live transcription
│   │   │   │   │   ├── recap.py       # AI meeting recap generator
│   │   │   │   │   ├── action_items.py # Action item extraction
│   │   │   │   │   └── calendar.py    # Calendar integrations
│   │   │   │   ├── knowledge/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Knowledge base endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Knowledge management service
│   │   │   │   │   ├── ingestion.py   # Document ingestion pipeline
│   │   │   │   │   ├── chunking.py    # Intelligent document chunking
│   │   │   │   │   ├── embedding.py   # Embedding generation
│   │   │   │   │   ├── indexing.py    # Vector + search indexing
│   │   │   │   │   ├── parsers/
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── pdf.py     # PDF parser
│   │   │   │   │   │   ├── docx.py    # Word document parser
│   │   │   │   │   │   ├── xlsx.py    # Excel parser
│   │   │   │   │   │   ├── pptx.py    # PowerPoint parser
│   │   │   │   │   │   ├── markdown.py # Markdown parser
│   │   │   │   │   │   ├── html.py    # HTML/web page parser
│   │   │   │   │   │   ├── csv.py     # CSV/TSV parser
│   │   │   │   │   │   ├── code.py    # Source code parser
│   │   │   │   │   │   ├── email.py   # Email (EML/MSG) parser
│   │   │   │   │   │   ├── image.py   # Image OCR parser
│   │   │   │   │   │   └── video.py   # Video transcript parser
│   │   │   │   │   ├── connectors/
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── base.py    # Base connector interface
│   │   │   │   │   │   ├── google_drive.py
│   │   │   │   │   │   ├── sharepoint.py
│   │   │   │   │   │   ├── onedrive.py
│   │   │   │   │   │   ├── dropbox.py
│   │   │   │   │   │   ├── confluence.py
│   │   │   │   │   │   ├── notion.py
│   │   │   │   │   │   ├── slack.py
│   │   │   │   │   │   ├── teams.py
│   │   │   │   │   │   ├── gmail.py
│   │   │   │   │   │   ├── outlook.py
│   │   │   │   │   │   ├── github.py
│   │   │   │   │   │   ├── gitlab.py
│   │   │   │   │   │   ├── jira.py
│   │   │   │   │   │   ├── salesforce.py
│   │   │   │   │   │   ├── hubspot.py
│   │   │   │   │   │   ├── zendesk.py
│   │   │   │   │   │   ├── intercom.py
│   │   │   │   │   │   ├── database.py  # Generic DB connector
│   │   │   │   │   │   ├── api.py       # Generic REST API connector
│   │   │   │   │   │   └── web_crawler.py # Website crawler
│   │   │   │   │   └── collections.py  # Knowledge collections
│   │   │   │   ├── video/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Video endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Video management service
│   │   │   │   │   ├── processing.py  # Video processing pipeline
│   │   │   │   │   ├── transcription.py # Video transcription
│   │   │   │   │   ├── analysis.py    # AI video analysis
│   │   │   │   │   ├── chapters.py    # Auto chapter generation
│   │   │   │   │   ├── thumbnails.py  # Thumbnail extraction
│   │   │   │   │   └── streaming.py   # Video streaming (HLS/DASH)
│   │   │   │   ├── search/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Search endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Search orchestration
│   │   │   │   │   ├── semantic.py    # Semantic/vector search
│   │   │   │   │   ├── fulltext.py    # Full-text search (ES)
│   │   │   │   │   ├── hybrid.py      # Hybrid search (semantic + fulltext)
│   │   │   │   │   ├── reranker.py    # Result reranking (Cohere/cross-encoder)
│   │   │   │   │   └── autocomplete.py # Search suggestions
│   │   │   │   ├── workflows/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Workflow endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Workflow engine
│   │   │   │   │   ├── executor.py    # Workflow step executor
│   │   │   │   │   ├── triggers.py    # Event triggers
│   │   │   │   │   └── templates.py   # Workflow templates
│   │   │   │   ├── agents/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Agent endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Agent management
│   │   │   │   │   ├── executor.py    # Agent execution runtime
│   │   │   │   │   ├── tools/
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── base.py    # Base tool interface
│   │   │   │   │   │   ├── web_search.py
│   │   │   │   │   │   ├── calculator.py
│   │   │   │   │   │   ├── code_executor.py
│   │   │   │   │   │   ├── email_sender.py
│   │   │   │   │   │   ├── calendar.py
│   │   │   │   │   │   ├── database_query.py
│   │   │   │   │   │   ├── api_caller.py
│   │   │   │   │   │   └── file_manager.py
│   │   │   │   │   └── templates.py   # Pre-built agent templates
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Analytics endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Analytics service
│   │   │   │   │   ├── metrics.py     # Metric calculations
│   │   │   │   │   ├── insights.py    # AI-generated insights
│   │   │   │   │   ├── knowledge_gaps.py # Knowledge gap detection
│   │   │   │   │   └── reports.py     # Report generation
│   │   │   │   ├── users/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # User endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # User management service
│   │   │   │   │   └── preferences.py # User preferences
│   │   │   │   ├── organizations/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Organization endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Org management
│   │   │   │   │   └── onboarding.py  # Org onboarding flow
│   │   │   │   ├── admin/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py      # Admin endpoints
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Admin operations
│   │   │   │   │   ├── rbac.py        # Role-based access control
│   │   │   │   │   ├── audit.py       # Audit logging
│   │   │   │   │   └── compliance.py  # Compliance checks
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Notification service
│   │   │   │   │   ├── email.py       # Email notifications (SES)
│   │   │   │   │   ├── push.py        # Push notifications (FCM/APNs)
│   │   │   │   │   ├── slack.py       # Slack notifications
│   │   │   │   │   └── in_app.py      # In-app notifications
│   │   │   │   ├── billing/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py     # Billing service
│   │   │   │   │   ├── stripe.py      # Stripe integration
│   │   │   │   │   └── usage_tracking.py # Usage-based billing
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── router.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   ├── service.py
│   │   │   │   │   └── webhooks.py    # Webhook management
│   │   │   │   └── health/
│   │   │   │       ├── __init__.py
│   │   │   │       └── router.py      # Health check endpoints
│   │   │   └── v2/                    # Future API version placeholder
│   │   │       └── __init__.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── ai/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── llm.py             # LLM provider abstraction
│   │   │   │   ├── providers/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── anthropic.py   # Claude integration
│   │   │   │   │   ├── openai.py      # OpenAI integration
│   │   │   │   │   ├── azure_openai.py # Azure OpenAI
│   │   │   │   │   ├── bedrock.py     # AWS Bedrock
│   │   │   │   │   └── local.py       # Local/self-hosted models
│   │   │   │   ├── prompts/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── chat.py        # Chat system prompts
│   │   │   │   │   ├── search.py      # Search query generation
│   │   │   │   │   ├── summary.py     # Summarization prompts
│   │   │   │   │   ├── meeting.py     # Meeting recap prompts
│   │   │   │   │   ├── extraction.py  # Information extraction
│   │   │   │   │   ├── analysis.py    # Document analysis
│   │   │   │   │   └── agent.py       # Agent system prompts
│   │   │   │   ├── chains/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── rag.py         # RAG chain
│   │   │   │   │   ├── conversational.py # Multi-turn conversation
│   │   │   │   │   ├── summarization.py  # Summarization chain
│   │   │   │   │   ├── classification.py # Intent classification
│   │   │   │   │   └── routing.py     # Query routing chain
│   │   │   │   ├── embeddings.py      # Embedding model management
│   │   │   │   ├── reranker.py        # Cross-encoder reranking
│   │   │   │   ├── guardrails.py      # Input/output guardrails
│   │   │   │   ├── token_counter.py   # Token counting/budgeting
│   │   │   │   └── model_router.py    # Model selection/routing
│   │   │   ├── security/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── jwt.py             # JWT token management
│   │   │   │   ├── encryption.py      # AES-256 encryption
│   │   │   │   ├── hashing.py         # Password hashing (argon2)
│   │   │   │   ├── permissions.py     # Permission engine
│   │   │   │   ├── data_masking.py    # PII/sensitive data masking
│   │   │   │   ├── input_sanitizer.py # Input validation/sanitization
│   │   │   │   └── api_keys.py        # API key management
│   │   │   ├── events/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bus.py             # Event bus (Kafka producer)
│   │   │   │   ├── consumer.py        # Kafka consumer
│   │   │   │   ├── schemas.py         # Event schemas
│   │   │   │   └── handlers.py        # Event handlers
│   │   │   └── cache/
│   │   │       ├── __init__.py
│   │   │       ├── redis.py           # Redis cache client
│   │   │       ├── strategies.py      # Cache strategies (LRU, TTL)
│   │   │       └── keys.py            # Cache key patterns
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # Base SQLAlchemy model
│   │   │   ├── user.py                # User model
│   │   │   ├── organization.py        # Organization model
│   │   │   ├── team.py                # Team model
│   │   │   ├── conversation.py        # Conversation model
│   │   │   ├── message.py             # Message model
│   │   │   ├── document.py            # Document model
│   │   │   ├── collection.py          # Collection model
│   │   │   ├── embedding.py           # Embedding metadata model
│   │   │   ├── connector.py           # Data source connector model
│   │   │   ├── meeting.py             # Meeting model
│   │   │   ├── recording.py           # Recording model
│   │   │   ├── video.py               # Video model
│   │   │   ├── workflow.py            # Workflow model
│   │   │   ├── agent.py               # Agent model
│   │   │   ├── notification.py        # Notification model
│   │   │   ├── audit_log.py           # Audit log model
│   │   │   ├── api_key.py             # API key model
│   │   │   ├── feedback.py            # User feedback model
│   │   │   ├── role.py                # RBAC role model
│   │   │   ├── permission.py          # Permission model
│   │   │   ├── subscription.py        # Subscription/billing model
│   │   │   ├── usage.py               # Usage tracking model
│   │   │   ├── integration.py         # Integration config model
│   │   │   └── webhook.py             # Webhook model
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── session.py             # Database session management
│   │   │   ├── migrations/
│   │   │   │   ├── env.py             # Alembic env config
│   │   │   │   ├── script.py.mako     # Migration template
│   │   │   │   └── versions/          # Migration files
│   │   │   └── seeds/
│   │   │       ├── __init__.py
│   │   │       ├── seed_roles.py      # Default roles/permissions
│   │   │       ├── seed_admin.py      # Default admin user
│   │   │       └── seed_templates.py  # Default templates
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py          # Celery application config
│   │   │   ├── tasks/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ingestion.py       # Document ingestion tasks
│   │   │   │   ├── embedding.py       # Embedding generation tasks
│   │   │   │   ├── video_processing.py # Video processing tasks
│   │   │   │   ├── transcription.py   # Transcription tasks
│   │   │   │   ├── notification.py    # Notification delivery tasks
│   │   │   │   ├── sync.py            # Data source sync tasks
│   │   │   │   ├── cleanup.py         # Scheduled cleanup tasks
│   │   │   │   ├── analytics.py       # Analytics aggregation tasks
│   │   │   │   ├── export.py          # Data export tasks
│   │   │   │   └── ai_insights.py     # AI insight generation tasks
│   │   │   └── schedules.py           # Celery Beat periodic schedules
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── pagination.py          # Cursor/offset pagination
│   │       ├── file_utils.py          # File handling utilities
│   │       ├── datetime_utils.py      # Timezone-aware datetime helpers
│   │       ├── slug.py                # URL slug generation
│   │       ├── retry.py               # Exponential backoff retry
│   │       ├── rate_limiter.py        # Token bucket rate limiter
│   │       └── validators.py          # Custom validators
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                # Test fixtures & factories
│   │   ├── factories/
│   │   │   ├── __init__.py
│   │   │   ├── user_factory.py
│   │   │   ├── document_factory.py
│   │   │   ├── conversation_factory.py
│   │   │   └── organization_factory.py
│   │   ├── unit/
│   │   │   ├── test_ai/
│   │   │   ├── test_services/
│   │   │   ├── test_models/
│   │   │   └── test_utils/
│   │   ├── integration/
│   │   │   ├── test_api/
│   │   │   ├── test_connectors/
│   │   │   ├── test_workers/
│   │   │   └── test_db/
│   │   └── load/
│   │       ├── locustfile.py          # Load testing (Locust)
│   │       └── scenarios/
│   │           ├── chat_load.py
│   │           ├── search_load.py
│   │           └── ingestion_load.py
│   └── scripts/
│       ├── seed_db.py                 # Database seeding
│       ├── create_admin.py            # Create admin user
│       ├── migrate.py                 # Run migrations
│       ├── generate_embeddings.py     # Bulk embedding generation
│       └── benchmark_search.py        # Search quality benchmarks
│
├── infrastructure/
│   ├── terraform/
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   ├── terraform.tfvars
│   │   │   │   └── backend.tf         # S3 remote state
│   │   │   ├── staging/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   ├── terraform.tfvars
│   │   │   │   └── backend.tf
│   │   │   └── production/
│   │   │       ├── main.tf
│   │   │       ├── variables.tf
│   │   │       ├── outputs.tf
│   │   │       ├── terraform.tfvars
│   │   │       └── backend.tf
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   │   ├── main.tf            # VPC, subnets, NAT, IGW
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── eks/
│   │   │   │   ├── main.tf            # EKS cluster + node groups
│   │   │   │   ├── variables.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── karpenter.tf       # Karpenter auto-scaler
│   │   │   ├── rds/
│   │   │   │   ├── main.tf            # RDS PostgreSQL
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── elasticache/
│   │   │   │   ├── main.tf            # Redis cluster
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── elasticsearch/
│   │   │   │   ├── main.tf            # OpenSearch domain
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── s3/
│   │   │   │   ├── main.tf            # S3 buckets (docs, media, backups)
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── cloudfront/
│   │   │   │   ├── main.tf            # CDN distribution
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── ecr/
│   │   │   │   ├── main.tf            # Container registries
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── alb/
│   │   │   │   ├── main.tf            # Application Load Balancer
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── waf/
│   │   │   │   ├── main.tf            # WAF rules
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── route53/
│   │   │   │   ├── main.tf            # DNS zones & records
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── acm/
│   │   │   │   ├── main.tf            # SSL certificates
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── secrets/
│   │   │   │   ├── main.tf            # Secrets Manager
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── monitoring/
│   │   │   │   ├── main.tf            # CloudWatch, SNS alerts
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── kafka/
│   │   │   │   ├── main.tf            # Amazon MSK (managed Kafka)
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── ses/
│   │   │   │   ├── main.tf            # Email sending (SES)
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── mediaconvert/
│   │   │   │   ├── main.tf            # Video processing
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── backup/
│   │   │   │   ├── main.tf            # AWS Backup plans
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   └── iam/
│   │   │       ├── main.tf            # IAM roles & policies
│   │   │       ├── variables.tf
│   │   │       └── outputs.tf
│   │   └── terragrunt.hcl             # Terragrunt root config
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── namespace.yaml
│   │   │   ├── network-policies.yaml
│   │   │   └── resource-quotas.yaml
│   │   ├── apps/
│   │   │   ├── frontend/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml           # Horizontal Pod Autoscaler
│   │   │   │   ├── ingress.yaml
│   │   │   │   └── configmap.yaml
│   │   │   ├── backend-api/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   ├── ingress.yaml
│   │   │   │   ├── configmap.yaml
│   │   │   │   └── secrets.yaml       # External Secrets Operator ref
│   │   │   ├── backend-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── configmap.yaml
│   │   │   ├── backend-scheduler/
│   │   │   │   ├── deployment.yaml     # Celery Beat
│   │   │   │   └── configmap.yaml
│   │   │   ├── websocket-server/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── ingress.yaml
│   │   │   └── media-processor/
│   │   │       ├── deployment.yaml     # Video/audio processing pods
│   │   │       ├── hpa.yaml
│   │   │       └── configmap.yaml
│   │   ├── monitoring/
│   │   │   ├── prometheus/
│   │   │   │   ├── prometheus.yaml
│   │   │   │   ├── alertmanager.yaml
│   │   │   │   └── rules/
│   │   │   │       ├── api-alerts.yaml
│   │   │   │       ├── worker-alerts.yaml
│   │   │   │       └── infra-alerts.yaml
│   │   │   ├── grafana/
│   │   │   │   ├── grafana.yaml
│   │   │   │   └── dashboards/
│   │   │   │       ├── api-dashboard.json
│   │   │   │       ├── worker-dashboard.json
│   │   │   │       ├── ai-metrics.json
│   │   │   │       └── business-metrics.json
│   │   │   └── otel-collector/
│   │   │       └── otel-collector.yaml
│   │   ├── security/
│   │   │   ├── cert-manager/
│   │   │   │   └── cluster-issuer.yaml
│   │   │   ├── external-secrets/
│   │   │   │   └── secret-store.yaml
│   │   │   └── pod-security-policies/
│   │   │       └── restricted.yaml
│   │   └── argocd/
│   │       ├── application.yaml       # ArgoCD app definition
│   │       ├── project.yaml           # ArgoCD project
│   │       └── repo-credentials.yaml
│   └── scripts/
│       ├── bootstrap-cluster.sh       # Initial cluster setup
│       ├── deploy.sh                  # Deployment script
│       ├── rollback.sh                # Rollback script
│       ├── scale.sh                   # Manual scaling
│       ├── db-backup.sh               # Manual DB backup
│       ├── db-restore.sh              # DB restore
│       └── rotate-secrets.sh          # Secret rotation
│
├── shared/
│   ├── proto/                         # Protobuf definitions (if using gRPC)
│   │   └── knowledge.proto
│   ├── openapi/
│   │   └── openapi.yaml               # OpenAPI spec (auto-generated)
│   └── schemas/
│       ├── events.json                # Event schema definitions
│       └── webhooks.json              # Webhook payload schemas
│
├── docs/
│   ├── architecture/
│   │   ├── system-design.md           # High-level architecture
│   │   ├── data-flow.md               # Data flow diagrams
│   │   ├── ai-pipeline.md             # RAG pipeline architecture
│   │   └── security.md               # Security architecture
│   ├── api/
│   │   └── postman/
│   │       └── KnowledgeForge.postman_collection.json
│   ├── runbooks/
│   │   ├── deployment.md
│   │   ├── incident-response.md
│   │   ├── scaling.md
│   │   └── disaster-recovery.md
│   └── adr/                           # Architecture Decision Records
│       ├── 001-use-fastapi.md
│       ├── 002-vector-db-choice.md
│       ├── 003-multi-tenancy.md
│       └── 004-event-driven.md
│
└── tools/
    ├── dev-setup.sh                   # Local development setup
    ├── lint.sh                        # Run all linters
    ├── test.sh                        # Run all tests
    └── generate-types.sh              # Generate TS types from OpenAPI
```

---

## 4. Feature Specifications

### 4.1 AI Chat Interface (Core Feature)

**Description:** Multi-turn conversational AI with RAG (Retrieval-Augmented Generation) that answers questions using the organization's entire knowledge base.

**Features:**
- Real-time streaming responses via SSE (Server-Sent Events)
- Multi-turn conversation with full context retention (up to 200k tokens)
- Source citations with clickable links to original documents
- Follow-up question suggestions generated by AI
- Code block rendering with syntax highlighting and copy button
- Markdown rendering (tables, lists, headings, math via KaTeX)
- File/image attachment support in messages
- Conversation sharing via secure links (with expiration)
- Conversation export (PDF, Markdown, JSON)
- Pin/bookmark important conversations
- Conversation tagging and categorization
- Multi-model support (switch between Claude, GPT-4, etc. per conversation)
- Context window management with intelligent summarization
- Feedback collection (thumbs up/down + free-text) per response
- Response regeneration with different parameters
- Conversation branching (fork from any message)
- @mention to bring in specific knowledge collections
- Slash commands (/summarize, /translate, /explain, /compare)
- Custom system prompts per conversation or team
- Inline document preview (PDFs, images, spreadsheets)
- Thread/reply within conversations
- Collaborative conversations (multiple users in one chat)

### 4.2 Voice Assistant

**Description:** Full voice interaction capability — ask questions by speaking and receive spoken answers.

**Features:**
- Real-time speech-to-text via WebSocket (Deepgram streaming API)
- Text-to-speech response playback (ElevenLabs for natural voice, Polly as fallback)
- Voice activity detection (VAD) for automatic start/stop
- Push-to-talk mode option
- Wake word detection ("Hey KnowledgeForge")
- Multi-language support (20+ languages for STT/TTS)
- Speaker diarization (identify who is speaking)
- Ambient noise cancellation
- Audio waveform visualization
- Voice command shortcuts ("search for...", "summarize...", "remind me...")
- Continuous conversation mode (hands-free)
- Voice biometric authentication (optional)
- Adjustable voice speed, pitch, and persona
- Offline voice command queue (sync when reconnected)
- Audio transcript alongside voice interaction
- Voice note recording and AI transcription/summarization

### 4.3 Meeting Intelligence

**Description:** AI-powered meeting companion that joins, records, transcribes, and analyzes meetings in real-time.

**Features:**
- Video meeting rooms with WebRTC (up to 50 participants)
- Real-time meeting transcription with speaker labels
- AI meeting bot that auto-joins scheduled meetings (Zoom, Teams, Google Meet)
- Live AI assistant during meetings (ask questions about discussed topics)
- Automatic meeting recap generation (summary, key decisions, action items)
- Action item extraction with assignee detection and due dates
- Meeting sentiment analysis (engagement levels per participant)
- Automatic meeting minutes formatted as professional documents
- Meeting recording with cloud storage (S3 + CloudFront streaming)
- Searchable meeting archive (search by spoken content)
- Meeting highlights and key moments detection
- Screen share with AI annotation (highlight important content)
- Calendar integration (Google Calendar, Outlook, iCal)
- Pre-meeting briefing (AI generates context from relevant docs/past meetings)
- Post-meeting follow-up automation (send recap, create tickets)
- Meeting analytics (talk-time distribution, topic coverage, frequency)
- Multi-language real-time translation in meetings
- Custom vocabulary/jargon recognition per organization
- Meeting templates (standup, retrospective, planning, 1:1)
- Breakout rooms with separate transcription
- Meeting compliance recording (legal hold support)

### 4.4 Knowledge Base Management

**Description:** Centralized repository for all organizational knowledge with intelligent ingestion, indexing, and retrieval.

**Features:**
- **Document Ingestion Pipeline:**
  - Supported formats: PDF, DOCX, XLSX, PPTX, CSV, Markdown, HTML, TXT, JSON, XML, EML, MSG, images (OCR), source code (50+ languages)
  - Drag-and-drop bulk upload with progress tracking
  - Automatic format detection and optimal parsing
  - OCR for scanned documents and images (Tesseract + AWS Textract)
  - Table extraction from PDFs and documents
  - Intelligent chunking (semantic, recursive, paragraph-aware)
  - Metadata extraction (title, author, dates, tags, entities)
  - Duplicate detection (exact + near-duplicate via MinHash)
  - Content quality scoring
  - PII detection and auto-redaction (configurable)

- **Data Source Connectors (20+):**
  - Cloud Storage: Google Drive, OneDrive, SharePoint, Dropbox, Box
  - Collaboration: Confluence, Notion, Coda
  - Communication: Slack, Microsoft Teams, Gmail, Outlook
  - Development: GitHub, GitLab, Bitbucket (repos, issues, PRs, wikis)
  - CRM/Support: Salesforce, HubSpot, Zendesk, Intercom, Freshdesk
  - Project Management: Jira, Asana, Linear, Monday.com
  - Databases: PostgreSQL, MySQL, MongoDB, Snowflake, BigQuery
  - Generic: REST API connector, GraphQL connector, Web crawler
  - Scheduled sync with configurable frequency (real-time, hourly, daily)
  - Incremental sync (only changed content)
  - OAuth2 authentication for all connectors
  - Connector health monitoring and auto-retry

- **Knowledge Organization:**
  - Collections (group related documents)
  - Tags and categories (hierarchical taxonomy)
  - Knowledge graph visualization (entity relationships)
  - Document versioning with diff view
  - Document lifecycle management (draft → published → archived → deleted)
  - Full-text search + semantic search across all content
  - Cross-reference detection between documents
  - Automatic related document suggestions
  - Collaborative annotations and comments on documents
  - Document access analytics (who viewed what, when)

- **Web Crawler:**
  - Configurable web crawling with depth/breadth limits
  - Sitemap-based crawling
  - JavaScript-rendered page support (headless browser)
  - Scheduled re-crawl with change detection
  - Robots.txt compliance
  - Rate limiting per domain
  - Content extraction with boilerplate removal

### 4.5 Video Knowledge Base

**Description:** Upload, process, and query video content with AI-powered analysis.

**Features:**
- Video upload with chunked upload support (up to 10GB)
- Automatic video transcription (multi-language)
- AI-generated chapter markers and table of contents
- Video summarization (text + key frame extraction)
- Search within video content (find the exact timestamp)
- Video Q&A (ask questions about video content)
- Thumbnail generation (AI-selected best frames)
- Video to knowledge article conversion
- Clip extraction and sharing
- Video analytics (views, engagement, completion rate)
- Adaptive bitrate streaming (HLS/DASH)
- Video annotation and commenting at timestamps
- Video playlist creation
- Screen recording capture (browser extension)
- Integration with YouTube, Vimeo, Loom
- Video accessibility (captions, audio descriptions)

### 4.6 Enterprise Search

**Description:** Unified search across all organizational knowledge with AI-powered understanding.

**Features:**
- Hybrid search (semantic vector search + BM25 full-text search)
- Natural language query understanding (intent classification)
- Query expansion and reformulation
- Faceted search filters (source, type, date, author, team, collection)
- Search result reranking (cross-encoder reranker)
- Highlighted search snippets with context
- Search suggestions and autocomplete
- Typo tolerance and fuzzy matching
- Multi-language search support
- Personalized search (based on user's role, team, history)
- Search analytics (popular queries, zero-result queries, click-through rates)
- Saved searches with alerts (get notified when new matching content appears)
- Search federation (search across connected external sources)
- Boolean search operators for power users
- Date range filtering
- Near-real-time index updates (< 30 second delay)
- Search result preview (inline document preview)
- Command palette (Cmd+K) for quick access

### 4.7 AI Agents & Automation

**Description:** Custom AI agents that can autonomously perform tasks using organizational knowledge and external tools.

**Features:**
- **Agent Builder:**
  - No-code agent creation interface
  - Custom system prompt configuration
  - Tool/capability assignment (search, email, calendar, code execution, API calls)
  - Knowledge scope restriction (limit to specific collections)
  - Testing playground for agents
  - Agent versioning and rollback

- **Pre-built Agents:**

  - Research Agent: Deep research across knowledge base with multi-step reasoning
  - Writing Agent: Draft documents, emails, reports using organizational context
  - Data Analyst Agent: Query databases, generate charts, analyze trends
  - Support Agent: Answer customer/employee questions with ticket creation
  - Onboarding Agent: Guide new employees through company knowledge
  - Compliance Agent: Check documents against compliance rules
  - Code Review Agent: Review code changes against internal standards

- **Workflow Automation:**
  - Visual workflow builder (drag-and-drop)
  - Event-driven triggers (new document, Slack message, email, schedule, webhook)
  - Conditional logic and branching
  - Human-in-the-loop approval steps
  - Integration actions (send email, create ticket, update CRM, post to Slack)
  - Error handling and retry logic
  - Workflow templates library
  - Execution history and debugging
  - Workflow analytics (success rate, execution time)
  - Parallel execution branches
  - Sub-workflow composition

### 4.8 Analytics & Insights

**Description:** Comprehensive analytics on knowledge usage, AI performance, and organizational intelligence.

**Features:**
- **Usage Analytics:**
  - Query volume over time (by user, team, org)
  - Active users and engagement metrics
  - Most/least used knowledge sources
  - Popular topics and trending queries
  - Response time distribution
  - Conversation length distribution
  - Feature adoption metrics

- **AI Performance Metrics:**
  - Response quality scores (from user feedback)
  - Citation accuracy rate
  - Hallucination detection rate
  - Average response latency
  - Token usage and cost tracking per model
  - Model comparison analytics
  - Guardrail trigger rate

- **Knowledge Intelligence:**
  - Knowledge gap analysis (frequently asked but unanswered questions)
  - Stale content detection (outdated documents)
  - Knowledge coverage heatmap by department/topic
  - Content freshness scoring
  - Duplicate content identification
  - Expert identification (who knows what)
  - Information flow analysis

- **Custom Reports:**
  - Drag-and-drop report builder
  - Scheduled report delivery (email, Slack)
  - Export to PDF, CSV, Excel
  - Executive summary dashboards
  - Department-level views
  - ROI calculation (time saved, questions deflected)

### 4.9 Authentication & Security

**Description:** Enterprise-grade security with flexible authentication, fine-grained authorization, and compliance controls.

**Features:**
- **Authentication:**
  - Email/password with strong password policy
  - OAuth 2.0 / OIDC (Google, Microsoft, Okta, Auth0, OneLogin)
  - SAML 2.0 SSO (enterprise identity providers)
  - Multi-factor authentication (TOTP, SMS, email, WebAuthn/FIDO2)
  - Session management with configurable timeout
  - Device trust / remembered devices
  - Password reset with secure token flow
  - Account lockout after failed attempts
  - Login audit trail

- **Authorization (RBAC + ABAC):**
  - Role-based access control with custom roles
  - Pre-defined roles: Super Admin, Org Admin, Team Admin, Member, Viewer, Guest
  - Document-level permissions (read, write, share, delete)
  - Collection-level access control
  - Team-based access scoping
  - API key management with scope restrictions
  - IP allowlisting per organization
  - Time-based access restrictions

- **Data Security:**
  - AES-256 encryption at rest
  - TLS 1.3 encryption in transit
  - Client-side encryption option for sensitive documents
  - PII detection and automatic masking/redaction
  - Data loss prevention (DLP) rules
  - Secure file storage with signed URLs (expiring)
  - Data retention policies (configurable per org)
  - Right to deletion (GDPR Article 17)
  - Data export (GDPR Article 20)

- **Compliance:**
  - SOC 2 Type II compliance controls
  - GDPR compliance (consent, data portability, right to forget)
  - HIPAA compliance mode (for healthcare organizations)
  - CCPA compliance
  - Comprehensive audit logging (who did what, when, where)
  - Audit log export and SIEM integration
  - Compliance dashboard with health indicators
  - Data residency controls (per-region data storage)
  - Legal hold and eDiscovery support

### 4.10 Multi-Tenancy

**Description:** Full multi-tenant architecture supporting hundreds of organizations with complete data isolation.

**Features:**
- Logical data isolation per organization (schema-level in PostgreSQL)
- Separate vector namespaces per tenant (Pinecone)
- Tenant-specific encryption keys
- Custom branding per organization (logo, colors, domain)
- Custom AI model configuration per tenant
- Per-tenant rate limiting and quotas
- Tenant provisioning API (for automated onboarding)
- Cross-tenant analytics for platform admins
- Tenant migration and export tools
- Tenant suspension and reactivation
- White-label support

### 4.11 Notifications & Alerts

**Description:** Multi-channel notification system for keeping users informed.

**Features:**
- In-app notification center with read/unread tracking
- Email notifications (AWS SES) with HTML templates
- Push notifications (web + mobile via FCM/APNs)
- Slack integration (DM + channel notifications)
- Microsoft Teams notifications
- Webhook notifications for custom integrations
- Notification preferences per user (channel + frequency)
- Digest mode (daily/weekly summary instead of real-time)
- @mention notifications in conversations
- Knowledge update alerts (subscribed content changes)
- Scheduled report delivery
- System status notifications (downtime, maintenance)
- Smart notification batching (prevent flood)

### 4.12 Billing & Subscription Management

**Description:** Usage-based billing with subscription tiers.

**Features:**
- **Subscription Tiers:**
  - Free: 100 queries/month, 50MB storage, 1 user
  - Starter: 5,000 queries/month, 5GB storage, 10 users, 5 connectors
  - Professional: 50,000 queries/month, 100GB storage, 100 users, all connectors, voice + video
  - Enterprise: Unlimited queries, unlimited storage, unlimited users, SSO/SAML, SLA, dedicated support
  - Custom: Volume pricing for 1000+ users

- **Billing Features:**
  - Stripe integration for payment processing
  - Usage-based billing with metering
  - Seat-based pricing with auto-scaling
  - Annual and monthly billing cycles
  - Invoice generation and history
  - Credit system for overages
  - Free trial (14 days, no credit card)
  - Usage alerts and budget caps
  - Cost allocation by team/department
  - Volume discounts
  - Self-service plan changes (upgrade/downgrade)

### 4.13 Developer Platform & API

**Description:** Public API and developer tools for extending KnowledgeForge.

**Features:**
- RESTful API with OpenAPI 3.1 specification
- WebSocket API for real-time features
- API key authentication with scoped permissions
- Rate limiting with clear error responses
- Webhook system for event subscriptions
- SDKs: Python, JavaScript/TypeScript, Go
- API playground (interactive documentation)
- API versioning (v1, v2) with deprecation policy
- Batch API endpoints for bulk operations
- GraphQL API (optional, for complex queries)
- Custom integration framework (plugin system)
- Embedding widget for external websites
- Chatbot embed code (for customer-facing chat)
- CLI tool for knowledge management
- API usage analytics and logging

### 4.14 Admin & Governance

**Description:** Comprehensive administration tools for managing the platform.

**Features:**
- User management (invite, suspend, delete, impersonate)
- Organization settings (branding, defaults, policies)
- Team management with hierarchical structure
- Role and permission management (RBAC editor)
- Data governance policies (retention, classification, access)
- AI model configuration (select models, set parameters, guardrails)
- System health monitoring (real-time dashboard)
- Resource usage monitoring (compute, storage, AI tokens)
- Audit log viewer with advanced filtering
- Security settings (password policy, MFA enforcement, IP restrictions)
- Integration management (connected services)
- Feature flag management
- Custom field definitions (extend data models)
- Bulk operations (bulk user import, bulk permission changes)
- Scheduled maintenance windows
- System backup and restore controls

### 4.15 Internationalization & Accessibility

**Description:** Global-ready platform with full accessibility compliance.

**Features:**
- **Internationalization (i18n):**
  - UI translation support (20+ languages)
  - Right-to-left (RTL) layout support
  - Date, time, number, currency localization
  - Multi-language content indexing and search
  - AI responses in user's preferred language
  - Automatic language detection

- **Accessibility (a11y):**
  - WCAG 2.1 Level AA compliance
  - Full keyboard navigation
  - Screen reader support (ARIA labels)
  - High contrast theme
  - Focus management for dynamic content
  - Skip navigation links
  - Responsive design (mobile, tablet, desktop)
  - Reduced motion support
  - Text scaling support
  - Color-blind friendly design

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Chat response first-token latency: < 500ms (p95)
- Full chat response: < 5 seconds (p95) for non-complex queries
- Search results: < 200ms (p95)
- Document ingestion: Process 100-page PDF in < 60 seconds
- Voice STT latency: < 300ms for interim results
- Video processing: 1 hour video transcribed in < 10 minutes
- API response time: < 100ms (p95) for CRUD operations
- WebSocket message delivery: < 50ms
- Concurrent users: Support 10,000+ simultaneous users
- Concurrent conversations: 5,000+ active streams

### 5.2 Scalability
- Horizontal scaling for all services (stateless design)
- Auto-scaling based on CPU, memory, and custom metrics (queue depth)
- Database read replicas for query scaling
- Connection pooling (PgBouncer)
- CDN for static assets and media streaming
- Sharding strategy for 100M+ documents
- Async processing for heavy operations (video, bulk ingestion)
- Backpressure handling for ingestion pipeline

### 5.3 Reliability
- 99.9% uptime SLA (99.95% for Enterprise tier)
- Zero-downtime deployments (rolling updates + blue-green)
- Automated failover for all databases
- Multi-AZ deployment for all critical services
- Circuit breaker pattern for external dependencies
- Graceful degradation (function without AI if LLM is down)
- Automated health checks and self-healing
- Disaster recovery: RPO < 1 hour, RTO < 4 hours
- Automated backup testing

### 5.4 Observability
- Structured logging (JSON) with correlation IDs
- Distributed tracing (OpenTelemetry → Jaeger)
- Custom metrics (Prometheus) for business logic
- Real-time dashboards (Grafana)
- Alerting (PagerDuty) with escalation policies
- Error tracking (Sentry) with source maps
- Log aggregation (OpenSearch/ELK)
- AI-specific observability (prompt logging, token tracking, latency by model)
- SLO/SLI tracking with error budget

### 5.5 Security
- OWASP Top 10 mitigation
- Regular penetration testing
- Dependency vulnerability scanning (Snyk/Dependabot)
- Container image scanning (Trivy)
- Infrastructure security scanning (Checkov)
- Secret scanning in CI/CD (GitGuardian/truffleHog)
- WAF rules for common attack patterns
- DDoS protection (AWS Shield)
- Network segmentation (private subnets for all data services)
- Principle of least privilege (IAM)
- Security headers (CSP, HSTS, X-Frame-Options)

---

## 6. Autonomous AWS Deployment Strategy

### 6.1 GitOps Pipeline (Zero Human Intervention)

```
Developer Push → GitHub Actions CI →
  ├── Lint + Type Check + Unit Tests
  ├── Integration Tests (testcontainers)
  ├── Security Scan (SAST + dependency audit)
  ├── Build Docker Images → Push to ECR
  ├── Update Kubernetes manifests (image tags)
  └── ArgoCD auto-sync → EKS Cluster
       ├── Canary deployment (10% traffic)
       ├── Automated smoke tests
       ├── Progressive rollout (25% → 50% → 100%)
       ├── Automated rollback on error spike
       └── Post-deploy integration tests
```

### 6.2 Infrastructure Automation
- **Terraform** manages ALL AWS resources — nothing created manually
- **Terragrunt** handles environment promotion (dev → staging → prod)
- **ArgoCD** continuously reconciles Kubernetes desired state
- **Karpenter** auto-provisions EC2 nodes based on pod demand
- **AWS Backup** runs automated daily backups with 30-day retention
- **Certificate renewal** via cert-manager (auto-renew Let's Encrypt)
- **Secret rotation** via AWS Secrets Manager automatic rotation
- **Database migrations** run automatically as init containers
- **Seed data** applied automatically on first deployment

### 6.3 Autonomous Operations
- **Self-healing:** Kubernetes restarts crashed pods, Karpenter replaces failed nodes
- **Auto-scaling:** HPA scales pods by CPU/memory/custom metrics, Karpenter scales nodes
- **Auto-remediation:** Runbook automation for common incidents
- **Cost optimization:** Spot instances for workers, Reserved Instances for baseline, automatic right-sizing recommendations
- **Log rotation:** Automatic log rotation and archival to S3 Glacier
- **Index optimization:** Elasticsearch ILM (Index Lifecycle Management) for automatic index rollover and deletion
- **Cache warming:** Automated cache pre-warming on deployment
- **Health monitoring:** Automated synthetic monitoring (canary endpoints)

---

## 7. API Endpoint Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (email/password) |
| POST | `/api/v1/auth/logout` | Logout (invalidate session) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Initiate password reset |
| POST | `/api/v1/auth/reset-password` | Complete password reset |
| GET | `/api/v1/auth/oauth/{provider}` | OAuth2 login redirect |
| POST | `/api/v1/auth/oauth/{provider}/callback` | OAuth2 callback |
| POST | `/api/v1/auth/saml/login` | SAML SSO initiate |
| POST | `/api/v1/auth/saml/acs` | SAML assertion consumer |
| POST | `/api/v1/auth/mfa/setup` | Setup MFA |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code |
| GET | `/api/v1/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/conversations` | Create conversation |
| GET | `/api/v1/chat/conversations` | List conversations |
| GET | `/api/v1/chat/conversations/{id}` | Get conversation |
| DELETE | `/api/v1/chat/conversations/{id}` | Delete conversation |
| POST | `/api/v1/chat/conversations/{id}/messages` | Send message (streaming SSE) |
| GET | `/api/v1/chat/conversations/{id}/messages` | Get message history |
| POST | `/api/v1/chat/conversations/{id}/regenerate` | Regenerate last response |
| POST | `/api/v1/chat/conversations/{id}/branch` | Branch conversation |
| POST | `/api/v1/chat/conversations/{id}/share` | Create share link |
| POST | `/api/v1/chat/messages/{id}/feedback` | Submit feedback |
| POST | `/api/v1/chat/conversations/{id}/export` | Export conversation |
| WS | `/ws/v1/chat/{conversation_id}` | Real-time chat WebSocket |

### Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/voice/sessions` | Create voice session |
| POST | `/api/v1/voice/sessions/{id}/tts` | Generate speech from text |
| GET | `/api/v1/voice/voices` | List available voices |
| POST | `/api/v1/voice/transcribe` | Transcribe audio file |
| WS | `/ws/v1/voice/{session_id}` | Real-time voice WebSocket (STT + TTS) |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/meetings` | Create/schedule meeting |
| GET | `/api/v1/meetings` | List meetings |
| GET | `/api/v1/meetings/{id}` | Get meeting details |
| PUT | `/api/v1/meetings/{id}` | Update meeting |
| DELETE | `/api/v1/meetings/{id}` | Cancel meeting |
| POST | `/api/v1/meetings/{id}/join` | Join meeting (get WebRTC token) |
| POST | `/api/v1/meetings/{id}/leave` | Leave meeting |
| POST | `/api/v1/meetings/{id}/record/start` | Start recording |
| POST | `/api/v1/meetings/{id}/record/stop` | Stop recording |
| GET | `/api/v1/meetings/{id}/transcript` | Get transcript |
| GET | `/api/v1/meetings/{id}/recap` | Get AI recap |
| GET | `/api/v1/meetings/{id}/action-items` | Get action items |
| GET | `/api/v1/meetings/{id}/recordings` | List recordings |
| WS | `/ws/v1/meetings/{meeting_id}` | Meeting signaling WebSocket |

### Knowledge Base
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/knowledge/documents` | Upload document(s) |
| GET | `/api/v1/knowledge/documents` | List documents |
| GET | `/api/v1/knowledge/documents/{id}` | Get document details |
| PUT | `/api/v1/knowledge/documents/{id}` | Update document metadata |
| DELETE | `/api/v1/knowledge/documents/{id}` | Delete document |
| GET | `/api/v1/knowledge/documents/{id}/content` | Get document content |
| GET | `/api/v1/knowledge/documents/{id}/chunks` | Get document chunks |
| GET | `/api/v1/knowledge/documents/{id}/versions` | Get version history |
| POST | `/api/v1/knowledge/collections` | Create collection |
| GET | `/api/v1/knowledge/collections` | List collections |
| PUT | `/api/v1/knowledge/collections/{id}` | Update collection |
| DELETE | `/api/v1/knowledge/collections/{id}` | Delete collection |
| POST | `/api/v1/knowledge/connectors` | Add data source connector |
| GET | `/api/v1/knowledge/connectors` | List connectors |
| PUT | `/api/v1/knowledge/connectors/{id}` | Update connector config |
| DELETE | `/api/v1/knowledge/connectors/{id}` | Remove connector |
| POST | `/api/v1/knowledge/connectors/{id}/sync` | Trigger manual sync |
| GET | `/api/v1/knowledge/connectors/{id}/status` | Get sync status |
| POST | `/api/v1/knowledge/crawlers` | Create web crawler |
| GET | `/api/v1/knowledge/crawlers` | List crawlers |
| POST | `/api/v1/knowledge/crawlers/{id}/run` | Run crawler |
| GET | `/api/v1/knowledge/stats` | Knowledge base statistics |

### Video
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/videos/upload` | Upload video (multipart/chunked) |
| GET | `/api/v1/videos` | List videos |
| GET | `/api/v1/videos/{id}` | Get video details |
| DELETE | `/api/v1/videos/{id}` | Delete video |
| GET | `/api/v1/videos/{id}/stream` | Get streaming URL (HLS) |
| GET | `/api/v1/videos/{id}/transcript` | Get video transcript |
| GET | `/api/v1/videos/{id}/chapters` | Get AI chapters |
| GET | `/api/v1/videos/{id}/summary` | Get AI summary |
| POST | `/api/v1/videos/{id}/ask` | Ask question about video |
| POST | `/api/v1/videos/{id}/clips` | Create clip |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/search` | Full search (hybrid semantic + text) |
| GET | `/api/v1/search/suggest` | Search autocomplete |
| POST | `/api/v1/search/saved` | Save a search |
| GET | `/api/v1/search/saved` | List saved searches |
| GET | `/api/v1/search/trending` | Trending searches |
| GET | `/api/v1/search/analytics` | Search analytics |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/workflows` | Create workflow |
| GET | `/api/v1/workflows` | List workflows |
| GET | `/api/v1/workflows/{id}` | Get workflow |
| PUT | `/api/v1/workflows/{id}` | Update workflow |
| DELETE | `/api/v1/workflows/{id}` | Delete workflow |
| POST | `/api/v1/workflows/{id}/execute` | Execute workflow |
| GET | `/api/v1/workflows/{id}/runs` | List workflow runs |
| GET | `/api/v1/workflows/{id}/runs/{runId}` | Get run details |
| POST | `/api/v1/workflows/templates` | Get workflow templates |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/agents` | List agents |
| GET | `/api/v1/agents/{id}` | Get agent |
| PUT | `/api/v1/agents/{id}` | Update agent |
| DELETE | `/api/v1/agents/{id}` | Delete agent |
| POST | `/api/v1/agents/{id}/execute` | Execute agent |
| GET | `/api/v1/agents/{id}/logs` | Get execution logs |
| GET | `/api/v1/agents/templates` | Get agent templates |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/usage` | Usage analytics |
| GET | `/api/v1/analytics/ai-performance` | AI performance metrics |
| GET | `/api/v1/analytics/knowledge-gaps` | Knowledge gap analysis |
| GET | `/api/v1/analytics/engagement` | User engagement metrics |
| POST | `/api/v1/analytics/reports` | Generate custom report |
| GET | `/api/v1/analytics/reports` | List reports |
| GET | `/api/v1/analytics/costs` | Cost breakdown |
| GET | `/api/v1/analytics/dashboard` | Dashboard data |

### Users & Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (admin) |
| GET | `/api/v1/users/{id}` | Get user |
| PUT | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Delete user |
| GET | `/api/v1/users/{id}/preferences` | Get preferences |
| PUT | `/api/v1/users/{id}/preferences` | Update preferences |
| POST | `/api/v1/organizations` | Create organization |
| GET | `/api/v1/organizations/{id}` | Get organization |
| PUT | `/api/v1/organizations/{id}` | Update organization |
| POST | `/api/v1/organizations/{id}/invite` | Invite user |
| GET | `/api/v1/organizations/{id}/members` | List members |
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/teams` | List teams |
| PUT | `/api/v1/teams/{id}` | Update team |
| DELETE | `/api/v1/teams/{id}` | Delete team |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/audit-logs` | Get audit logs |
| GET | `/api/v1/admin/system-health` | System health check |
| GET | `/api/v1/admin/roles` | List roles |
| POST | `/api/v1/admin/roles` | Create role |
| PUT | `/api/v1/admin/roles/{id}` | Update role |
| DELETE | `/api/v1/admin/roles/{id}` | Delete role |
| GET | `/api/v1/admin/compliance` | Compliance status |
| POST | `/api/v1/admin/ai-models` | Configure AI model |
| GET | `/api/v1/admin/ai-models` | List configured models |
| POST | `/api/v1/admin/data-governance/policies` | Create policy |
| GET | `/api/v1/admin/data-governance/policies` | List policies |
| GET | `/api/v1/admin/feature-flags` | List feature flags |
| PUT | `/api/v1/admin/feature-flags/{flag}` | Toggle feature flag |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List notifications |
| PUT | `/api/v1/notifications/{id}/read` | Mark as read |
| PUT | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/notifications/preferences` | Get notification prefs |
| PUT | `/api/v1/notifications/preferences` | Update notification prefs |
| WS | `/ws/v1/notifications` | Real-time notification stream |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/billing/subscription` | Get current subscription |
| POST | `/api/v1/billing/subscription` | Create/update subscription |
| DELETE | `/api/v1/billing/subscription` | Cancel subscription |
| GET | `/api/v1/billing/invoices` | List invoices |
| GET | `/api/v1/billing/usage` | Get usage metering |
| POST | `/api/v1/billing/payment-method` | Add payment method |
| GET | `/api/v1/billing/plans` | List available plans |

### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Basic health check |
| GET | `/api/v1/health/ready` | Readiness check (all dependencies) |
| GET | `/api/v1/health/live` | Liveness check |
| GET | `/api/v1/metrics` | Prometheus metrics |

---

## 8. Database Schema Overview

### Core Tables
- `users` — User accounts with profile info
- `organizations` — Multi-tenant organizations
- `org_memberships` — User ↔ Organization mapping with roles
- `teams` — Teams within organizations
- `team_memberships` — User ↔ Team mapping
- `roles` — RBAC roles
- `permissions` — Granular permissions
- `role_permissions` — Role ↔ Permission mapping
- `sessions` — User sessions
- `api_keys` — API key management

### Chat
- `conversations` — Chat conversations with metadata
- `messages` — Individual messages (user + AI)
- `message_citations` — Source citations per message
- `message_feedback` — User feedback on AI responses
- `conversation_shares` — Shared conversation links

### Knowledge
- `documents` — Uploaded/ingested documents
- `document_versions` — Document version history
- `document_chunks` — Chunked document segments
- `collections` — Knowledge collections
- `collection_documents` — Collection ↔ Document mapping
- `connectors` — Data source connector configs
- `sync_jobs` — Connector sync job history
- `crawlers` — Web crawler configurations
- `crawl_jobs` — Crawler job history

### Meetings & Video
- `meetings` — Meeting records
- `meeting_participants` — Meeting ↔ User mapping
- `recordings` — Meeting recordings
- `transcripts` — Meeting/video transcripts
- `transcript_segments` — Individual transcript segments
- `action_items` — Extracted action items
- `videos` — Uploaded videos
- `video_chapters` — AI-generated chapters
- `video_clips` — User-created clips

### Workflows & Agents
- `workflows` — Workflow definitions
- `workflow_nodes` — Workflow step definitions
- `workflow_edges` — Connections between steps
- `workflow_runs` — Workflow execution history
- `workflow_run_steps` — Individual step execution logs
- `agents` — AI agent configurations
- `agent_tools` — Agent ↔ Tool mappings
- `agent_executions` — Agent execution history

### Analytics & System
- `query_logs` — Search/chat query logs
- `usage_metrics` — Aggregated usage metrics
- `audit_logs` — Security audit trail
- `notifications` — User notifications
- `notification_preferences` — Per-user notification settings
- `subscriptions` — Billing subscriptions
- `invoices` — Billing invoices
- `feature_flags` — Feature flag configurations
- `webhooks` — Webhook registrations
- `webhook_deliveries` — Webhook delivery history

---

## 9. Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=https://api.knowledgeforge.ai
NEXT_PUBLIC_WS_URL=wss://ws.knowledgeforge.ai
NEXT_PUBLIC_APP_NAME=KnowledgeForge
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_STRIPE_PK=
NEXTAUTH_URL=https://app.knowledgeforge.ai
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Backend (.env)
```
# Application
APP_NAME=KnowledgeForge
APP_ENV=production
DEBUG=false
SECRET_KEY=
API_V1_PREFIX=/api/v1
CORS_ORIGINS=["https://app.knowledgeforge.ai"]

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/knowledgeforge
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://host:6379/0
REDIS_PASSWORD=

# Elasticsearch
ELASTICSEARCH_URL=https://host:9200
ELASTICSEARCH_API_KEY=

# Vector Database
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=knowledgeforge

# AI/LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEFAULT_LLM_MODEL=claude-sonnet-4-6
DEFAULT_EMBEDDING_MODEL=text-embedding-3-large
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.1

# Voice
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=

# Storage
AWS_S3_BUCKET=knowledgeforge-documents
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Kafka
KAFKA_BOOTSTRAP_SERVERS=host:9092
KAFKA_SECURITY_PROTOCOL=SASL_SSL

# Celery
CELERY_BROKER_URL=redis://host:6379/1
CELERY_RESULT_BACKEND=redis://host:6379/2

# Auth
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Email
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@knowledgeforge.ai

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Feature Flags
FEATURE_FLAG_PROVIDER=internal
```

---

## 10. Development Commands

```bash
# Local Development
make dev                    # Start all services (docker-compose up)
make dev-frontend           # Start frontend only
make dev-backend            # Start backend only
make stop                   # Stop all services

# Testing
make test                   # Run all tests
make test-frontend          # Frontend tests (vitest)
make test-backend           # Backend tests (pytest)
make test-e2e               # End-to-end tests (playwright)
make test-load              # Load tests (locust)
make test-coverage          # Coverage report

# Database
make db-migrate             # Run migrations
make db-rollback            # Rollback last migration
make db-seed                # Seed database
make db-reset               # Reset database (migrate + seed)

# Code Quality
make lint                   # Run all linters
make format                 # Auto-format code
make typecheck              # TypeScript type checking
make security-scan          # Run security scanners

# Infrastructure
make tf-plan ENV=staging    # Terraform plan
make tf-apply ENV=staging   # Terraform apply
make deploy ENV=staging     # Full deploy pipeline

# Utilities
make generate-types         # Generate TS types from OpenAPI
make docs                   # Generate API documentation
make clean                  # Clean build artifacts
```

---

## 11. Milestones & Phases

### Phase 1 — Foundation (Weeks 1-4)
- Project scaffolding (Next.js + FastAPI)
- Authentication system (email/password + OAuth2)
- Database schema + migrations
- Basic chat interface with AI (single model)
- Document upload + basic ingestion (PDF, DOCX)
- Basic vector search (Pinecone)
- Docker Compose for local dev
- CI pipeline (lint + test + build)

### Phase 2 — Core Intelligence (Weeks 5-8)
- RAG pipeline with citations
- Multi-model support (Claude + GPT-4)
- Streaming responses (SSE)
- Full-text search (Elasticsearch)
- Hybrid search (semantic + full-text)
- Knowledge collections
- Conversation history + management
- User preferences + settings
- RBAC foundation

### Phase 3 — Voice & Video (Weeks 9-12)
- Voice assistant (Deepgram STT + ElevenLabs TTS)
- Real-time voice via WebSocket
- Video upload + processing pipeline
- Video transcription + chapters
- Video Q&A
- Meeting rooms (WebRTC)
- Meeting recording + transcription
- Meeting recap generation

### Phase 4 — Enterprise Features (Weeks 13-16)
- SAML 2.0 SSO
- Multi-tenancy
- Data source connectors (first 10)
- Web crawler
- Advanced RBAC (document-level permissions)
- Audit logging
- Admin dashboard
- Notification system
- API key management

### Phase 5 — Intelligence & Automation (Weeks 17-20)
- AI Agents framework
- Workflow automation builder
- Knowledge gap analysis
- Analytics dashboard
- Custom reports
- Pre-built agent templates
- Slack/Teams integration
- Webhook system

### Phase 6 — Production Hardening (Weeks 21-24)
- AWS infrastructure (Terraform)
- Kubernetes manifests + Helm charts
- ArgoCD GitOps setup
- Monitoring + alerting (Prometheus + Grafana + PagerDuty)
- Load testing + performance optimization
- Security hardening (WAF, encryption, scanning)
- Billing integration (Stripe)
- Documentation + runbooks
- Disaster recovery testing

### Phase 7 — Polish & Launch (Weeks 25-28)
- Remaining data source connectors
- Internationalization (i18n)
- Accessibility audit + fixes
- Mobile responsive optimization
- Onboarding flow
- Feature flags
- Beta program
- Production deployment
- Launch

---

## 12. Key Architecture Decisions

1. **FastAPI over Django** — Async-native, better WebSocket support, OpenAPI auto-generation, higher performance for AI workloads.
2. **Pinecone + pgvector** — Pinecone for production scale + managed service; pgvector as fallback for cost-sensitive deployments.
3. **Kafka over RabbitMQ** — Event replay capability, higher throughput for document ingestion events, better for event sourcing patterns.
4. **EKS over ECS** — More control over scheduling, better ecosystem (Helm, ArgoCD, Karpenter), portable to other clouds.
5. **Separate WebSocket service** — Dedicated deployment for WebSocket connections allows independent scaling from REST API.
6. **Celery for task queue** — Mature, well-documented, native Python, works with Redis broker (already in stack).
7. **Multi-model AI** — Provider abstraction layer allows switching between Claude/GPT-4/Bedrock without code changes.
8. **Schema-per-tenant** — PostgreSQL schema-based isolation balances security with operational simplicity.
9. **ArgoCD GitOps** — Git as single source of truth for deployments, automatic drift detection, audit trail.
10. **Hybrid search** — Combining semantic (vector) and lexical (BM25) search with reranking provides best retrieval quality.
