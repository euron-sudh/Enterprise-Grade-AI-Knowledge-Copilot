'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  FileText,
  Video,
  Code2,
  Users,
  Calendar,
  Filter,
  X,
  ExternalLink,
  Clock,
  Star,
  ChevronDown,
  Loader2,
  BookOpen,
  MessageSquare,
  Zap,
} from 'lucide-react';

type FilterTab = 'All' | 'Documents' | 'Videos' | 'Meetings' | 'Code' | 'People';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  sourceIcon: string;
  type: FilterTab;
  date: string;
  relevance: number;
  url: string;
  author?: string;
  tags?: string[];
}

const FILTER_TABS: { label: FilterTab; icon: React.ElementType; count: number }[] = [
  { label: 'All', icon: Search, count: 248 },
  { label: 'Documents', icon: FileText, count: 142 },
  { label: 'Videos', icon: Video, count: 31 },
  { label: 'Meetings', icon: MessageSquare, count: 54 },
  { label: 'Code', icon: Code2, count: 18 },
  { label: 'People', icon: Users, count: 3 },
];

const MOCK_RESULTS: SearchResult[] = [
  {
    id: '1',
    title: 'Engineering Onboarding Guide — Complete Handbook',
    excerpt: 'This guide covers everything a new <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">engineer</mark> needs to get started: dev environment setup, code review process, <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">onboarding</mark> checklist, and key contacts.',
    source: 'Confluence',
    sourceIcon: 'C',
    type: 'Documents',
    date: 'Mar 10, 2026',
    relevance: 98,
    url: '#',
    author: 'Sarah Chen',
    tags: ['engineering', 'onboarding', 'handbook'],
  },
  {
    id: '2',
    title: 'New Employee Onboarding — First 30 Days',
    excerpt: 'A structured plan for new hires covering <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">onboarding</mark> activities, team introductions, tool access setup, and performance expectations during the first month.',
    source: 'Notion',
    sourceIcon: 'N',
    type: 'Documents',
    date: 'Feb 28, 2026',
    relevance: 94,
    url: '#',
    author: 'HR Team',
    tags: ['hr', 'onboarding', 'new-hire'],
  },
  {
    id: '3',
    title: 'All-Hands Meeting — March 2026 Recording',
    excerpt: 'Full recording of the March all-hands. Topics include Q4 results, product roadmap, new hires <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">onboarding</mark> program updates, and engineering process changes.',
    source: 'Meetings',
    sourceIcon: 'M',
    type: 'Meetings',
    date: 'Mar 15, 2026',
    relevance: 87,
    url: '#',
    author: 'Alex Johnson',
    tags: ['all-hands', 'recording'],
  },
  {
    id: '4',
    title: 'Backend API Onboarding for New Developers',
    excerpt: 'Code walkthrough and architecture overview for engineers new to the backend codebase. Covers FastAPI structure, database models, and key <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">engineering</mark> patterns.',
    source: 'GitHub',
    sourceIcon: 'G',
    type: 'Code',
    date: 'Mar 5, 2026',
    relevance: 82,
    url: '#',
    author: 'Dev Team',
    tags: ['backend', 'api', 'guide'],
  },
  {
    id: '5',
    title: 'Engineering Onboarding Process — Video Walkthrough',
    excerpt: '45-minute video tutorial walking through the complete <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">engineering onboarding</mark> process including local dev setup, CI/CD pipeline, and deployment workflow.',
    source: 'Video Library',
    sourceIcon: 'V',
    type: 'Videos',
    date: 'Jan 20, 2026',
    relevance: 79,
    url: '#',
    author: 'Tech Leads',
    tags: ['video', 'tutorial', 'engineering'],
  },
  {
    id: '6',
    title: 'Sarah Chen — Senior Engineering Manager',
    excerpt: 'Owner of the <mark class="bg-yellow-300/20 text-yellow-200 rounded px-0.5">engineering onboarding</mark> program. Contact for new hire questions, team assignments, and mentorship pairing.',
    source: 'People Directory',
    sourceIcon: 'P',
    type: 'People',
    date: 'Active now',
    relevance: 75,
    url: '#',
    tags: ['engineering', 'manager'],
  },
];

const SUGGESTED_SEARCHES = [
  'GDPR compliance policy',
  'Q4 OKRs and targets',
  'Authentication architecture',
  'Customer escalation process',
  'API rate limiting docs',
  'Security incident response',
];

const SOURCE_ICONS: Record<string, string> = {
  C: 'bg-blue-600',
  N: 'bg-surface-200 dark:bg-gray-700',
  M: 'bg-green-700',
  G: 'bg-surface-100 dark:bg-gray-800',
  V: 'bg-red-700',
  P: 'bg-violet-700',
};

function RelevanceBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-emerald-400 bg-emerald-900/40' : score >= 75 ? 'text-amber-400 bg-amber-900/40' : 'text-surface-500 dark:text-gray-400 bg-surface-100 dark:bg-gray-800';
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {score}% match
    </span>
  );
}

export default function SearchPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [dateFilter, setDateFilter] = useState('Any time');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [results, setResults] = useState<SearchResult[]>(MOCK_RESULTS);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredResults = results.filter(r =>
    activeTab === 'All' || r.type === activeTab
  );

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q.trim()) return;
    setSubmittedQuery(q);
    setQuery(q);
    setIsSearching(true);
    setHasResults(false);
    try {
      const token = (session as any)?.accessToken ?? '';
      const res = await fetch('/api/backend/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: SearchResult[] = (data.results ?? []).map((r: any) => ({
          id: r.id ?? String(Math.random()),
          title: r.title ?? r.documentName ?? 'Untitled',
          excerpt: r.excerpt ?? r.chunkText ?? '',
          source: r.source ?? r.connectorType ?? 'Knowledge Base',
          type: r.type ?? 'Documents',
          date: r.date ?? r.updatedAt ?? '',
          relevance: Math.round((r.relevanceScore ?? r.score ?? 0.8) * 100),
          url: r.url,
          author: r.author,
          tags: r.tags,
        }));
        setResults(mapped.length > 0 ? mapped : MOCK_RESULTS);
      }
    } catch {
      setResults(MOCK_RESULTS);
    }
    setIsSearching(false);
    setHasResults(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSearch();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Enterprise Search</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">
            Search across all documents, meetings, code, and people
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-gray-500">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span>248,392 indexed items</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <div className="flex items-center gap-3 rounded-2xl border border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin flex-shrink-0" />
          ) : (
            <Search className="h-5 w-5 text-surface-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your entire knowledge base..."
            className="flex-1 bg-transparent text-base text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-600 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setHasResults(false); setSubmittedQuery(''); }}
              className="text-surface-400 dark:text-gray-500 hover:text-surface-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => void handleSearch()}
            disabled={!query.trim() || isSearching}
            className="flex-shrink-0 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-surface-900 dark:text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Source filter */}
        <div className="relative">
          <button
            onClick={() => setSourceFilter(sourceFilter === 'All sources' ? 'Confluence' : 'All sources')}
            className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            {sourceFilter}
            <ChevronDown className="h-3 w-3 text-surface-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Date filter */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-1.5 text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            {dateFilter}
            <ChevronDown className="h-3 w-3 text-surface-400 dark:text-gray-500" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full mt-1 left-0 z-10 w-40 rounded-xl border border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1">
              {['Any time', 'Today', 'This week', 'This month', 'This year'].map(d => (
                <button
                  key={d}
                  onClick={() => { setDateFilter(d); setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    dateFilter === d ? 'text-indigo-400 bg-indigo-950/50' : 'text-surface-600 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab filters */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.label
                ? 'bg-indigo-600 text-surface-900 dark:text-white'
                : 'bg-surface-100 dark:bg-gray-800 text-surface-500 dark:text-gray-400 hover:bg-surface-200 dark:hover:bg-gray-700 hover:text-surface-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {hasResults && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                activeTab === tab.label ? 'bg-white/20' : 'bg-surface-200 dark:bg-gray-700 text-surface-500 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results / Empty state */}
      {hasResults ? (
        <div className="space-y-3">
          <p className="text-xs text-surface-400 dark:text-gray-500 mb-4">
            {filteredResults.length} results for <span className="text-surface-600 dark:text-gray-300 font-medium">"{submittedQuery}"</span> · {dateFilter}
          </p>
          {filteredResults.map(result => (
            <div
              key={result.id}
              className="group rounded-2xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-surface-300 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-900/80 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Source icon */}
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-surface-900 dark:text-white ${SOURCE_ICONS[result.sourceIcon] ?? 'bg-surface-200 dark:bg-gray-700'}`}>
                  {result.sourceIcon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RelevanceBadge score={result.relevance} />
                      <a href={result.url} className="text-surface-400 dark:text-gray-600 hover:text-surface-500 dark:hover:text-gray-400 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  <p
                    className="text-xs text-surface-500 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.excerpt }}
                  />

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-surface-400 dark:text-gray-600">
                      <BookOpen className="h-3 w-3" />
                      {result.source}
                    </span>
                    {result.author && (
                      <span className="flex items-center gap-1 text-[11px] text-surface-400 dark:text-gray-600">
                        <Users className="h-3 w-3" />
                        {result.author}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-surface-400 dark:text-gray-600">
                      <Clock className="h-3 w-3" />
                      {result.date}
                    </span>
                    {result.tags?.map(tag => (
                      <span key={tag} className="text-[10px] text-surface-400 dark:text-gray-600 bg-surface-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isSearching ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-surface-500 dark:text-gray-400">Searching across all sources...</p>
        </div>
      ) : (
        /* Empty state with suggestions */
        <div className="flex flex-col items-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 mb-5">
            <Search className="h-7 w-7 text-surface-400 dark:text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Search your knowledge base</h2>
          <p className="text-sm text-surface-400 dark:text-gray-500 text-center max-w-md mb-8">
            Search across documents, videos, meetings, code repositories, and more using natural language or keywords.
          </p>
          <div className="w-full max-w-2xl">
            <p className="text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              Suggested searches
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTED_SEARCHES.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); void handleSearch(s); }}
                  className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-surface-500 dark:text-gray-400 text-left hover:border-surface-300 dark:hover:border-gray-700 hover:text-surface-700 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-gray-800 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
