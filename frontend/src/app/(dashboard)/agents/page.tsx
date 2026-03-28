'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bot, Loader2, Send, X, Paperclip, FileText, FileImage,
  FileCode2, File, Globe, BookOpen, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { authFetch } from '@/lib/api/token';

/* ─── Agent definitions ─────────────────────────────────── */
const PREBUILT_AGENTS = [
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Deep research across your entire knowledge base with real-time web search and multi-step reasoning.',
    initials: 'RA',
    color: 'from-indigo-600 to-violet-600',
    tools: ['Knowledge Search', 'Web Search', 'Summarize', 'Citations'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp',
    fileHint: 'Attach PDFs, docs, images or data files to research',
  },
  {
    id: 'writing',
    name: 'Writing Agent',
    description: 'Drafts documents, emails, and reports using organizational context and brand voice guidelines.',
    initials: 'WA',
    color: 'from-emerald-600 to-teal-600',
    tools: ['Knowledge Search', 'Document Editor', 'Templates'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.pdf,.docx,.txt,.md',
    fileHint: 'Attach a draft or template to refine and improve',
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Answers employee and customer questions using knowledge base context, creates tickets when needed.',
    initials: 'SA',
    color: 'from-amber-600 to-orange-600',
    tools: ['Knowledge Search', 'Ticket Creation', 'Email'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.pdf,.txt,.png,.jpg,.jpeg',
    fileHint: 'Attach screenshots or error logs for troubleshooting',
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Queries databases, generates analysis reports, and surfaces business trends with recommendations.',
    initials: 'DA',
    color: 'from-rose-600 to-pink-600',
    tools: ['Database Query', 'Charts', 'Reports'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.csv,.xlsx,.json,.txt',
    fileHint: 'Attach CSV, Excel or JSON data files to analyze',
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    description: 'Checks documents and processes against compliance rules, highlights risks and gaps.',
    initials: 'CA',
    color: 'from-cyan-600 to-blue-600',
    tools: ['Policy Search', 'Risk Assessment', 'Reports'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.pdf,.docx,.txt,.md',
    fileHint: 'Attach policy docs or contracts to check compliance',
  },
  {
    id: 'onboarding',
    name: 'Onboarding Agent',
    description: 'Guides new employees through company policies, processes, and key documentation.',
    initials: 'OA',
    color: 'from-violet-600 to-purple-600',
    tools: ['Knowledge Search', 'Tutorials', 'Q&A'],
    endpoint: '/api/backend/agents/research/run',
    acceptedFiles: '.pdf,.docx,.txt,.md,.png,.jpg',
    fileHint: 'Attach onboarding materials or org charts',
  },
];

/* ─── Attached file state ───────────────────────────────── */
interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'image' | 'data' | 'text' | 'other';
  status: 'pending' | 'extracting' | 'ready' | 'error';
  extractedText?: string;
  previewUrl?: string;
  errorMsg?: string;
}

interface ResearchChunk {
  event: 'status' | 'sources' | 'web_sources' | 'delta' | 'done' | 'error';
  message?: string;
  sources?: Array<{ documentName: string; chunkText: string }>;
  text?: string;
  error?: string;
}

interface AgentSession {
  agentId: string;
  query: string;
  attachments: string[];
  status: string;
  sources: Array<{ documentName: string; chunkText: string }>;
  report: string;
  done: boolean;
  error: string;
}

/* ─── Helpers ───────────────────────────────────────────── */
function getFileType(file: File): AttachedFile['type'] {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.match(/\.(docx?|txt|md)$/)) return 'doc';
  if (name.match(/\.(png|jpg|jpeg|webp|gif)$/)) return 'image';
  if (name.match(/\.(csv|xlsx?|json)$/)) return 'data';
  if (name.match(/\.(txt|md|log)$/)) return 'text';
  return 'other';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICONS: Record<AttachedFile['type'], React.ElementType> = {
  pdf: FileText, doc: FileText, image: FileImage,
  data: FileCode2, text: FileText, other: File,
};
const FILE_COLORS: Record<AttachedFile['type'], string> = {
  pdf: 'text-red-400', doc: 'text-blue-400', image: 'text-purple-400',
  data: 'text-green-400', text: 'text-gray-400', other: 'text-gray-400',
};
const FILE_BG: Record<AttachedFile['type'], string> = {
  pdf: 'bg-red-900/20 border-red-800/40', doc: 'bg-blue-900/20 border-blue-800/40',
  image: 'bg-purple-900/20 border-purple-800/40', data: 'bg-green-900/20 border-green-800/40',
  text: 'bg-gray-800/40 border-gray-700/40', other: 'bg-gray-800/40 border-gray-700/40',
};

async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      // For images, return base64 marker
      reader.onload = () => resolve(`[IMAGE:${file.name}]`);
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text.slice(0, 8000)); // cap at 8k chars
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    }
  });
}

async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/* ─── Attached File Chip ────────────────────────────────── */
function FileChip({ af, onRemove }: { af: AttachedFile; onRemove: () => void }) {
  const Icon = FILE_ICONS[af.type];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${FILE_BG[af.type]} max-w-[200px]`}>
      {af.status === 'extracting' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 flex-shrink-0" />
      ) : af.status === 'error' ? (
        <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
      ) : (
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${FILE_COLORS[af.type]}`} />
      )}
      {af.type === 'image' && af.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={af.previewUrl} alt={af.name} className="h-6 w-6 rounded object-cover flex-shrink-0" />
      )}
      <span className="truncate text-gray-200">{af.name}</span>
      <span className="text-gray-500 flex-shrink-0">{af.size}</span>
      {af.status === 'ready' && <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
      <button
        onClick={onRemove}
        className="ml-0.5 flex-shrink-0 text-gray-500 hover:text-white transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function AgentsPage() {
  const { data: session } = useSession();
  const [activeAgent, setActiveAgent] = useState<typeof PREBUILT_AGENTS[0] | null>(null);
  const [agentSession, setAgentSession] = useState<AgentSession | null>(null);
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  /* ── File handling ── */
  const processFile = async (file: File, id: string) => {
    const type = getFileType(file);
    let previewUrl: string | undefined;
    if (type === 'image') previewUrl = URL.createObjectURL(file);

    setAttachedFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status: 'extracting' } : f
    ));

    try {
      let extractedText = '';
      if (type === 'image') {
        // Pass image description marker — actual base64 sent separately
        extractedText = await imageToBase64(file);
      } else {
        extractedText = await extractTextFromFile(file);
      }
      setAttachedFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'ready', extractedText, previewUrl } : f
      ));
    } catch {
      setAttachedFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error', errorMsg: 'Failed to read file' } : f
      ));
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files || !activeAgent) return;
    Array.from(files).forEach(file => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const af: AttachedFile = {
        id, file, name: file.name,
        size: formatSize(file.size),
        type: getFileType(file),
        status: 'pending',
      };
      setAttachedFiles(prev => [...prev, af]);
      void processFile(file, id);
    });
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter(x => x.id !== id);
    });
  };

  /* ── Run agent ── */
  const runAgent = async () => {
    if ((!query.trim() && attachedFiles.length === 0) || !activeAgent || running) return;

    const readyFiles = attachedFiles.filter(f => f.status === 'ready');
    const fileNames = readyFiles.map(f => f.name);

    // Build enriched query with file context
    let enrichedQuery = query.trim();
    const textFiles = readyFiles.filter(f => f.type !== 'image' && f.extractedText);
    if (textFiles.length > 0) {
      const fileContext = textFiles.map(f =>
        `\n\n--- Attached File: ${f.name} ---\n${f.extractedText}`
      ).join('');
      enrichedQuery = enrichedQuery
        ? `${enrichedQuery}\n\nContext from attached files:${fileContext}`
        : `Analyze and summarize the following attached files:${fileContext}`;
    }
    const imageFiles = readyFiles.filter(f => f.type === 'image');
    if (imageFiles.length > 0 && !enrichedQuery) {
      enrichedQuery = `Analyze and describe the attached image(s): ${imageFiles.map(f => f.name).join(', ')}`;
    }

    setRunning(true);
    setAgentSession({
      agentId: activeAgent.id,
      query: query.trim() || `Analyze: ${fileNames.join(', ')}`,
      attachments: fileNames,
      status: 'Starting...',
      sources: [],
      report: '',
      done: false,
      error: '',
    });

    try {
      const res = await authFetch(
        activeAgent.endpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: enrichedQuery,
            model: 'gpt-4o-mini',
            max_sources: 6,
            web_search: true,
          }),
        },
        session?.accessToken,
        getUser(),
      );

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
              if (chunk.event === 'status') return { ...prev, status: chunk.message || '' };
              if (chunk.event === 'sources') return { ...prev, sources: chunk.sources || [], status: 'Generating report...' };
              if (chunk.event === 'web_sources') return { ...prev, status: `Found web results. Generating report...` };
              if (chunk.event === 'delta') {
                setTimeout(() => {
                  if (reportRef.current) reportRef.current.scrollTop = reportRef.current.scrollHeight;
                }, 0);
                return { ...prev, report: prev.report + (chunk.text || '') };
              }
              if (chunk.event === 'done') return { ...prev, done: true, status: 'Complete' };
              if (chunk.event === 'error') return { ...prev, error: chunk.error || 'Error', done: true };
              return prev;
            });
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Agent failed';
      setAgentSession(prev => prev ? { ...prev, error: msg, done: true } : null);
    } finally {
      setRunning(false);
    }
  };

  // Clear files when switching agents
  const selectAgent = (agent: typeof PREBUILT_AGENTS[0]) => {
    attachedFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    setActiveAgent(agent);
    setAgentSession(null);
    setQuery('');
    setAttachedFiles([]);
  };

  const canRun = (query.trim() || attachedFiles.length > 0) && !running
    && attachedFiles.every(f => f.status !== 'extracting');

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">AI Agents</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">Autonomous AI agents powered by your knowledge base</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent list */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider mb-3">Available Agents</h2>
          <div className="space-y-2">
            {PREBUILT_AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => selectAgent(agent)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  activeAgent?.id === agent.id
                    ? 'border-indigo-600 bg-indigo-900/20'
                    : 'border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-surface-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${agent.color} text-white text-xs font-bold flex-shrink-0`}>
                    {agent.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{agent.name}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-400 truncate">{agent.description.split('.')[0]}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent workspace */}
        <div className="lg:col-span-2">
          {!activeAgent ? (
            <div className="flex flex-col items-center justify-center h-80 rounded-xl border border-dashed border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-900/50">
              <Bot className="h-12 w-12 text-surface-400 dark:text-gray-600 mb-3" />
              <p className="text-surface-500 dark:text-gray-400 font-medium">Select an agent to get started</p>
              <p className="text-surface-400 dark:text-gray-600 text-sm mt-1">Choose from the agents on the left</p>
            </div>
          ) : (
            <div
              className={`rounded-xl border bg-white dark:bg-gray-900 flex flex-col min-h-[520px] transition-colors ${
                dragOver ? 'border-indigo-500 bg-indigo-950/10' : 'border-surface-200 dark:border-gray-800'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              {/* Agent header */}
              <div className="flex items-center justify-between border-b border-surface-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${activeAgent.color} text-white text-xs font-bold`}>
                    {activeAgent.initials}
                  </div>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white text-sm">{activeAgent.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {activeAgent.tools.map(t => (
                        <span key={t} className="rounded-full bg-surface-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs text-surface-500 dark:text-gray-400">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Source badges */}
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800/50 rounded-full px-2 py-1">
                    <Globe className="h-3 w-3 text-blue-400" />Web
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800/50 rounded-full px-2 py-1">
                    <BookOpen className="h-3 w-3 text-indigo-400" />KB
                  </span>
                  <button
                    onClick={() => { selectAgent(activeAgent); }}
                    className="text-surface-400 dark:text-gray-500 hover:text-surface-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Output area */}
              <div ref={reportRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Drag overlay hint */}
                {dragOver && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Paperclip className="h-10 w-10 text-indigo-400 mb-2" />
                    <p className="text-sm font-medium text-indigo-300">Drop files to attach</p>
                    <p className="text-xs text-gray-500 mt-1">{activeAgent.fileHint}</p>
                  </div>
                )}

                {!dragOver && !agentSession && (
                  <div className="text-center py-8">
                    <p className="text-surface-500 dark:text-gray-400 text-sm">{activeAgent.description}</p>
                    <p className="text-surface-400 dark:text-gray-600 text-xs mt-2">
                      Enter your query or attach files below to start
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-600">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>{activeAgent.fileHint}</span>
                    </div>
                  </div>
                )}

                {agentSession && !dragOver && (
                  <>
                    {/* User query bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5">
                        <p className="text-sm text-white">{agentSession.query.split('\n\nContext from attached')[0] || agentSession.query}</p>
                        {agentSession.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {agentSession.attachments.map(name => (
                              <span key={name} className="flex items-center gap-1 rounded-full bg-indigo-500/50 px-2 py-0.5 text-[10px] text-indigo-100">
                                <Paperclip className="h-2.5 w-2.5" />{name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    {agentSession.status && !agentSession.done && (
                      <div className="flex items-center gap-2 text-sm text-indigo-400">
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        {agentSession.status}
                      </div>
                    )}

                    {/* KB Sources */}
                    {agentSession.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-surface-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Knowledge base sources ({agentSession.sources.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {agentSession.sources.map((s, i) => (
                            <span key={i} className="rounded-full bg-indigo-900/40 border border-indigo-800 px-2 py-0.5 text-xs text-indigo-300 truncate max-w-[200px]">
                              {s.documentName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Report */}
                    {agentSession.report && (
                      <div className="rounded-xl border border-surface-200 dark:border-gray-700 bg-surface-50 dark:bg-gray-800/50 p-4">
                        <div className="text-sm text-surface-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
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

              {/* Input area */}
              <div className="border-t border-surface-200 dark:border-gray-800 p-4 space-y-3">
                {/* Attached file chips */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map(af => (
                      <FileChip key={af.id} af={af} onRemove={() => removeFile(af.id)} />
                    ))}
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2">
                  {/* Attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={running}
                    title={activeAgent.fileHint}
                    className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={activeAgent.acceptedFiles}
                    className="hidden"
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                  />

                  <textarea
                    rows={1}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runAgent(); }
                    }}
                    placeholder={attachedFiles.length > 0
                      ? `Ask about the attached ${attachedFiles.length > 1 ? 'files' : 'file'}...`
                      : `Ask ${activeAgent.name} anything...`}
                    disabled={running}
                    className="flex-1 resize-none rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 max-h-32"
                    style={{ height: 'auto', minHeight: '36px' }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                    }}
                  />

                  <button
                    onClick={() => void runAgent()}
                    disabled={!canRun}
                    className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors h-9"
                  >
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Run
                  </button>
                </div>

                {/* File hint */}
                <p className="text-[10px] text-gray-600 flex items-center gap-1">
                  <Paperclip className="h-2.5 w-2.5" />
                  {activeAgent.fileHint} · Drag & drop or click the clip icon · Enter to send
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
