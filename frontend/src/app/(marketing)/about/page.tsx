import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe, Users } from 'lucide-react';

const team = [
  {
    initials: 'AK',
    name: 'Alex Kim',
    role: 'CEO & Co-Founder',
    bio: 'Previously VP Engineering at Workday. Stanford CS. Passionate about making enterprise software that people actually love.',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    initials: 'SR',
    name: 'Sofia Reyes',
    role: 'CTO & Co-Founder',
    bio: 'Former AI Research Lead at Google Brain. PhD in Machine Learning, CMU. Built search systems used by billions.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    initials: 'JC',
    name: 'James Chen',
    role: 'Head of Product',
    bio: 'Previously PM at Notion and Figma. Obsessed with reducing friction between humans and information.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    initials: 'MP',
    name: 'Maya Patel',
    role: 'Head of Engineering',
    bio: 'Ex-Staff Engineer at Stripe. Built real-time systems at scale. Loves distributed systems and clean APIs.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    initials: 'DL',
    name: 'David Lee',
    role: 'Head of Sales',
    bio: 'Previously Enterprise Sales Director at Salesforce. Closed $50M+ in enterprise SaaS over 10 years.',
    gradient: 'from-teal-500 to-emerald-600',
  },
  {
    initials: 'EB',
    name: 'Emma Brooks',
    role: 'Head of Design',
    bio: 'Ex-Design Lead at Linear and Vercel. Believes enterprise software can be beautiful and delightful.',
    gradient: 'from-cyan-500 to-blue-600',
  },
];

const values = [
  {
    icon: Zap,
    title: 'Speed is a feature',
    desc: 'Every millisecond matters. We obsess over latency, responsiveness, and getting answers to your team faster than you think possible.',
  },
  {
    icon: Shield,
    title: 'Trust above all',
    desc: 'Your knowledge is your competitive advantage. We treat data security and privacy as first-class features, not afterthoughts.',
  },
  {
    icon: Globe,
    title: 'Built for everyone',
    desc: 'Enterprise doesn\'t mean complex. We build software that a new hire can use on day one without training.',
  },
  {
    icon: Users,
    title: 'Teams, not tools',
    desc: 'Great software brings people together. KnowledgeForge makes collective intelligence accessible to every person on your team.',
  },
];

const milestones = [
  { year: '2023', title: 'Founded', desc: 'Alex and Sofia started KnowledgeForge after watching enterprises lose millions to knowledge silos.' },
  { year: '2023', title: 'Seed Round', desc: 'Raised $4.2M seed from Sequoia and a16z to build the foundational RAG infrastructure.' },
  { year: '2024', title: 'Product Launch', desc: 'Launched publicly with AI Chat and Knowledge Base. 500 teams signed up in the first week.' },
  { year: '2024', title: 'Series A', desc: 'Raised $22M Series A. Added Voice Assistant, Meeting Intelligence, and 20+ integrations.' },
  { year: '2025', title: '500 enterprises', desc: 'Crossed 500 enterprise customers. Launched AI Agents and Workflow Automation.' },
  { year: '2026', title: 'Today', desc: 'Powering over 500 organizations worldwide. Expanding to new verticals and geographies.' },
];

export default function AboutPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="text-indigo-300 text-sm font-medium">Our story</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
          We believe every team deserves a{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            perfect memory.
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed mb-10">
          KnowledgeForge was founded by engineers who were tired of watching brilliant teams
          waste hours searching for information that already existed somewhere inside their
          organization. We built the AI copilot we always wished existed.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 pt-4">
          {[
            { value: '500+', label: 'Enterprise customers' },
            { value: '$26M', label: 'Total funding raised' },
            { value: '45', label: 'Team members' },
            { value: '3', label: 'Global offices' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-extrabold text-white mb-1">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-white/5 bg-gray-900/30 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-6">Our mission</h2>
          <p className="text-gray-300 text-xl leading-relaxed">
            To eliminate information silos and give every employee instant access to their
            organization's collective intelligence — so they can do the best work of their lives.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">What we believe</h2>
            <p className="text-gray-400 text-lg">The principles that guide every decision we make.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  <v.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-gray-900/30 border-y border-white/5 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Our journey</h2>
          </div>
          <div className="relative">
            <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/30 to-indigo-500/0" />
            <div className="space-y-10">
              {milestones.map((m) => (
                <div key={m.title + m.year} className="flex gap-8 items-start">
                  <div className="w-16 flex-shrink-0 text-right">
                    <span className="text-indigo-400 font-bold text-sm">{m.year}</span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0 mt-1 ring-4 ring-indigo-500/20" />
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{m.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Meet the team</h2>
            <p className="text-gray-400 text-lg">
              World-class engineers, designers, and operators obsessed with your success.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex gap-4"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
                >
                  {member.initials}
                </div>
                <div>
                  <div className="text-white font-bold">{member.name}</div>
                  <div className="text-indigo-400 text-xs font-medium mb-2">{member.role}</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-4">
            Join us in building the future of work.
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            We're hiring across engineering, design, sales, and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/careers"
              className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all"
            >
              View open roles
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Get in touch →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
