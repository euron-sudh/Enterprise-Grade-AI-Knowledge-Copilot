'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, ChevronRight, ExternalLink, FileSearch,
  Globe, Loader2, Search, Sparkles, ToggleLeft, ToggleRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { getToken } from '@/lib/api/client';

interface KBSource {
  id: string;
  documentName: string;
  documentType: string;
  chunkText: string;
  relevanceScore: number;
}

interface WebSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
  provider: string;
}

type Status = 'idle' | 'searching' | 'generating' | 'done' | 'error';

export default function ResearchAgentPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState('');
  const [kbSources, setKbSources] = useState<KBSource[]>([]);
  const [webSources, setWebSources] = useState<WebSource[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [webSearch, setWebSearch] = useState(true);
  const [activeTab, setActiveTab] = useState<'web' | 'kb'>('web');
  const reportRef = useRef<HTMLDivElement>(null);

  const handleRun = async () => {
    if (!query.trim() || status === 'searching' || status === 'generating') return;

    setStatus('searching');
    setReport('');
    setKbSources([]);
    setWebSources([]);
    setError('');
    setStatusMsg('Initializing research...');

    try {
      const token = await getToken();
      if (!token) { setError('Not authenticated. Please log in again.'); setStatus('error'); return; }

      const response = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000'}/agents/research/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query: query.trim(), web_search: webSearch }),
        }
      );

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.event === 'status') {
              setStatusMsg(payload.message);
              if (payload.message.includes('Generating')) setStatus('generating');
            } else if (payload.event === 'sources') {
              setKbSources(payload.sources ?? []);
            } else if (payload.event === 'web_sources') {
              setWebSources(payload.sources ?? []);
              setActiveTab('web');
            } else if (payload.event === 'delta') {
              setReport(prev => {
                const next = prev + payload.text;
                setTimeout(() => reportRef.current?.scrollTo({ top: reportRef.current.scrollHeight, behavior: 'smooth' }), 0);
                return next;
              });
            } else if (payload.event === 'done') {
              setStatus('done');
              setStatusMsg('');
            } else if (payload.event === 'error') {
              setError(payload.message);
              setStatus('error');
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
      setStatus('error');
    }
  };

  const isRunning = status === 'searching' || status === 'generating';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-surface-100 bg-white px-6 py-4 dark:border-surface-800 dark:bg-surface-950">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button size="icon-sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Research Agent</h1>
              <p className="text-xs text-surface-500">
                Knowledge base + real-time web search → AI-generated reports
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Web search toggle */}
            <button
              onClick={() => setWebSearch(v => !v)}
              disabled={isRunning}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                webSearch
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-surface-100 border-surface-200 text-surface-500 dark:bg-surface-800 dark:border-surface-700 dark:text-surface-400'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Web Search
              {webSearch
                ? <ToggleRight className="h-4 w-4 text-blue-500" />
                : <ToggleLeft className="h-4 w-4 text-surface-400" />}
            </button>
            <Badge dot variant="success">Active</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex w-80 shrink-0 flex-col border-r border-surface-100 bg-surface-50 dark:border-surface-800 dark:bg-surface-900">
          {/* Query input */}
          <div className="p-4 border-b border-surface-100 dark:border-surface-800">
            <label className="mb-2 block text-xs font-medium text-surface-600 dark:text-surface-400">
              Research Query
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-brand-400 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
              disabled={isRunning}
              placeholder="e.g. Latest trends in AI and machine learning in 2025"
              rows={4}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleRun(); }}
            />
            <Button
              className="mt-3 w-full"
              disabled={!query.trim() || isRunning}
              leftIcon={isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              onClick={handleRun}
            >
              {isRunning ? statusMsg : 'Run Research'}
            </Button>
            <p className="mt-1.5 text-center text-[10px] text-surface-400">⌘+Enter to run</p>

            {/* Source indicator */}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-surface-400">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Knowledge Base
              </span>
              {webSearch && (
                <>
                  <span>+</span>
                  <span className="flex items-center gap-1 text-blue-500">
                    <Globe className="h-3 w-3" /> Live Web
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sources tabs */}
          <div className="flex border-b border-surface-100 dark:border-surface-800">
            <button
              onClick={() => setActiveTab('web')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                activeTab === 'web'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Web ({webSources.length})
            </button>
            <button
              onClick={() => setActiveTab('kb')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                activeTab === 'kb'
                  ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
            >
              <FileSearch className="h-3.5 w-3.5" />
              Internal ({kbSources.length})
            </button>
          </div>

          {/* Sources list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'web' && (
              <>
                {webSources.length === 0 && status === 'idle' && (
                  <p className="text-xs text-surface-400 p-1">
                    {webSearch
                      ? 'Real-time web results will appear here after running a query.'
                      : 'Enable web search to see live results from the internet.'}
                  </p>
                )}
                {webSources.length === 0 && isRunning && statusMsg.toLowerCase().includes('web') && (
                  <div className="flex items-center gap-2 text-xs text-blue-500 p-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching the web...
                  </div>
                )}
                {webSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-surface-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all dark:border-surface-700 dark:bg-surface-800 dark:hover:border-blue-600"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300 line-clamp-2 leading-snug">
                        {src.title}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-surface-400 mt-0.5" />
                    </div>
                    <p className="line-clamp-2 text-[11px] text-surface-500 mb-1.5">{src.snippet}</p>
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-2.5 w-2.5 text-blue-400" />
                      <span className="text-[10px] text-blue-500 truncate">{src.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
                      <span className="ml-auto text-[9px] text-surface-400 bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded-full">
                        {src.provider}
                      </span>
                    </div>
                  </a>
                ))}
              </>
            )}

            {activeTab === 'kb' && (
              <>
                {kbSources.length === 0 && status === 'idle' && (
                  <p className="text-xs text-surface-400 p-1">
                    Sources from your knowledge base will appear here after running a query.
                  </p>
                )}
                {kbSources.map(src => (
                  <div
                    key={src.id}
                    className="rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-800"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-surface-700 dark:text-surface-300">
                        {src.documentName}
                      </span>
                      <Badge size="sm" variant="info">{Math.round(src.relevanceScore * 100)}%</Badge>
                    </div>
                    <p className="line-clamp-3 text-[11px] text-surface-500">{src.chunkText}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right panel — report */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {status === 'idle' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950">
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Ready to Research</h2>
                <p className="mt-1 text-sm text-surface-500 max-w-sm">
                  Enter any research question. The agent will search your knowledge base
                  {webSearch ? ' and the live web' : ''}, then generate a comprehensive AI report.
                </p>
              </div>
              {/* Example queries — mix of internal and external */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  'Latest AI trends in 2025',
                  'What are our internal security policies?',
                  'Best practices for microservices architecture',
                  'Summarize all uploaded documents',
                  'Current state of large language models',
                ].map(example => (
                  <button
                    key={example}
                    className="flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs text-surface-600 hover:border-brand-300 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400"
                    onClick={() => setQuery(example)}
                  >
                    <ChevronRight className="h-3 w-3" />
                    {example}
                  </button>
                ))}
              </div>

              {/* Feature pills */}
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-surface-400">
                  <Globe className="h-3.5 w-3.5 text-blue-400" /> Real-time web search
                </span>
                <span className="text-surface-300">·</span>
                <span className="flex items-center gap-1.5 text-xs text-surface-400">
                  <BookOpen className="h-3.5 w-3.5 text-brand-400" /> Knowledge base RAG
                </span>
                <span className="text-surface-300">·</span>
                <span className="flex items-center gap-1.5 text-xs text-surface-400">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" /> AI synthesis
                </span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-1 items-center justify-center p-8">
              <Card className="max-w-md text-center" variant="bordered">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Research failed</p>
                <p className="mt-1 text-xs text-surface-500">{error}</p>
                <Button className="mt-4" size="sm" variant="secondary" onClick={() => setStatus('idle')}>
                  Try again
                </Button>
              </Card>
            </div>
          )}

          {(isRunning || status === 'done') && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Report toolbar */}
              <div className="flex items-center justify-between border-b border-surface-100 bg-white px-4 py-2 dark:border-surface-800 dark:bg-surface-950">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Research Report</span>
                  {isRunning && (
                    <Badge variant="warning">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />{statusMsg}
                    </Badge>
                  )}
                  {status === 'done' && (
                    <>
                      {webSources.length > 0 && (
                        <Badge variant="info">
                          <Globe className="mr-1 h-3 w-3" />{webSources.length} web sources
                        </Badge>
                      )}
                      {kbSources.length > 0 && (
                        <Badge variant="success">
                          <BookOpen className="mr-1 h-3 w-3" />{kbSources.length} internal sources
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                {status === 'done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const blob = new Blob([report], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'research-report.md';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download .md
                  </Button>
                )}
              </div>

              {/* Report content */}
              <div ref={reportRef} className="flex-1 overflow-y-auto px-8 py-6">
                <div className="mx-auto max-w-3xl">
                  <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6 prose-p:text-surface-700 dark:prose-p:text-surface-300 prose-li:text-surface-700 dark:prose-li:text-surface-300 prose-strong:text-surface-900 dark:prose-strong:text-surface-100 prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </article>
                  {isRunning && (
                    <span className="mt-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-brand-500" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
