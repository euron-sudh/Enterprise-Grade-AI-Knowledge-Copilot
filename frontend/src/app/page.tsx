'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  Video,
  Database,
  Search,
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Users,
  Play,
  Menu,
  X,
  FileText,
  BookOpen,
  Loader2,
} from 'lucide-react';

// ─── Demo Modal ────────────────────────────────────────────────────────────────

const DEMO_SLIDES = [
  {
    id: 'chat',
    label: 'AI Chat',
    icon: MessageSquare,
    title: 'Ask anything. Get cited answers instantly.',
    description: 'RAG-powered chat searches your entire knowledge base and returns answers with source citations.',
    color: 'from-indigo-600 to-violet-600',
    content: <ChatDemo />,
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    icon: BookOpen,
    title: 'Upload once. Query forever.',
    description: 'Drop PDFs, docs, spreadsheets, or connect Slack, Notion, Google Drive — all indexed in seconds.',
    color: 'from-emerald-600 to-teal-600',
    content: <KnowledgeDemo />,
  },
  {
    id: 'search',
    label: 'Semantic Search',
    icon: Search,
    title: 'Find anything across all your sources.',
    description: 'Hybrid semantic + full-text search across every document, meeting, and conversation.',
    color: 'from-amber-600 to-orange-600',
    content: <SearchDemo />,
  },
  {
    id: 'voice',
    label: 'Voice Assistant',
    icon: Mic,
    title: 'Speak naturally. Get spoken answers.',
    description: 'Real-time speech-to-text with streaming AI responses and text-to-speech playback.',
    color: 'from-rose-600 to-pink-600',
    content: <VoiceDemo />,
  },
  {
    id: 'agents',
    label: 'AI Agents',
    icon: Bot,
    title: 'Autonomous agents for deep work.',
    description: 'Research Agent synthesizes multi-source reports. Writing Agent drafts in your brand voice.',
    color: 'from-cyan-600 to-blue-600',
    content: <AgentsDemo />,
  },
];

function ChatDemo() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const messages = [
    { role: 'user', text: "What's our Q4 revenue target and which products are driving growth?" },
    { role: 'ai', text: "Based on the **Q4 Financial Plan** and **Product Roadmap v3**, your Q4 revenue target is **$4.2M** — a 34% increase over Q3.\n\n**Top growth drivers:**\n• Enterprise tier upsells (+$1.1M projected)\n• KnowledgeForge Pro seats (+$890K)\n• API usage revenue (+$340K)\n\nThe Sales team deck notes that **APAC expansion** is the single largest upside opportunity this quarter.", citations: ['Q4 Financial Plan.pdf', 'Product Roadmap v3.docx', 'Sales Team Q4 Deck.pptx'] },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const aiMsg = messages[1]!;

  useEffect(() => {
    if (step === 2) {
      const full = aiMsg.text;
      let i = 0;
      const iv = setInterval(() => {
        i += 3;
        setTyped(full.slice(0, i));
        if (i >= full.length) clearInterval(iv);
      }, 18);
      return () => clearInterval(iv);
    }
  }, [step]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {step >= 1 && (
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[80%]">
            {messages[0]!.text}
          </div>
        </div>
      )}
      {step >= 2 && (
        <div className="flex flex-col gap-2">
          <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-100 max-w-[92%] whitespace-pre-wrap leading-relaxed">
            {typed.split('**').map((part, i) =>
              i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
            )}
            {typed.length < aiMsg.text.length && (
              <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
          {typed.length >= aiMsg.text.length && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(aiMsg.citations ?? []).map((c) => (
                <span key={c} className="flex items-center gap-1 text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3" />{c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {step < 2 && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Searching knowledge base...
        </div>
      )}
    </div>
  );
}

function KnowledgeDemo() {
  const files = [
    { name: 'Q4 Financial Plan.pdf', size: '2.4 MB', status: 'indexed', type: 'PDF' },
    { name: 'Product Roadmap v3.docx', size: '890 KB', status: 'indexed', type: 'DOCX' },
    { name: 'Engineering Specs.pdf', size: '5.1 MB', status: 'indexing', type: 'PDF' },
    { name: 'Customer Research.xlsx', size: '1.2 MB', status: 'queued', type: 'XLSX' },
  ];
  const [progress, setProgress] = useState(42);
  useEffect(() => {
    const iv = setInterval(() => setProgress(p => p >= 94 ? 94 : p + 2), 120);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="border-2 border-dashed border-white/20 rounded-xl p-4 flex items-center justify-center gap-3 text-gray-400 text-sm mb-1">
        <Database className="w-5 h-5 text-indigo-400" />
        Drop files or connect Google Drive, Notion, Slack...
      </div>
      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span className="text-xs font-bold bg-white/10 text-gray-300 px-1.5 py-0.5 rounded">{f.type}</span>
          <span className="text-sm text-gray-200 flex-1 truncate">{f.name}</span>
          <span className="text-xs text-gray-500">{f.size}</span>
          {f.status === 'indexed' && <span className="text-xs text-emerald-400 font-medium">✓ Indexed</span>}
          {f.status === 'indexing' && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-indigo-400">{progress}%</span>
            </div>
          )}
          {f.status === 'queued' && <span className="text-xs text-gray-500">Queued</span>}
        </div>
      ))}
    </div>
  );
}

function SearchDemo() {
  const query = 'enterprise security compliance';
  const [typed, setTyped] = useState('');
  const results = [
    { title: 'SOC 2 Type II Compliance Report', source: 'Confluence', snippet: '...our infrastructure meets all SOC 2 Type II requirements. Last audit completed March 2025 with zero critical findings...', score: 97 },
    { title: 'Security Architecture Overview', source: 'Google Drive', snippet: '...AES-256 encryption at rest, TLS 1.3 in transit. All data isolated per tenant with separate encryption keys...', score: 94 },
    { title: 'Enterprise Onboarding Checklist', source: 'Notion', snippet: '...security review required before provisioning enterprise accounts. Contact security@knowledgeforge.ai for compliance docs...', score: 88 },
  ];
  const [show, setShow] = useState(false);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(query.slice(0, i));
      if (i >= query.length) { clearInterval(iv); setTimeout(() => setShow(true), 400); }
    }, 60);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-white flex-1">{typed}<span className="animate-pulse">|</span></span>
      </div>
      {show && results.map((r, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-white">{r.title}</span>
            <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">{r.score}%</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">{r.source}</span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2">{r.snippet}</p>
        </div>
      ))}
    </div>
  );
}

function VoiceDemo() {
  const [phase, setPhase] = useState<'idle'|'listening'|'processing'|'speaking'>('idle');
  const [bars] = useState(() => Array.from({ length: 20 }, () => Math.random()));
  const [animBars, setAnimBars] = useState(bars);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('listening'), 600);
    const t2 = setTimeout(() => setPhase('processing'), 2800);
    const t3 = setTimeout(() => setPhase('speaking'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (phase !== 'listening') return;
    const iv = setInterval(() => {
      setAnimBars(Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8));
    }, 80);
    return () => clearInterval(iv);
  }, [phase]);

  const phaseLabel = { idle: 'Click to speak', listening: 'Listening...', processing: 'Thinking...', speaking: 'Speaking answer' };
  const phaseColor = { idle: 'bg-white/10', listening: 'bg-rose-600', processing: 'bg-indigo-600', speaking: 'bg-emerald-600' };

  return (
    <div className="flex flex-col items-center gap-5 h-full pt-2">
      <div className={`w-20 h-20 rounded-full ${phaseColor[phase]} flex items-center justify-center transition-all duration-300 shadow-lg ${phase === 'listening' ? 'ring-4 ring-rose-500/40 animate-pulse' : ''} ${phase === 'speaking' ? 'ring-4 ring-emerald-500/40' : ''}`}>
        <Mic className="w-9 h-9 text-white" />
      </div>
      <p className="text-sm text-gray-300">{phaseLabel[phase]}</p>
      <div className="flex items-end gap-0.5 h-10">
        {animBars.map((h, i) => (
          <div key={i} className={`w-1.5 rounded-full transition-all duration-75 ${phase === 'listening' ? 'bg-rose-400' : phase === 'speaking' ? 'bg-emerald-400' : 'bg-white/20'}`}
            style={{ height: phase === 'listening' || phase === 'speaking' ? `${h * 40}px` : '4px' }} />
        ))}
      </div>
      {phase === 'listening' && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 italic max-w-xs text-center">
          "Summarize last quarter's engineering highlights"
        </div>
      )}
      {(phase === 'processing' || phase === 'speaking') && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 max-w-xs leading-relaxed">
          Q3 engineering shipped <strong className="text-white">14 features</strong>, reduced API latency by <strong className="text-white">38%</strong>, and completed the SOC 2 audit — all ahead of schedule.
        </div>
      )}
    </div>
  );
}

function AgentsDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: Search, label: 'Searching knowledge base...', color: 'text-indigo-400' },
    { icon: FileText, label: 'Reading 8 relevant documents...', color: 'text-violet-400' },
    { icon: Bot, label: 'Synthesizing research report...', color: 'text-emerald-400' },
  ];
  const report = `# Competitive Analysis: AI Knowledge Tools

## Executive Summary
KnowledgeForge leads on **RAG accuracy** and **multi-modal ingestion** vs. Notion AI, Guru, and Confluence.

## Key Differentiators
- **Citation accuracy**: 94% vs industry avg 71%
- **Ingestion speed**: 100-page PDF in <60s
- **Voice + Video**: only platform with native support`;

  const [typed, setTyped] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1600);
    const t3 = setTimeout(() => setStep(3), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (step < 3) return;
    let i = 0;
    const iv = setInterval(() => {
      i += 4;
      setTyped(report.slice(0, i));
      if (i >= report.length) clearInterval(iv);
    }, 20);
    return () => clearInterval(iv);
  }, [step]);

  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
        <Bot className="w-4 h-4 text-indigo-400" />
        <span className="text-white font-medium">Research Agent</span>
        <span className="text-gray-500">•</span>
        "Competitive analysis for AI knowledge tools"
      </div>
      <div className="flex flex-col gap-1.5">
        {steps.slice(0, step).map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
              <Icon className={`w-3.5 h-3.5 ${s.color}`} />
              {s.label}
              <Check className="w-3 h-3 text-emerald-400 ml-auto" />
            </div>
          );
        })}
        {step < 3 && step > 0 && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" />{steps[step - 1]?.label}</div>}
      </div>
      {step >= 3 && typed && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-300 font-mono leading-relaxed overflow-hidden flex-1">
          {typed.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
          )}
          {typed.length < report.length && <span className="animate-pulse">▌</span>}
        </div>
      )}
    </div>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [key, setKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (i: number) => {
    setSlide(i);
    setKey(k => k + 1);
  };

  const prev = () => goTo((slide - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length);
  const next = () => goTo((slide + 1) % DEMO_SLIDES.length);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => {
        const n = (s + 1) % DEMO_SLIDES.length;
        setKey(k => k + 1);
        return n;
      });
    }, 7000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slide]);

  const current = DEMO_SLIDES[slide] ?? DEMO_SLIDES[0]!;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${current.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{current.title}</p>
              <p className="text-gray-400 text-xs">{current.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {DEMO_SLIDES.map((s, i) => {
            const TabIcon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goTo(i); }}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  i === slide
                    ? `border-indigo-500 text-white`
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Demo content */}
        <div className="p-6 h-72 overflow-hidden" key={key}>
          {current.content}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); prev(); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="flex gap-1.5">
            {DEMO_SLIDES.map((_, i) => (
              <button key={i} onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goTo(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-indigo-500 w-6' : 'bg-white/20'}`} />
            ))}
          </div>
          <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); next(); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              KnowledgeForge
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'Enterprise', 'Docs'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-b border-white/10 px-4 pb-6 pt-2 space-y-4">
          {['Features', 'Pricing', 'Enterprise', 'Docs'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block text-gray-300 hover:text-white text-sm font-medium py-1"
              onClick={() => setMobileOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link href="/login" className="text-gray-300 text-sm font-medium py-2">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg text-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-950 pt-16">
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-300 text-sm font-medium">
            Trusted by 500+ enterprises worldwide
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
          One AI brain for{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            your entire company.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-10">
          Eliminate knowledge silos. KnowledgeForge ingests every document, Slack thread,
          meeting, and codebase — then delivers instant, cited answers through chat, voice,
          and video.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            Start for Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button
            onClick={() => setShowDemo(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all backdrop-blur-sm"
          >
            <Play className="w-5 h-5 text-indigo-400" />
            Watch Demo
          </button>
        </div>

        {/* Chat Interface Mockup */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-30" />
          <div className="relative bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gray-900/80">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 text-center text-gray-500 text-xs">
                KnowledgeForge — AI Copilot
              </div>
            </div>

            {/* Chat Content */}
            <div className="p-6 space-y-4 text-left">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm text-sm">
                  What was decided in our Q1 planning meeting about the new pricing model?
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 max-w-lg">
                    Based on the Q1 Planning Meeting (Jan 15, 2026), the team decided to{' '}
                    <span className="text-indigo-300 font-medium">
                      introduce a usage-based pricing tier
                    </span>{' '}
                    alongside the existing flat-rate plans. Key decisions included a 14-day free
                    trial and a $49/mo Professional tier launching in Q2.
                  </div>
                  {/* Citations */}
                  <div className="flex flex-wrap gap-2">
                    {['Q1 Planning Meeting Transcript', 'Pricing Strategy Doc v3'].map((cite) => (
                      <span
                        key={cite}
                        className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full"
                      >
                        <Database className="w-3 h-3" />
                        {cite}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Follow-up suggestions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  'Who owns the pricing rollout?',
                  'What were the competing options?',
                  'Show related documents',
                ].map((s) => (
                  <button
                    key={s}
                    className="text-xs text-gray-400 bg-gray-800/80 hover:bg-gray-700 border border-white/5 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 bg-gray-800 border border-white/10 rounded-xl px-4 py-3">
                <input
                  type="text"
                  placeholder="Ask anything about your company knowledge..."
                  className="flex-1 bg-transparent text-gray-400 text-sm outline-none placeholder-gray-600"
                  readOnly
                />
                <Mic className="w-4 h-4 text-gray-500" />
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Logos Bar ─────────────────────────────────────────────────────────────────

function LogosBar() {
  const logos = ['Salesforce', 'Stripe', 'Notion', 'Vercel', 'Linear', 'Figma'];
  return (
    <section className="bg-gray-950 border-y border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500 text-sm font-medium uppercase tracking-widest mb-8">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-gray-500 hover:text-gray-300 font-bold text-lg tracking-tight transition-colors cursor-default"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ─────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI Chat',
      desc: 'RAG-powered answers with precise source citations. Multi-turn conversations up to 200k tokens. Streaming responses in under 500ms.',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      icon: Mic,
      title: 'Voice Assistant',
      desc: 'Hands-free voice interaction with Deepgram real-time STT and ElevenLabs natural TTS. Wake word, VAD, and 20+ languages.',
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      icon: Video,
      title: 'Meeting Intelligence',
      desc: 'Auto-transcribe, recap, and extract action items from every meeting. Integrates with Zoom, Teams, and Google Meet.',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Database,
      title: 'Knowledge Base',
      desc: '20+ connectors for Google Drive, Slack, Confluence, GitHub, Salesforce, and more. Every file format, fully indexed.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: Search,
      title: 'Enterprise Search',
      desc: 'Hybrid semantic + BM25 full-text search with cross-encoder reranking. Sub-200ms results across your entire knowledge graph.',
      gradient: 'from-teal-500 to-emerald-500',
    },
    {
      icon: Bot,
      title: 'AI Agents',
      desc: 'Build custom agents with no-code tools. Research, write, analyze data, or automate workflows — all with organizational context.',
      gradient: 'from-cyan-500 to-sky-500',
    },
  ];

  return (
    <section id="features" className="bg-gray-950 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-indigo-300 text-sm font-medium">Everything you need</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            The complete AI knowledge platform
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Every tool your team needs to capture, organize, and leverage collective
            intelligence — in one unified platform.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-gray-900 hover:bg-gray-800/80 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all duration-300 cursor-default"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg`}
              >
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Connect your knowledge sources',
      desc: 'Link your Google Drive, Slack, Notion, GitHub, Confluence, and 15+ other sources in minutes. KnowledgeForge continuously syncs and indexes all your content.',
      icon: Database,
    },
    {
      num: '02',
      title: 'Ask anything in natural language',
      desc: 'Type or speak your question naturally — no need to know where information lives. Our AI understands intent, context, and nuance across your entire knowledge graph.',
      icon: MessageSquare,
    },
    {
      num: '03',
      title: 'Get instant cited answers',
      desc: 'Receive accurate, context-rich answers with clickable source citations. Every response traces back to the original document, meeting, or message so you can verify.',
      icon: Zap,
    },
  ];

  return (
    <section className="bg-gray-900/50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Up and running in minutes
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Three simple steps to transform how your team accesses organizational knowledge.
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-16 left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
                  {/* Number circle */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <span className="text-white font-extrabold text-lg">{i + 1}</span>
                  </div>

                  <div>
                    <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">
                      Step {step.num}
                    </div>
                    <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ─────────────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { value: '< 500ms', label: 'Response time (p95)', icon: Zap },
    { value: '99.9%', label: 'Uptime SLA', icon: Shield },
    { value: '20+', label: 'Native integrations', icon: Globe },
    { value: '10,000+', label: 'Concurrent users', icon: Users },
  ];

  return (
    <section className="bg-gray-950 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-gray-900 to-violet-950 border border-indigo-500/20 px-8 py-16">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />

          <div className="relative text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Built for enterprise scale
            </h2>
            <p className="text-gray-400 text-lg">
              Infrastructure that performs when it matters most.
            </p>
          </div>

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────

function Testimonials() {
  const testimonials = [
    {
      initials: 'SK',
      name: 'Sarah Kim',
      role: 'VP of Engineering',
      company: 'Meridian Labs',
      quote:
        "KnowledgeForge cut our onboarding time by 60%. New engineers can now find answers to complex architecture questions in seconds instead of pinging senior devs all day.",
      color: 'from-indigo-500 to-violet-600',
    },
    {
      initials: 'MR',
      name: 'Marcus Rodriguez',
      role: 'Chief of Staff',
      company: 'Apex Consulting',
      quote:
        "We have 10 years of meeting recordings, Confluence pages, and email threads. KnowledgeForge surfaces exactly the right information every time. It's like having a perfect institutional memory.",
      color: 'from-violet-500 to-purple-600',
    },
    {
      initials: 'JP',
      name: 'Jennifer Park',
      role: 'Head of Customer Success',
      company: 'CloudPilot',
      quote:
        "Our support team uses KnowledgeForge to answer customer questions 3x faster. The citations give customers confidence, and the AI never makes up answers — it always cites sources.",
      color: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <section className="bg-gray-900/30 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Loved by teams worldwide
          </h2>
          <p className="text-gray-400 text-lg">
            Don't take our word for it — here's what our customers say.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-white/10 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for individuals exploring AI knowledge management.',
      cta: 'Start for Free',
      ctaHref: '/register',
      popular: false,
      features: [
        '100 AI queries / month',
        '50 MB document storage',
        '1 user',
        'PDF & DOCX upload',
        'Basic AI chat',
        'Community support',
      ],
    },
    {
      name: 'Professional',
      price: '$49',
      period: 'per seat / month',
      desc: 'For growing teams that need the full AI copilot experience.',
      cta: 'Start Free Trial',
      ctaHref: '/register?plan=professional',
      popular: true,
      features: [
        '50,000 AI queries / month',
        '100 GB document storage',
        'Up to 100 users',
        'All 20+ connectors',
        'Voice assistant',
        'Video intelligence',
        'AI agents',
        'Analytics dashboard',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'volume pricing',
      desc: 'For large organizations requiring enterprise-grade compliance and scale.',
      cta: 'Contact Sales',
      ctaHref: '/contact',
      popular: false,
      features: [
        'Unlimited queries',
        'Unlimited storage',
        'Unlimited users',
        'SAML 2.0 / SSO',
        'Custom AI models',
        'SOC 2 / HIPAA compliance',
        'Dedicated infrastructure',
        'SLA guarantee (99.95%)',
        'Dedicated success manager',
      ],
    },
  ];

  return (
    <section id="pricing" className="bg-gray-950 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Start free. Scale as your team grows. No surprise bills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                tier.popular
                  ? 'bg-gradient-to-b from-indigo-600/20 to-violet-600/10 border-2 border-indigo-500/50'
                  : 'bg-gray-900 border border-white/5'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">{tier.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{tier.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                  <span className="text-gray-400 text-sm mb-1">/{tier.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tier.popular ? 'bg-indigo-500/20' : 'bg-gray-800'
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${tier.popular ? 'text-indigo-400' : 'text-gray-400'}`}
                      />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  tier.popular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ────────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="bg-gray-950 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-8 py-16 sm:px-16 text-center">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
              Ready to unlock your company's
              <br />
              collective intelligence?
            </h2>
            <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
              Join 500+ enterprises already using KnowledgeForge to eliminate silos and
              move at the speed of knowledge.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 py-4 rounded-xl text-lg transition-all shadow-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-indigo-200 text-sm">
                No credit card required · 14-day free trial
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const columns = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Changelog', 'Roadmap', 'Security', 'Status'],
    },
    {
      title: 'Company',
      links: ['About', 'Blog', 'Careers', 'Press', 'Partners', 'Contact'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API Reference', 'Tutorials', 'Community', 'Webinars', 'Case Studies'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'HIPAA', 'SOC 2'],
    },
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">KnowledgeForge</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              The enterprise AI copilot that transforms how teams access and leverage
              organizational knowledge.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} KnowledgeForge, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['Twitter', 'LinkedIn', 'GitHub', 'Discord'].map((s) => (
              <a
                key={s}
                href="#"
                className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 antialiased">
      <Navbar />
      <main>
        <Hero />
        <LogosBar />
        <Features />
        <HowItWorks />
        <Stats />
        <Testimonials />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
