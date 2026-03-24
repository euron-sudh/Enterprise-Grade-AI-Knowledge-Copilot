'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mic,
  Video,
  Database,
  Search,
  Bot,
  ChevronRight,
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
} from 'lucide-react';

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
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-950 pt-16">
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
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all backdrop-blur-sm">
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
