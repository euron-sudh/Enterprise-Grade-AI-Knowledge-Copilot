'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  Users,
  Clock,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Activity,
  Target,
  FileText,
  Loader2,
  Zap,
} from 'lucide-react';

type DateRange = '7d' | '30d' | '90d';

interface DashboardData {
  usage: {
    totalQueries: number;
    activeUsers: number;
    avgResponseTime: number;
    documentsIndexed: number;
    queriesGrowth: number;
    usersGrowth: number;
  };
  aiPerformance: {
    avgQualityScore: number;
    citationAccuracy: number;
    avgLatencyMs: number;
    totalTokensUsed: number;
    estimatedCost: number;
  };
  knowledge: {
    totalDocuments: number;
    totalChunks: number;
    totalConnectors: number;
    connectorHealth: Array<{ name: string; status: string; lastSync: string }>;
  };
  topQueries: Array<{ query: string; count: number }>;
  timeSeries: Array<{ date: string; queries: number; users: number }>;
  knowledgeGaps: Array<{ topic: string; queryCount: number; coverage: number }>;
}

function StatCard({ label, value, change, icon: Icon, color, bg }: {
  label: string; value: string; change?: string; icon: React.ElementType; color: string; bg: string;
}) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : null}
          {change}
        </p>
      )}
    </div>
  );
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-32 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [range, setRange] = useState<DateRange>('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, gapsRes] = await Promise.all([
        fetch(`/api/backend/analytics/dashboard?range=${range}`, { headers: authHeader }),
        fetch(`/api/backend/analytics/knowledge?range=${range}`, { headers: authHeader }),
      ]);
      if (!dashRes.ok) throw new Error('Failed to load analytics');
      const dash = await dashRes.json();
      const knowledge = gapsRes.ok ? await gapsRes.json() : null;
      setData({ ...dash, knowledge: knowledge || dash.knowledge });
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, [range]);

  const maxQueryCount = data?.topQueries ? Math.max(...data.topQueries.map(q => q.count), 1) : 1;

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Real-time insights into knowledge usage and AI performance</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-700 bg-gray-800 p-0.5">
            {(['7d', '30d', '90d'] as DateRange[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === r ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={fetchDashboard}
            className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Queries" value={fmt(data.usage.totalQueries)}
              change={data.usage.queriesGrowth ? `${data.usage.queriesGrowth > 0 ? '+' : ''}${data.usage.queriesGrowth}%` : undefined}
              icon={MessageSquare} color="text-indigo-400" bg="bg-indigo-900/30" />
            <StatCard label="Active Users" value={fmt(data.usage.activeUsers)}
              change={data.usage.usersGrowth ? `${data.usage.usersGrowth > 0 ? '+' : ''}${data.usage.usersGrowth}%` : undefined}
              icon={Users} color="text-emerald-400" bg="bg-emerald-900/30" />
            <StatCard label="Avg Response Time" value={`${data.usage.avgResponseTime?.toFixed ? data.usage.avgResponseTime.toFixed(1) : data.usage.avgResponseTime}s`}
              icon={Clock} color="text-amber-400" bg="bg-amber-900/30" />
            <StatCard label="Documents Indexed" value={fmt(data.usage.documentsIndexed)}
              icon={BookOpen} color="text-violet-400" bg="bg-violet-900/30" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top Queries */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Top Queries</h3>
              {data.topQueries?.length > 0 ? (
                <div className="space-y-3">
                  {data.topQueries.slice(0, 8).map((q, i) => (
                    <MiniBar key={i} value={q.count} max={maxQueryCount} label={q.query} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No query data yet</p>
              )}
            </div>

            {/* AI Performance */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-white mb-4">AI Performance</h3>
              <div className="space-y-4">
                {data.aiPerformance && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Quality Score</span>
                      <span className="text-xs font-medium text-white">{(data.aiPerformance.avgQualityScore * 100)?.toFixed(0) ?? 'N/A'}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(data.aiPerformance.avgQualityScore * 100) || 0}%` }} />
                    </div>

                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Citation Accuracy</span>
                      <span className="text-xs font-medium text-white">{(data.aiPerformance.citationAccuracy * 100)?.toFixed(0) ?? 'N/A'}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(data.aiPerformance.citationAccuracy * 100) || 0}%` }} />
                    </div>

                    <div className="pt-2 border-t border-gray-800 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Avg Latency</span>
                        <span className="text-white">{data.aiPerformance.avgLatencyMs?.toFixed(0) ?? 'N/A'}ms</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Tokens Used</span>
                        <span className="text-white">{fmt(data.aiPerformance.totalTokensUsed || 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Est. Cost</span>
                        <span className="text-white">${(data.aiPerformance.estimatedCost || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Knowledge + Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Knowledge Base Health</h3>
              {data.knowledge && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-gray-800 p-3 text-center">
                      <p className="text-lg font-bold text-white">{fmt(data.knowledge.totalDocuments || 0)}</p>
                      <p className="text-xs text-gray-400">Documents</p>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-3 text-center">
                      <p className="text-lg font-bold text-white">{fmt(data.knowledge.totalChunks || 0)}</p>
                      <p className="text-xs text-gray-400">Chunks</p>
                    </div>
                    <div className="rounded-lg bg-gray-800 p-3 text-center">
                      <p className="text-lg font-bold text-white">{data.knowledge.totalConnectors || 0}</p>
                      <p className="text-xs text-gray-400">Connectors</p>
                    </div>
                  </div>
                  {data.knowledge.connectorHealth?.length > 0 && (
                    <div className="space-y-2">
                      {data.knowledge.connectorHealth.slice(0, 4).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{c.name}</span>
                          <span className={`rounded-full px-2 py-0.5 font-medium ${c.status === 'healthy' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Knowledge Gaps</h3>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              {data.knowledgeGaps?.length > 0 ? (
                <div className="space-y-2">
                  {data.knowledgeGaps.slice(0, 5).map((gap, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-white">{gap.topic}</p>
                        <p className="text-xs text-gray-400">{gap.queryCount} queries, {gap.coverage}% covered</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        gap.coverage < 30 ? 'bg-red-900/50 text-red-400' :
                        gap.coverage < 60 ? 'bg-amber-900/50 text-amber-400' :
                        'bg-emerald-900/50 text-emerald-400'
                      }`}>
                        {gap.coverage}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No knowledge gaps detected</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
