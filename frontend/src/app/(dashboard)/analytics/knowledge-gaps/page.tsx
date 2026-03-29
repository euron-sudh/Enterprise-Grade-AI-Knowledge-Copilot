'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { AlertCircle, FileQuestion, BookOpen, TrendingUp, Loader2, ArrowUpRight } from 'lucide-react';

interface GapSummary {
  totalAnswersWithoutSources: number;
  totalAnswers: number;
  gapRate: number;
}

interface GapTopic {
  query: string;
  count: number;
  answers: number;
  category: string;
  priority: string;
}

export default function KnowledgeGapsPage() {
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<GapSummary | null>(null);
  const [gaps, setGaps] = useState<GapTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => (session as any)?.accessToken;
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name });

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);
    authFetch('/api/backend/analytics/knowledge-gaps', {}, getToken(), getUser())
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSummary(d.summary ?? null);
          setGaps(Array.isArray(d.gaps) ? d.gaps : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, session?.user?.email]);

  const gapPct = summary ? Math.round(summary.gapRate * 100) : 0;
  const highPriority = gaps.filter(g => g.priority === 'high').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Knowledge Gaps</h1>
        <p className="text-gray-400 text-sm mt-1">Questions answered without source citations — indicating missing knowledge base content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Answers w/o Sources',
            value: loading ? '—' : String(summary?.totalAnswersWithoutSources ?? 0),
            color: 'text-red-400', icon: FileQuestion,
          },
          {
            label: 'Total Answers',
            value: loading ? '—' : String(summary?.totalAnswers ?? 0),
            color: 'text-amber-400', icon: AlertCircle,
          },
          {
            label: 'Gap Rate',
            value: loading ? '—' : `${gapPct}%`,
            color: 'text-orange-400', icon: TrendingUp,
          },
          {
            label: 'Gap Topics',
            value: loading ? '—' : String(gaps.length),
            color: 'text-indigo-400', icon: BookOpen,
          },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gap table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold">Knowledge Gap Details</h3>
          <span className="text-gray-500 text-xs">Based on unanswered / uncited AI responses</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : gaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {(summary?.totalAnswersWithoutSources ?? 0) === 0 && (summary?.totalAnswers ?? 0) === 0 ? (
              <>
                <FileQuestion className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">No conversations yet.</p>
                <p className="text-gray-600 text-xs mt-1">Start chatting with your knowledge base to surface gaps.</p>
              </>
            ) : (
              <>
                <BookOpen className="w-10 h-10 text-green-700 mb-3" />
                <p className="text-gray-400 text-sm font-medium">
                  {gapPct}% of answers lacked source citations
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {summary?.totalAnswersWithoutSources} of {summary?.totalAnswers} responses had no sources.
                  Upload more documents to improve coverage.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {gaps.map((gap, i) => (
              <div key={gap.query} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors">
                <span className="text-gray-600 text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{gap.query}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{gap.category}</span>
                    <span className="text-gray-600 text-xs">{gap.answers} answer{gap.answers !== 1 ? 's' : ''} found</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-white text-sm font-semibold">{gap.count}</div>
                    <div className="text-gray-600 text-xs">queries</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" /> How to Close Knowledge Gaps
        </h3>
        <div className="space-y-2">
          {[
            'Upload internal documentation, policies, and how-to guides to the knowledge base',
            'Connect data sources like Confluence, Notion, or Google Drive for automatic indexing',
            'Review AI chat conversations to identify common questions without good answers',
            'Ask subject-matter experts to contribute documents on frequently asked topics',
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowUpRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-sm">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
