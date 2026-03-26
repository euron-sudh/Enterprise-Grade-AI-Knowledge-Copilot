import { Zap, Star } from 'lucide-react';

const releases = [
  {
    version: 'v2.4.0',
    date: 'March 20, 2026',
    badge: 'Latest',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    highlights: [
      'Gemini 2.0 Flash multimodal video analysis — transcript + visuals + chapters + summary in one pass',
      'Multi-model API keys — generate keys scoped to Claude, OpenAI, Gemini, Mistral, or Llama with per-key permissions',
      'Google and Microsoft OAuth sign-in — one-click authentication with your existing accounts',
      'JWT auto-refresh — sessions stay alive for 30 days without re-login',
    ],
    fixes: [
      'Fixed stale session causing "Failed to load videos" error in Video Library',
      'Fixed TypeScript type errors in video upload component',
      'Improved error messages throughout the app',
    ],
  },
  {
    version: 'v2.3.0',
    date: 'March 5, 2026',
    badge: null,
    highlights: [
      'Research Agent now supports live web search via Tavily (with DuckDuckGo fallback)',
      'File and image attachments in all AI Agents — drag-and-drop PDFs, DOCX, CSVs, images',
      'Workflow automation builder redesigned with improved drag-and-drop UX',
      'Added 3 new sidebar navigation items: API Keys, Settings, and Admin',
    ],
    fixes: [
      'Fixed sidebar highlight state not updating on navigation',
      'Improved streaming response stability in high-latency environments',
      'Fixed meeting transcript export not including speaker labels',
    ],
  },
  {
    version: 'v2.2.0',
    date: 'February 18, 2026',
    highlights: [
      'Video Library with AI-powered analysis using Gemini 2.0 Flash',
      'Fallback to OpenAI Whisper for audio-only transcription when no Google API key',
      'Video upload progress tracking with real-time status updates',
      'Video transcript indexed into RAG pipeline for instant retrieval in chat',
    ],
    fixes: [
      'Fixed race condition in document ingestion pipeline',
      'Improved chunking for large PDF documents (100+ pages)',
      'Fixed voice session cleanup on disconnect',
    ],
  },
  {
    version: 'v2.1.0',
    date: 'February 1, 2026',
    highlights: [
      'AI Agents marketplace with 6 pre-built agents (Research, Writing, Data Analyst, Support, Compliance, Onboarding)',
      'Real-time SSE streaming for all agent responses',
      'Knowledge Base connectors panel with step-by-step setup guides for 8 integrations',
      'Analytics dashboard with usage metrics, AI performance scores, and knowledge gap analysis',
    ],
    fixes: [
      'Fixed conversation branching losing context in multi-turn sessions',
      'Improved search relevance for short queries',
      'Fixed Redis cache invalidation on document deletion',
    ],
  },
  {
    version: 'v2.0.0',
    date: 'January 10, 2026',
    highlights: [
      'Complete UI redesign with dark mode and light mode support',
      'Multi-turn RAG conversations with source citations and conversation sharing',
      'Voice Assistant with Web Speech API and TTS',
      'Meeting Intelligence with real-time transcription and action item extraction',
      'Enterprise Search with hybrid semantic + BM25 full-text search',
      'Admin panel with user management and system health monitoring',
    ],
    fixes: [],
  },
  {
    version: 'v1.0.0',
    date: 'October 15, 2025',
    highlights: [
      'Initial public release',
      'AI Chat with RAG over PDF and DOCX documents',
      'Basic knowledge base with upload and indexing',
      'Email/password authentication',
      'PostgreSQL + pgvector backend',
    ],
    fixes: [],
  },
];

export default function ChangelogPage() {
  return (
    <div className="bg-gray-950 text-white">
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">What's new</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg">
            Every release, every improvement. We ship fast so you stay ahead.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/20 to-indigo-500/0" />

          <div className="space-y-16 pl-8">
            {releases.map((release) => (
              <div key={release.version} className="relative">
                {/* Dot */}
                <div className="absolute -left-[2.15rem] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />

                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="text-2xl font-extrabold text-white">{release.version}</h2>
                  {release.badge && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${release.badgeColor}`}>
                      {release.badge}
                    </span>
                  )}
                  <span className="text-gray-500 text-sm">{release.date}</span>
                </div>

                {/* Highlights */}
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-white font-semibold text-sm">What's new</span>
                  </div>
                  <ul className="space-y-2.5">
                    {release.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fixes */}
                {release.fixes.length > 0 && (
                  <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="text-gray-400 font-semibold text-sm mb-3">Bug fixes & improvements</div>
                    <ul className="space-y-2">
                      {release.fixes.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0 mt-2" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
