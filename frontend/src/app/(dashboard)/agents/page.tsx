'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot,
  MessageSquare,
  Search,
  FileText,
  BarChart3,
  Users,
  Code2,
  Globe,
  Star,
  Activity,
  Loader2,
  Send,
  X,
  ChevronRight,
} from 'lucide-react';

interface ResearchChunk {
  type: 'status' | 'sources' | 'delta' | 'done' | 'error';
  message?: string;
  sources?: Array<{ fileName: string; chunkText: string }>;
  text?: string;
  error?: string;
}

const PREBUILT_AGENTS = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Deep research across your entire knowledge base with multi-step reasoning. Synthesizes information from multiple sources.',
    initials: 'RA',
    color: 'from-indigo-600 to-violet-600',
    tools: ['Knowledge Search', 'Web Search', 'Summarize', 'Citations'],
    endpoint: '/api/backend/agents/research/run',
  },
  {
    id: 'writing',
    name: 'Writing Agent',
    description: 'Drafts documents, emails, and reports using organizational context and brand voice guidelines.',
    initials: 'WA',
    color: 'from-emerald-600 to-teal-600',
    tools: ['Knowledge Search', 'Document Editor', 'Templates'],
    endpoint: '/api/backend/agents/research/run',
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Answers employee and customer questions using knowledge base context, creates tickets when needed.',
    initials: 'SA',
    color: 'from-amber-600 to-orange-600',
    tools: ['Knowledge Search', 'Ticket Creation', 'Email'],
    endpoint: '/api/backend/agents/research/run',
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Queries databases, generates analysis reports, and surfaces business trends with recommendations.',
    initials: 'DA',
    color: 'from-rose-600 to-pink-600',
    tools: ['Database Query', 'Charts', 'Reports'],
    endpoint: '/api/backend/agents/research/run',
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    description: 'Checks documents and processes against compliance rules, highlights risks and gaps.',
    initials: 'CA',
    color: 'from-cyan-600 to-blue-600',
    tools: ['Policy Search', 'Risk Assessment', 'Reports'],
    endpoint: '/api/backend/agents/research/run',
  },
  {
    id: 'onboarding',
    name: 'Onboarding Agent',
    description: 'Guides new employees through company policies, processes, and key documentation.',
    initials: 'OA',
    color: 'from-violet-600 to-purple-600',
    tools: ['Knowledge Search', 'Tutorials', 'Q&A'],
    endpoint: '/api/backend/agents/research/run',
  },
];

interface AgentSession {
  agentId: string;
  query: string;
  status: string;
  sources: Array<{ fileName: string; chunkText: string }>;
  report: string;
  done: boolean;
  error: string;
}

export default function AgentsPage() {
  const { data: session } = useSession();
  const [activeAgent, setActiveAgent] = useState<typeof PREBUILT_AGENTS[0] | null>(null);
  const [agentSession, setAgentSession] = useState<AgentSession | null>(null);
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const runAgent = async () => {
    if (!query.trim() || !activeAgent) return;
    setRunning(true);
    setAgentSession({
      agentId: activeAgent.id,
      query: query.trim(),
      status: 'Starting...',
      sources: [],
      report: '',
      done: false,
      error: '',
    });

    try {
      const res = await fetch(activeAgent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ query: query.trim(), model: 'gpt-4o-mini', max_sources: 6 }),
      });

      if (!res.ok) throw new Error('Agent request failed');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk: ResearchChunk = JSON.parse(line.slice(6));
            setAgentSession(prev => {
              if (!prev) return prev;
              if (chunk.type === 'status') return { ...prev, status: chunk.message || '' };
              if (chunk.type === 'sources') return { ...prev, sources: chunk.sources || [], status: 'Generating report...' };
              if (chunk.type === 'delta') return { ...prev, report: prev.report + (chunk.text || '') };
              if (chunk.type === 'done') return { ...prev, done: true, status: 'Complete' };
              if (chunk.type === 'error') return { ...prev, error: chunk.error || 'Error', done: true };
              return prev;
            });
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: any) {
      setAgentSession(prev => prev ? { ...prev, error: e.message, done: true } : null);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (reportRef.current) {
      reportRef.current.scrollTop = reportRef.current.scrollHeight;
    }
  }, [agentSession?.report]);

  return (
    <div className="min-h-full bg-gray-950 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Agents</h1>
        <p className="mt-1 text-sm text-gray-400">Autonomous AI agents powered by your knowledge base</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent grid */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Available Agents</h2>
          <div className="space-y-2">
            {PREBUILT_AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => { setActiveAgent(agent); setAgentSession(null); setQuery(''); }}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  activeAgent?.id === agent.id
                    ? 'border-indigo-600 bg-indigo-900/20'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${agent.color} text-white text-xs font-bold flex-shrink-0`}>
                    {agent.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                    <p className="text-xs text-gray-400 truncate">{agent.description.split('.')[0]}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent workspace */}
        <div className="lg:col-span-2">
          {!activeAgent ? (
            <div className="flex flex-col items-center justify-center h-80 rounded-xl border border-dashed border-gray-700 bg-gray-900/50">
              <Bot className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">Select an agent to get started</p>
              <p className="text-gray-600 text-sm mt-1">Choose from the agents on the left</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900 flex flex-col h-full min-h-[500px]">
              {/* Agent header */}
              <div className="flex items-center justify-between border-b border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${activeAgent.color} text-white text-xs font-bold`}>
                    {activeAgent.initials}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{activeAgent.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {activeAgent.tools.map(t => (
                        <span key={t} className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setActiveAgent(null); setAgentSession(null); }}
                  className="text-gray-500 hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Output area */}
              <div ref={reportRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {!agentSession && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">{activeAgent.description}</p>
                    <p className="text-gray-600 text-xs mt-2">Enter your query below to start</p>
                  </div>
                )}

                {agentSession && (
                  <>
                    <div className="rounded-lg bg-gray-800 p-3">
                      <p className="text-xs text-gray-400 mb-1">Your query:</p>
                      <p className="text-sm text-white">{agentSession.query}</p>
                    </div>

                    {agentSession.status && !agentSession.done && (
                      <div className="flex items-center gap-2 text-sm text-indigo-400">
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        {agentSession.status}
                      </div>
                    )}

                    {agentSession.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">Sources found ({agentSession.sources.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {agentSession.sources.map((s, i) => (
                            <span key={i} className="rounded-full bg-indigo-900/40 border border-indigo-800 px-2 py-0.5 text-xs text-indigo-300 truncate max-w-[200px]">
                              {s.fileName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {agentSession.report && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                        <p className="text-xs font-medium text-gray-400 mb-2">Report:</p>
                        <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {agentSession.report}
                          {!agentSession.done && <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />}
                        </div>
                      </div>
                    )}

                    {agentSession.error && (
                      <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
                        {agentSession.error}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Query input */}
              <div className="border-t border-gray-800 p-4">
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && runAgent()}
                    placeholder={`Ask ${activeAgent.name} anything...`}
                    disabled={running}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={runAgent}
                    disabled={running || !query.trim()}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Run
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
