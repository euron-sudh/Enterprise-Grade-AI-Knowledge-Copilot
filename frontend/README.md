# KnowledgeForge AI Copilot — Frontend

## Overview
This is the frontend for KnowledgeForge AI Copilot, built with Next.js 14+, TypeScript, Tailwind CSS, Zustand, and NextAuth.js. It provides the user interface for chat, voice, meetings, knowledge base, analytics, and admin features.

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+ (or yarn/pnpm)
- Backend API running (see ../backend/README.md)

### Setup
```bash
cd frontend
cp .env.example .env.local
npm install
```

### Development
```bash
npm run dev
```
- Runs the app in development mode at http://localhost:3000
- Hot reload enabled

### Linting & Formatting
```bash
npm run lint      # ESLint
npm run format    # Prettier
```

### Type Checking
```bash
npm run typecheck
```

### Testing
```bash
npm run test      # Unit tests (Vitest)
npm run test:e2e  # End-to-end tests (Playwright)
```

### Build for Production
```bash
npm run build
npm run start
```
- Runs optimized build at http://localhost:3000

### Docker
```bash
docker build -t knowledgeforge-frontend .
docker run -p 3000:3000 knowledgeforge-frontend
```

---

## Project Structure
- `src/app/` — Next.js App Router pages
- `src/components/` — UI and feature components
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utilities and API clients
- `src/stores/` — Zustand state stores
- `src/types/` — TypeScript types
- `src/tests/` — Unit, integration, and e2e tests

---

## Environment Variables
See `.env.example` for all available variables. Key ones:
- `NEXT_PUBLIC_API_URL` — Backend API URL
- `NEXT_PUBLIC_WS_URL` — WebSocket URL
- `NEXTAUTH_URL` — Auth callback URL

---

## Scripts
- `dev` — Start dev server
- `build` — Build for production
- `start` — Start production server
- `lint` — Lint code
- `format` — Format code
- `typecheck` — TypeScript check
- `test` — Run unit tests
- `test:e2e` — Run e2e tests

---

## Deployment
- Use Docker or Vercel/Netlify for deployment.
- For AWS EKS, see infrastructure/ and Dockerfile.
- CI/CD is set up via GitHub Actions (`.github/workflows/`).

---

## Features
- Multi-turn AI chat with RAG
- Voice assistant (STT/TTS)
- Meeting rooms & recaps
- Knowledge base management
- Video upload & Q&A
- Enterprise search
- AI agents & workflows
- Analytics dashboard
- Admin panel

---

## Contributing
Pull requests welcome! Please lint, typecheck, and test before submitting.

---

## License
© 2026 KnowledgeForge. All rights reserved.
