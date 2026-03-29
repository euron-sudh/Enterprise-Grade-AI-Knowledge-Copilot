'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { TrendingUp, MessageSquare, Users, Zap, Download, Loader2 } from 'lucide-react';

interface TimeSeriesPoint { date: string; queries: number; users: number }
interface HourlyUsage { hour: number; count: number }
interface UsageData {
  totalQueries: number;
  queriesChange: number;
  activeUsers: number;
  activeUsersChange: number;
  documentsIndexed: number;
  avgResponseTimeMs: number;
  timeSeries: TimeSeriesPoint[];
  peakHours: HourlyUsage[];
}

const AVATAR_COLORS = [
  'from-pink-500 to-rose-600', 'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600', 'from-teal-500 to-emerald-600', 'from-cyan-500 to-blue-600',
];

export default function UsagePage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('Last 7 days');

  const getToken = () => (session as any)?.accessToken;
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name });

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);
    authFetch('/api/backend/analytics/usage', {}, getToken(), getUser())
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, session?.user?.email]);

  const timeSeries = data?.timeSeries ?? [];
  const maxQ = Math.max(...timeSeries.map(d => d.queries), 1);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      'date,queries,users',
      ...(data.timeSeries ?? []).map(d => `${d.date},${d.queries},${d.users}`),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'usage-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const fmtChange = (c: number) => c > 0 ? `+${c}%` : `${c}%`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usage Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Track platform usage, active users, and feature adoption</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year'].map(o => <option key={o}>{o}</option>)}
          </select>
          <button
            onClick={handleExport}
            disabled={loading || !data}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Queries', value: loading ? '—' : fmt(data?.totalQueries ?? 0), change: loading ? '' : fmtChange(data?.queriesChange ?? 0), icon: MessageSquare, color: 'text-indigo-400' },
          { label: 'Active Users', value: loading ? '—' : String(data?.activeUsers ?? 0), change: loading ? '' : fmtChange(data?.activeUsersChange ?? 0), icon: Users, color: 'text-green-400' },
          { label: 'Docs Indexed', value: loading ? '—' : String(data?.documentsIndexed ?? 0), change: '', icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Avg Latency', value: loading ? '—' : `${data?.avgResponseTimeMs ?? 0}ms`, change: '', icon: Zap, color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              {kpi.change && <span className={`text-xs font-medium ${kpi.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{kpi.change}</span>}
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-gray-500 text-xs mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-5">Query Volume Over Time</h3>
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No query data yet</div>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto">
            {timeSeries.map(d => (
              <div key={d.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-1">
                <span className="text-gray-600 text-xs hidden sm:block">{d.queries > 0 ? d.queries : ''}</span>
                <div
                  className="w-full bg-indigo-500/30 hover:bg-indigo-500/50 rounded-t-lg transition-colors cursor-pointer relative"
                  style={{ height: `${Math.max((d.queries / maxQ) * 100, 2)}%` }}
                >
                  <div className="w-full bg-indigo-500 rounded-t-lg absolute bottom-0" style={{ height: '40%' }} />
                </div>
                <span className="text-gray-600 text-xs">{d.date.slice(-5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak hours */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Peak Hours</h3>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : (data?.peakHours ?? []).every(h => h.count === 0) ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">No data yet</div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {(data?.peakHours ?? []).map(h => {
                const maxCount = Math.max(...(data?.peakHours ?? []).map(x => x.count), 1);
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-violet-500/40 hover:bg-violet-500/60 rounded-t transition-colors"
                      style={{ height: `${Math.max((h.count / maxCount) * 100, 2)}%` }}
                    />
                    <span className="text-gray-700 text-xs">{h.hour}h</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity by day */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Daily Breakdown</h3>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : timeSeries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">No query data yet</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...timeSeries].reverse().slice(0, 7).map((d, i) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-16 flex-shrink-0">{d.date}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(d.queries / maxQ) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm font-medium w-12 text-right">{d.queries}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
