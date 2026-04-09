# KnowledgeForge — Frontend

Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS · Zustand · TanStack Query · NextAuth.js

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Routes & Pages](#routes--pages)
- [State Management](#state-management)
- [Authentication](#authentication)
- [Real-Time Features](#real-time-features)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Building & Deployment](#building--deployment)
- [Code Style](#code-style)

---

## Quick Start

```bash
npm install
cp .env.example .env.local        # fill in NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, etc.
npm run dev                        # http://localhost:3001 with Turbopack HMR
```

For production standalone output:

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
export $(cat .env.local | grep -v '^#' | xargs)
PORT=3001 node .next/standalone/server.js
```

---

## Project Structure

```
frontend/src/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Unauthenticated — auth-only layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/             # Authenticated — sidebar + topbar
│   │   ├── layout.tsx           # Mounts SessionSync + NotificationProvider
│   │   ├── home/                # KPI dashboard
│   │   ├── chat/                # AI chat + conversation history
│   │   ├── voice/               # Voice assistant
│   │   ├── playground/          # AI prompt playground
│   │   ├── meetings/            # Meetings list + room + recordings
│   │   ├── knowledge/           # Documents, collections, upload, crawlers
│   │   ├── knowledge-base/      # Knowledge base home
│   │   ├── video/               # Video library + AI player
│   │   ├── search/              # Enterprise search with filters
│   │   ├── workflows/           # Workflow list + visual builder
│   │   ├── agents/              # Agent marketplace + builder wizard
│   │   ├── analytics/           # Usage, AI insights, knowledge gaps, reports
│   │   ├── notifications/       # Notification center
│   │   ├── teams/               # Team management
│   │   ├── profile/             # User profile + settings
│   │   ├── api-keys/            # API key management
│   │   └── admin/               # Admin panel (11 sub-pages)
│   ├── (marketing)/             # Public pages — no auth required
│   │   ├── about/
│   │   ├── blog/
│   │   ├── pricing/
│   │   ├── security/
│   │   ├── docs/
│   │   └── ...
│   └── api/
│       └── auth/[...nextauth]/  # NextAuth route handler
│
├── components/
│   ├── ui/                      # Base component library
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── CommandPalette.tsx   # Cmd+K global search
│   ├── layout/
│   │   ├── sidebar.tsx          # Collapsible nav sidebar
│   │   ├── topbar.tsx           # Top navigation + user menu
│   │   ├── session-sync.tsx     # Syncs NextAuth session with backend JWT
│   │   └── notification-provider.tsx  # WebSocket notification hook (client)
│   ├── chat/                    # Chat interface components
│   ├── voice/                   # Voice assistant components
│   ├── knowledge/               # Knowledge management components
│   ├── analytics/               # Analytics chart components
│   └── search/                  # Search interface components
│
├── hooks/
│   ├── useChat.ts               # Chat state + streaming SSE consumer
│   ├── useVoice.ts              # Voice recording + playback
│   ├── useSearch.ts             # Debounced search with React Query
│   ├── use-websocket-notifications.ts  # Real-time notification WS
│   ├── use-chat-presence.ts     # Typing indicators + online users WS
│   ├── useWebSocket.ts          # Generic WebSocket with auto-reconnect
│   ├── useCommandPalette.ts     # Cmd+K state
│   └── useGlobalFileDrop.ts     # Global drag-and-drop handler
│
├── lib/
│   ├── api-client.ts            # Typed fetch wrapper with auth headers
│   ├── auth.ts                  # NextAuth configuration + providers
│   └── utils.ts                 # cn(), formatDate(), truncate(), etc.
│
├── stores/                      # Zustand stores
│   ├── chat-store.ts            # Conversations, active message state
│   ├── ui-store.ts              # Sidebar open/closed, modal state
│   └── user-store.ts            # User preferences
│
└── types/                       # Shared TypeScript types
    ├── api.ts                   # API response shapes
    ├── chat.ts                  # Conversation, Message, Citation types
    ├── document.ts              # Document, Collection, Connector types
    └── user.ts                  # User, Role, Session types
```

---

## Routes & Pages

### Authentication (`(auth)`)

| Page | Path | Description |
|---|---|---|
| Login | `/login` | Email/password + Google OAuth + Microsoft OAuth + quick-login buttons |
| Register | `/register` | Sign up with invite token support |
| Forgot Password | `/forgot-password` | Email-based reset flow |
| Reset Password | `/reset-password` | Token-gated new password form |

### Dashboard (`(dashboard)`)

| Page | Path | Description |
|---|---|---|
| Home | `/home` | KPI cards — queries, docs, users, tokens; quick actions |
| Chat | `/chat` | New conversation + history sidebar |
| Chat (active) | `/chat/[id]` | Streaming chat with citations and follow-up suggestions |
| Voice | `/voice` | Push-to-talk or continuous mode; waveform visualizer |
| Playground | `/playground` | Raw model prompt + parameter tuning |
| Meetings | `/meetings` | Upcoming + past meetings list |
| Meeting Room | `/meetings/[id]` | WebRTC video room with live transcript |
| Recordings | `/meetings/recordings` | Recording library with replay |
| Knowledge | `/knowledge` | Document library, upload, crawlers |
| Knowledge Base | `/knowledge-base` | KB home with stats |
| Video Library | `/video` | Video cards with AI analysis badges |
| Video Player | `/video/[id]` | Player + chapter markers + Q&A sidebar |
| Search | `/search` | Hybrid search with faceted filters |
| Workflows | `/workflows` | Workflow list + visual drag-and-drop builder |
| Agents | `/agents` | Agent marketplace + builder wizard |
| Analytics | `/analytics` | Usage, AI performance, knowledge gaps, cost |
| Notifications | `/notifications` | All notifications with read/unread state |
| Teams | `/teams` | Team list + create/delete |
| Profile | `/profile` | General, notifications, security, appearance tabs |
| API Keys | `/api-keys` | Generate multi-provider API keys |
| Admin | `/admin` | Admin panel entry point |
| Admin Users | `/admin/users` | User management table |
| Admin Billing | `/admin/billing` | Plan overview + Stripe portal |
| Admin Audit | `/admin/audit-logs` | Full security audit log |
| Admin Health | `/admin/system-health` | Real-time infrastructure status |

### Marketing (`(marketing)`)

Public pages: About, Blog, Changelog, Docs, Security, Privacy, Terms, Pricing, Roadmap, Status, Contact.

---

## State Management

```
Server state  →  TanStack React Query 5
                  - All API data fetching and caching
                  - Optimistic updates for mutations
                  - Background re-fetching on window focus

Client state  →  Zustand stores
                  - chat-store: conversations list, active message buffer
                  - ui-store: sidebar state, command palette open
                  - user-store: theme preference, local settings

Auth state    →  NextAuth.js session
                  - Encrypted cookie with access + refresh tokens
                  - Auto-refresh 2 minutes before access token expiry
```

---

## Authentication

NextAuth.js handles three providers:

| Provider | Setup |
|---|---|
| Credentials | Email + password → calls `POST /auth/login` on backend |
| Google | Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Microsoft | Requires `AZURE_AD_CLIENT_ID` + `AZURE_AD_CLIENT_SECRET` |

**MFA flow**: When the backend returns HTTP 202 with `{ mfaRequired: true, challengeToken }`, the login page shows a TOTP input. The token is submitted to `POST /auth/mfa/challenge` to receive the full JWT pair.

**Auto-refresh**: The NextAuth `jwt` callback checks the access token expiry on every request. If it expires within 2 minutes, it calls `POST /auth/refresh` with the stored refresh token transparently.

---

## Real-Time Features

### Chat Streaming (SSE)

```typescript
// useChat.ts
const response = await fetch(`${API_URL}/conversations/${id}/messages/stream`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ content }),
});
const reader = response.body!.getReader();
// Tokens are appended to the message buffer as they arrive
```

### WebSocket Notifications

`NotificationProvider` (mounted in the dashboard layout) connects to `/ws/notifications?token=...` and:
- Dispatches `kf:notification` DOM events for in-page toast consumption
- Triggers browser `Notification` API if permission is granted

### Chat Presence

`useChatPresence(conversationId)` connects to `/ws/chat/{id}` and exposes:
- `onlineUsers: string[]` — user IDs currently viewing the conversation
- `typingUsers: Set<string>` — users currently typing
- `sendTyping(isTyping: boolean)` — emit typing indicator

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:8010
NEXT_PUBLIC_WS_URL=ws://localhost:8010
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=                    # openssl rand -hex 32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth (optional)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common
```

---

## Testing

```bash
# Unit tests (Vitest + React Testing Library)
npm run test

# Unit tests in watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E tests with UI
npx playwright test --ui
```

Test files:
- `src/tests/unit/components/` — component unit tests
- `src/tests/unit/hooks/` — hook unit tests
- `src/tests/e2e/` — Playwright end-to-end flows

---

## Building & Deployment

```bash
# Development (Turbopack HMR)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Format check
npm run format:check
```

The output uses Next.js **standalone** mode — the `.next/standalone` directory contains everything needed to run the server without `node_modules`.

**AWS Amplify**: CI/CD is configured via [`amplify.yml`](amplify.yml). Every push to `main` triggers a build and deploy.

---

## Code Style

- **TypeScript strict** mode — no `any`, all props typed
- **ESLint** with Next.js recommended rules
- **Prettier** for formatting
- Components follow one-component-per-file convention
- `cn()` utility (from `lib/utils.ts`) for conditional class merging with Tailwind
