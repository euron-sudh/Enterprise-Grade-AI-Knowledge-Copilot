'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Lightbulb, TrendingUp, TrendingDown, Zap, Users, BookOpen, RefreshCw, Loader2 } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; bg: string }> = {
  opportunity: { icon: Users,        color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  trend:       { icon: TrendingUp,   color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  warning:     { icon: TrendingDown, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20'  },
  cost:        { icon: Zap,          color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20'},
};

interface Insight {
  id: string;
  type: string;
  title: string;
  desc: string;
  action: string;
  impact: string;
}

export default function AIInsightsPage() {
  const { data: session, status } = useSession();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [meta, setMeta] = useState({ totalInsights: 0, highImpact: 0, opportunities: 0, generatedAt: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    authFetch('/api/backend/analytics/insights', {}, (session as any)?.accessToken,
      { email: session?.user?.email, name: session?.user?.name })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setInsights(data.insights ?? []);
          setMeta({ totalInsights: data.totalInsights, highImpact: data.highImpact, opportunities: data.opportunities, generatedAt: data.generatedAt });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, session?.user?.email]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Insights</h1>
          <p className="text-gray-400 text-sm mt-1">
            {meta.generatedAt ? `Generated ${new Date(meta.generatedAt).toLocaleString()}` : 'AI-generated recommendations based on your usage patterns'}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Regenerate
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Insights',  value: String(meta.totalInsights),  color: 'text-white' },
          { label: 'High Impact',     value: String(meta.highImpact),      color: 'text-indigo-400' },
          { label: 'Opportunities',   value: String(meta.opportunities),   color: 'text-violet-400' },
          { label: 'Warnings',        value: String(insights.filter(i => i.type === 'warning').length), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insight cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading insights…
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Lightbulb className="w-10 h-10 mb-3 opacity-30" />
          <p>No insights yet. Upload documents and start chatting to generate insights.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map(insight => {
            const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.trend;
            const Icon = cfg.icon;
            return (
              <div key={insight.id} className={`border rounded-2xl p-5 ${cfg.bg}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-900/60 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold text-sm">{insight.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insight.impact === 'High' ? 'bg-indigo-500/20 text-indigo-400' : insight.impact === 'Positive' ? 'bg-green-500/20 text-green-400' : insight.impact === 'Cost Saving' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-400'}`}>
                        {insight.impact}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{insight.desc}</p>
                    <button className={`mt-3 text-sm font-medium ${cfg.color} hover:opacity-80 transition-opacity`}>{insight.action} →</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
