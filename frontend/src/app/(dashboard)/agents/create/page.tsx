'use client';

import { useState } from 'react';
import { Bot, Zap, Search, Mail, Database, Globe, Code2, Calendar, FileText, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const TEMPLATES = [
  { id: 'research', icon: '🔍', name: 'Research Agent', desc: 'Deep research across your knowledge base with multi-step reasoning' },
  { id: 'writing', icon: '✍️', name: 'Writing Agent', desc: 'Draft documents, emails, and reports using organizational context' },
  { id: 'support', icon: '🤝', name: 'Support Agent', desc: 'Answer questions and create tickets from your knowledge base' },
  { id: 'onboarding', icon: '🎓', name: 'Onboarding Agent', desc: 'Guide new employees through company knowledge and processes' },
  { id: 'data', icon: '📊', name: 'Data Analyst', desc: 'Query databases, generate charts, and analyze trends' },
  { id: 'custom', icon: '⚙️', name: 'Custom Agent', desc: 'Build from scratch with full control over behavior and tools' },
];

const TOOLS = [
  { id: 'search', icon: Search, label: 'Knowledge Search', desc: 'Search across your knowledge base' },
  { id: 'email', icon: Mail, label: 'Send Email', desc: 'Draft and send emails' },
  { id: 'database', icon: Database, label: 'Database Query', desc: 'Query connected databases' },
  { id: 'web_search', icon: Globe, label: 'Web Search', desc: 'Search the internet' },
  { id: 'code', icon: Code2, label: 'Code Executor', desc: 'Run Python/JS code' },
  { id: 'calendar', icon: Calendar, label: 'Calendar Access', desc: 'Read/create calendar events' },
  { id: 'docs', icon: FileText, label: 'Document Creator', desc: 'Create and edit documents' },
  { id: 'api', icon: Globe, label: 'API Caller', desc: 'Call external REST APIs' },
];

export default function AgentCreatePage() {
  const [step, setStep] = useState<'template' | 'configure'>('template');
  const [selected, setSelected] = useState('');
  const [tools, setTools] = useState<string[]>(['search']);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  const toggleTool = (id: string) => setTools(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create AI Agent</h1>
          <p className="text-gray-400 text-sm">Configure a custom AI agent for your team</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3 text-sm">
        {[['template', '1', 'Choose Template'], ['configure', '2', 'Configure']].map(([s, n, label]) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (step === 'configure' && s === 'template') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {step === 'configure' && s === 'template' ? <Check className="w-3 h-3" /> : n}
            </div>
            <span className={step === s ? 'text-white font-medium' : 'text-gray-500'}>{label}</span>
            {s === 'template' && <ChevronRight className="w-3 h-3 text-gray-700" />}
          </div>
        ))}
      </div>

      {step === 'template' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelected(tmpl.id);
                  setName(tmpl.name);
                  setPrompt(tmpl.id === 'custom' ? '' : `You are a ${tmpl.name}. ${tmpl.desc}`);
                }}
                className={`p-5 rounded-2xl border text-left transition-all ${selected === tmpl.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-gray-900 hover:border-white/20'}`}
              >
                <div className="text-3xl mb-3">{tmpl.icon}</div>
                <div className="text-white font-semibold text-sm">{tmpl.name}</div>
                <div className="text-gray-500 text-xs mt-1">{tmpl.desc}</div>
                {selected === tmpl.id && <div className="mt-3 flex items-center gap-1 text-indigo-400 text-xs font-medium"><Check className="w-3 h-3" /> Selected</div>}
              </button>
            ))}
          </div>
          <button
            disabled={!selected}
            onClick={() => setStep('configure')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Continue →
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Agent Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">System Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              placeholder="Describe how this agent should behave, what it knows, and how it should respond..."
              className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">Available Tools</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOOLS.map(tool => {
                const Icon = tool.icon;
                const active = tools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${active ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-gray-900 hover:border-white/20'}`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${active ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{tool.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Model</label>
              <select className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                {['claude-sonnet-4-6', 'claude-opus-4-6', 'gpt-4o'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Knowledge Scope</label>
              <select className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                <option>All knowledge</option>
                <option>Engineering Docs only</option>
                <option>HR Policies only</option>
                <option>Custom collection</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('template')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl text-sm border border-white/10 transition-colors">Back</button>
            <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors">Create Agent</button>
          </div>
        </div>
      )}
    </div>
  );
}
