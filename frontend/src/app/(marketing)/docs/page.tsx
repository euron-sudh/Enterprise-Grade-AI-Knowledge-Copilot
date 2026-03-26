import Link from 'next/link';
import { BookOpen, MessageSquare, Mic, Video, Database, Search, Bot, Zap, Key, Shield, ArrowRight } from 'lucide-react';

const sections = [
  {
    icon: Zap,
    title: 'Getting Started',
    desc: 'Set up KnowledgeForge in minutes. Install, configure, and make your first AI query.',
    color: 'from-indigo-500 to-violet-500',
    articles: [
      'Quick start guide',
      'Environment setup',
      'Connecting your first data source',
      'Making your first AI query',
      'Inviting team members',
    ],
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    desc: 'Multi-turn RAG conversations, source citations, streaming responses, and sharing.',
    color: 'from-violet-500 to-purple-500',
    articles: [
      'How RAG works',
      'Writing effective queries',
      'Understanding citations',
      'Conversation branching',
      'Exporting conversations',
    ],
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    desc: 'Uploading documents, configuring connectors, and managing collections.',
    color: 'from-amber-500 to-orange-500',
    articles: [
      'Uploading documents (PDF, DOCX, XLSX)',
      'Configuring Google Drive connector',
      'Configuring Slack connector',
      'Configuring Confluence connector',
      'Creating knowledge collections',
    ],
  },
  {
    icon: Search,
    title: 'Enterprise Search',
    desc: 'Hybrid semantic and full-text search across all your organizational knowledge.',
    color: 'from-teal-500 to-emerald-500',
    articles: [
      'How hybrid search works',
      'Search operators and filters',
      'Saving searches with alerts',
      'Search analytics',
      'Integrating search via API',
    ],
  },
  {
    icon: Bot,
    title: 'AI Agents',
    desc: 'Building and configuring custom AI agents for research, writing, and automation.',
    color: 'from-cyan-500 to-blue-500',
    articles: [
      'Using the Research Agent',
      'Using the Writing Agent',
      'Building a custom agent',
      'Attaching files to agents',
      'Agent execution logs',
    ],
  },
  {
    icon: Mic,
    title: 'Voice Assistant',
    desc: 'Real-time speech-to-text, voice commands, and text-to-speech responses.',
    color: 'from-rose-500 to-pink-500',
    articles: [
      'Browser permissions setup',
      'Voice commands reference',
      'Configuring TTS voice',
      'Push-to-talk mode',
      'Multi-language support',
    ],
  },
  {
    icon: Video,
    title: 'Video & Meetings',
    desc: 'Uploading videos for AI analysis and using Meeting Intelligence features.',
    color: 'from-pink-500 to-rose-500',
    articles: [
      'Uploading videos (Gemini 2.0)',
      'Understanding video analysis',
      'Meeting transcription',
      'Extracting action items',
      'Searching meeting content',
    ],
  },
  {
    icon: Key,
    title: 'API & Integrations',
    desc: 'Generating API keys, making API calls, and building custom integrations.',
    color: 'from-gray-500 to-slate-500',
    articles: [
      'Generating API keys',
      'Authentication guide',
      'Chat API reference',
      'Search API reference',
      'Webhook configuration',
    ],
  },
  {
    icon: Shield,
    title: 'Security & Admin',
    desc: 'User management, RBAC, SSO configuration, and audit logging.',
    color: 'from-green-500 to-teal-500',
    articles: [
      'Configuring SAML SSO',
      'Role-based access control',
      'MFA setup',
      'Audit log viewer',
      'Data governance policies',
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-sm font-medium">Documentation</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          KnowledgeForge Docs
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">
          Everything you need to get started, integrate, and get the most out of KnowledgeForge.
        </p>

        {/* Search bar (decorative) */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 bg-gray-900 border border-white/10 rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-600 text-sm text-left flex-1">Search documentation...</span>
            <kbd className="text-gray-600 text-xs bg-gray-800 px-2 py-1 rounded">⌘K</kbd>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8" id="tutorials">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            {[
              { title: 'Quick Start', desc: 'Up and running in 5 minutes', href: '#getting-started' },
              { title: 'API Reference', href: 'http://localhost:8010/docs', desc: 'Interactive Swagger UI', external: true },
              { title: 'Video Tutorials', desc: 'Step-by-step walkthroughs', href: '#video' },
            ].map((link) => (
              <Link
                key={link.title}
                href={link.href}
                target={(link as any).external ? '_blank' : undefined}
                rel={(link as any).external ? 'noopener noreferrer' : undefined}
                className="group flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-4 transition-all"
              >
                <div>
                  <div className="text-white font-semibold text-sm">{link.title}</div>
                  <div className="text-indigo-400 text-xs">{link.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Docs grid */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold mb-8">Browse by topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div
                key={section.title}
                className="bg-gray-900 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{section.title}</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">{section.desc}</p>
                <ul className="space-y-1.5">
                  {section.articles.map((article) => (
                    <li key={article}>
                      <a
                        href="#"
                        className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors flex items-center gap-1"
                      >
                        → {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Need help */}
      <section className="border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-3">Can't find what you need?</h2>
          <p className="text-gray-400 mb-6">Our support team typically responds in under 4 hours.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-all"
          >
            Contact Support →
          </Link>
        </div>
      </section>
    </div>
  );
}
