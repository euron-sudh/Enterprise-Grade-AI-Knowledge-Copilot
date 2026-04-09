# KnowledgeForge — API Reference

**Base URL:** `http://localhost:8010` (dev) · `https://api.knowledgeforge.ai` (prod)
**Auth:** All protected endpoints require `Authorization: Bearer <access_token>`
**Interactive docs:** [http://localhost:8010/docs](http://localhost:8010/docs) (Swagger UI) · [http://localhost:8010/redoc](http://localhost:8010/redoc) (ReDoc)

---

## Table of Contents

- [Authentication](#authentication)
- [Conversations (Chat)](#conversations-chat)
- [Knowledge Base](#knowledge-base)
- [Search](#search)
- [Voice](#voice)
- [Meetings](#meetings)
- [Agents](#agents)
- [Workflows](#workflows)
- [Analytics](#analytics)
- [Admin](#admin)
- [Billing](#billing)
- [Teams](#teams)
- [WebSocket](#websocket)
- [Error Responses](#error-responses)

---

## Authentication

All tokens are JWTs signed with HS256. Access tokens expire in 60 minutes; refresh tokens expire in 30 days and rotate on every use.

### POST /auth/register
Register a new user account.

**Request**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Query params:** `?invite=<token>` (optional invite link)

**Response `201`**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "v4_...",
  "user": { "id": "uuid", "name": "Jane Smith", "email": "jane@example.com", "role": "Member" }
}
```

---

### POST /auth/login
Authenticate with email + password.

**Request**
```json
{ "email": "jane@example.com", "password": "SecurePass123!" }
```

**Response `200`** — MFA disabled
```json
{ "accessToken": "eyJ...", "refreshToken": "v4_...", "user": { ... } }
```

**Response `202`** — MFA enabled (proceed to `/auth/mfa/challenge`)
```json
{ "mfaRequired": true, "challengeToken": "abc123..." }
```

---

### POST /auth/mfa/challenge
Complete MFA verification after a 202 login response.

**Request**
```json
{ "challengeToken": "abc123...", "code": "482910" }
```

**Response `200`** — same as successful login

---

### POST /auth/refresh
Rotate the refresh token and get a new access token.

**Request**
```json
{ "refreshToken": "v4_..." }
```

**Response `200`** — same shape as login response

---

### POST /auth/logout
Invalidate the refresh token.

**Request**
```json
{ "refreshToken": "v4_..." }
```

**Response `204`** — no body

---

### GET /auth/me
Get the currently authenticated user.

**Response `200`**
```json
{
  "id": "uuid", "name": "Jane Smith", "email": "jane@example.com",
  "role": "Member", "avatarUrl": null, "createdAt": "2026-01-01T00:00:00Z"
}
```

---

### POST /auth/forgot-password
Initiate a password reset email.

**Request** `{ "email": "jane@example.com" }`
**Response `200`** `{ "message": "Reset email sent if account exists" }`

---

### POST /auth/reset-password
Complete password reset with token from email.

**Request** `{ "token": "...", "newPassword": "NewPass123!" }`
**Response `204`**

---

### POST /auth/mfa/setup
Set up TOTP MFA for the current user. Returns a TOTP secret and QR code URI.

**Response `200`**
```json
{ "secret": "BASE32SECRET", "qrUri": "otpauth://totp/...", "backupCodes": ["abc123", ...] }
```

---

### POST /auth/mfa/verify
Confirm MFA setup with a TOTP code.

**Request** `{ "code": "482910" }`
**Response `200`** `{ "enabled": true }`

---

## Conversations (Chat)

### GET /conversations
List all conversations for the current user.

**Query params:** `page`, `pageSize` (default 20), `search`, `pinned`

**Response `200`**
```json
{
  "items": [{ "id": "uuid", "title": "Q4 strategy...", "model": "claude-sonnet-4-6", "messageCount": 12, "updatedAt": "..." }],
  "total": 47, "page": 1, "pageSize": 20, "totalPages": 3
}
```

---

### POST /conversations
Create a new conversation.

**Request**
```json
{ "title": "New Conversation", "model": "claude-sonnet-4-6", "systemPrompt": null }
```

**Response `201`** — conversation object

---

### GET /conversations/{id}
Get a single conversation with its messages.

**Response `200`**
```json
{
  "id": "uuid", "title": "...", "model": "claude-sonnet-4-6",
  "messages": [{ "id": "uuid", "role": "user", "content": "...", "createdAt": "..." }]
}
```

---

### DELETE /conversations/{id}
Delete a conversation and all its messages.

**Response `204`**

---

### POST /conversations/{id}/messages/stream
Send a message and receive a streaming SSE response.

**Request**
```json
{
  "content": "What is our Q4 revenue target?",
  "model": "claude-sonnet-4-6",
  "images": [],
  "useWebSearch": false,
  "sourceFilter": "all",
  "systemPrompt": null
}
```

**Response** — `text/event-stream`
```
data: {"token": "Our ", "done": false}
data: {"token": "Q4 revenue", "done": false}
data: {"done": true, "citations": [{"title": "Q4 Plan", "documentId": "uuid", "chunkIndex": 2}]}
```

**Errors:** `402` if monthly query limit is exceeded.

---

### GET /conversations/{id}/messages
Get paginated message history for a conversation.

**Query params:** `page`, `pageSize`

---

### POST /conversations/{id}/pin
Toggle pinned state on a conversation.

**Response `200`** `{ "isPinned": true }`

---

### POST /messages/{id}/feedback
Submit feedback for an AI message.

**Request** `{ "rating": "thumbs_up" | "thumbs_down", "comment": "..." }`
**Response `204`**

---

## Knowledge Base

### POST /knowledge/documents/upload
Upload one or more documents for ingestion.

**Content-Type:** `multipart/form-data`

**Form fields:**
- `files` — one or more file uploads (PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, HTML, images)
- `collectionId` — optional UUID
- `tags` — optional comma-separated string

**Response `200`** — array of document objects

**Errors:** `402` if storage limit is exceeded.

---

### GET /knowledge/documents
List all documents visible to the current user.

**Query params:** `page`, `pageSize`, `search`, `status`, `collectionId`, `fileType`

**Response `200`** — paginated list of documents

---

### GET /knowledge/documents/{id}
Get document metadata and processing status.

**Response `200`**
```json
{
  "id": "uuid", "title": "Q4 Strategy.pdf", "fileType": "pdf",
  "status": "ready", "chunkCount": 34, "fileSize": 524288,
  "createdAt": "..."
}
```

---

### DELETE /knowledge/documents/{id}
Delete a document and all its chunks.

**Response `204`**

---

### GET /knowledge/documents/{id}/chunks
Get all text chunks for a document.

**Response `200`** — array of `{ id, content, chunkIndex, metadata }`

---

### POST /knowledge/collections
Create a knowledge collection.

**Request** `{ "name": "Q4 Planning", "description": "..." }`
**Response `201`** — collection object

---

### GET /knowledge/collections
List all collections.

**Response `200`** — array of collections with document counts

---

### POST /knowledge/connectors
Add a data source connector.

**Request**
```json
{ "connectorType": "google_drive", "name": "Company Drive", "config": {} }
```

**Response `201`** — connector object with OAuth redirect URL

---

### GET /knowledge/connectors
List all configured connectors with sync status.

---

### POST /knowledge/connectors/{id}/sync
Trigger a manual sync for a connector.

**Response `202`** `{ "jobId": "uuid", "message": "Sync queued" }`

---

### GET /knowledge/connectors/{id}/status
Get the current sync status for a connector.

**Response `200`**
```json
{ "status": "active", "lastSyncAt": "...", "documentsIndexed": 142, "errors": [] }
```

---

## Search

### POST /search
Perform a hybrid semantic + full-text search.

**Request**
```json
{
  "query": "employee onboarding process",
  "page": 1,
  "pageSize": 10,
  "filters": { "fileType": ["pdf", "docx"], "dateRange": { "from": "2025-01-01" } },
  "sourceFilter": "all"
}
```

**Response `200`**
```json
{
  "results": [{
    "id": "uuid", "title": "Onboarding Guide", "snippet": "...highlighted text...",
    "score": 0.92, "fileType": "pdf", "documentId": "uuid"
  }],
  "total": 23, "page": 1
}
```

---

### GET /search/suggest
Autocomplete suggestions for a partial query.

**Query params:** `q=onboar`
**Response `200`** `{ "suggestions": ["onboarding process", "onboarding checklist"] }`

---

## Voice

### POST /voice/sessions
Create a voice session.

**Response `201`** `{ "sessionId": "uuid" }`

---

### POST /voice/sessions/{id}/tts
Generate text-to-speech audio.

**Request** `{ "text": "Hello, how can I help you today?", "voiceId": "rachel" }`
**Response `200`** — audio/mpeg binary

---

### POST /voice/transcribe
Transcribe an uploaded audio file.

**Content-Type:** `multipart/form-data`, field `file`
**Response `200`** `{ "transcript": "What is our Q4 revenue target?" }`

---

## Meetings

### POST /meetings
Schedule or create a meeting.

**Request**
```json
{ "title": "Q4 Planning", "scheduledAt": "2026-04-15T14:00:00Z", "participants": ["uuid"] }
```

**Response `201`** — meeting object

---

### GET /meetings
List meetings (upcoming + past).

**Query params:** `status` (upcoming|past|all), `page`, `pageSize`

---

### GET /meetings/{id}/transcript
Get the full meeting transcript with speaker labels.

**Response `200`**
```json
{
  "segments": [{ "speaker": "Jane Smith", "text": "...", "startTime": 12.4, "endTime": 18.1 }]
}
```

---

### GET /meetings/{id}/recap
Get the AI-generated meeting recap.

**Response `200`**
```json
{
  "summary": "The team reviewed Q4 targets...",
  "keyDecisions": ["Increase marketing budget by 20%"],
  "actionItems": [{ "assignee": "Jane", "task": "Draft budget proposal", "dueDate": "..." }]
}
```

---

## Agents

### GET /agents
List all configured agents.

---

### POST /agents/{id}/execute
Execute an agent with a prompt.

**Request**
```json
{
  "prompt": "Research our competitors' pricing strategies",
  "attachments": [],
  "useWebSearch": true
}
```

**Response `200`**
```json
{
  "response": "Based on internal research and live web data...",
  "sources": { "internal": [...], "web": [...] },
  "executionId": "uuid"
}
```

---

### GET /agents/{id}/logs
Get execution logs for an agent.

**Response `200`** — array of execution log entries with tool calls and timing

---

## Workflows

### POST /workflows
Create a workflow definition.

**Request**
```json
{
  "name": "New Document Alert",
  "trigger": { "type": "new_document", "config": { "collectionId": "uuid" } },
  "steps": [{ "type": "ai_summarize" }, { "type": "slack_notification", "config": { "channel": "#general" } }]
}
```

**Response `201`** — workflow object

---

### POST /workflows/{id}/execute
Manually trigger a workflow.

**Response `202`** `{ "runId": "uuid", "status": "running" }`

---

### GET /workflows/{id}/runs
List all execution runs for a workflow.

---

## Analytics

### GET /analytics/usage
Usage metrics for the current organization.

**Query params:** `period` (7d|30d|90d), `granularity` (day|week)

**Response `200`**
```json
{
  "queries": { "total": 4821, "trend": "+12%" },
  "activeUsers": 34,
  "tokensUsed": 2847321,
  "topQueries": [{ "query": "Q4 targets", "count": 47 }]
}
```

---

### GET /analytics/ai-performance
AI response quality and latency metrics.

**Response `200`**
```json
{
  "avgResponseTime": 1.24,
  "qualityScore": 0.87,
  "feedbackBreakdown": { "thumbsUp": 412, "thumbsDown": 28 },
  "citationAccuracy": 0.91
}
```

---

### GET /analytics/knowledge-gaps
Questions asked that were not well-answered by existing content.

**Response `200`**
```json
{
  "gaps": [{ "query": "How do I request PTO?", "frequency": 23, "lastAsked": "..." }]
}
```

---

## Admin

All admin endpoints require `role: admin` or `role: super_admin`.

### GET /admin/users
List all users in the organization.

**Query params:** `page`, `pageSize`, `search`, `role`, `status`

---

### PUT /admin/users/{id}
Update a user's role or status.

**Request** `{ "role": "admin", "isActive": true }`
**Response `200`** — updated user object

---

### GET /admin/audit-logs
Retrieve the security audit log.

**Query params:** `page`, `pageSize`, `severity` (critical|warning|info), `from`, `to`

**Response `200`**
```json
{
  "logs": [{
    "action": "user.login", "userId": "uuid", "ip": "1.2.3.4",
    "severity": "info", "timestamp": "..."
  }]
}
```

---

### GET /admin/system-health
Real-time status of all infrastructure services.

**Response `200`**
```json
{
  "services": [{ "name": "PostgreSQL", "status": "healthy", "latencyMs": 2 }],
  "cpu": 34, "memory": 61, "disk": 42
}
```

---

## Billing

### GET /billing/subscription
Get the current subscription plan and usage.

**Response `200`**
```json
{
  "plan": "professional",
  "status": "active",
  "periodEnd": 1777654800,
  "usage": {
    "queries": { "used": 12840, "limit": 50000 },
    "storage_gb": { "used": 4.2, "limit": 100 }
  }
}
```

---

### POST /billing/subscription
Create or upgrade subscription.

**Request** `{ "plan": "professional", "payment_method_id": "pm_..." }`
**Response `200`** — updated subscription

---

### GET /billing/invoices
List invoice history.

**Response `200`** — array of invoices with amount, status, PDF URL

---

### GET /billing/plans
List all available plans with pricing and limits.

---

## Teams

### POST /teams
Create a team.

**Request** `{ "name": "Engineering", "description": "..." }`
**Response `201`** — team object (creator is auto-assigned as owner)

---

### GET /teams
List all teams in the organization.

---

### DELETE /teams/{id}
Delete a team (owner only).

**Response `204`**

---

## WebSocket

### WS /ws/notifications
Real-time in-app notification stream.

**Connect:** `ws://localhost:8010/ws/notifications?token=<access_token>`

**Messages from server:**
```json
{ "type": "notification", "notification_type": "success", "title": "Document ready", "body": "Q4 Plan.pdf has been indexed", "timestamp": "..." }
{ "type": "ping" }
```

**Messages from client:**
```json
{ "type": "pong" }
```

---

### WS /ws/chat/{conversation_id}
Chat room presence — typing indicators and online users.

**Messages from server:**
```json
{ "type": "presence", "online_users": ["user_id_1", "user_id_2"] }
{ "type": "typing", "user_id": "user_id_1", "is_typing": true }
```

**Messages from client:**
```json
{ "type": "typing", "is_typing": true }
```

---

### WS /ws/voice/{session_id}
Real-time voice — send audio chunks, receive transcription and TTS response.

**Binary frames:** PCM audio chunks (16kHz, 16-bit mono)

**JSON messages from server:**
```json
{ "type": "transcript", "text": "What is our Q4 target?", "is_final": true }
{ "type": "audio", "data": "<base64 MP3>", "text": "Our Q4 target is..." }
```

---

## Error Responses

All errors follow a consistent schema:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — validation error |
| `401` | Unauthorized — missing or invalid token |
| `402` | Payment Required — plan limit exceeded |
| `403` | Forbidden — insufficient role |
| `404` | Not found |
| `409` | Conflict — e.g. email already registered |
| `422` | Unprocessable entity — Pydantic validation failure |
| `429` | Too many requests — rate limited |
| `500` | Internal server error |
| `503` | Service unavailable — external API not configured |
