'use client';

import { Lightbulb, TrendingUp, TrendingDown, Zap, Users, BookOpen, MessageSquare, RefreshCw } from 'lucide-react';

const INSIGHTS = [
  {
    id: 1, type: 'opportunity', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
    title: 'Voice feature adoption 3x below benchmark',
    desc: 'Only 18% of your users have tried the voice assistant, compared to 54% industry average. Consider running an in-app tutorial to boost discoverability.',
    action: 'Create onboarding nudge', impact: 'High',
  },
  {
    id: 2, type: 'trend', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'AI chat engagement up 34% month-over-month',
    desc: 'Users are averaging 12 messages per conversation, up from 9 last month. Response quality scores also improved from 4.1 to 4.6/5.',
    action: 'View detailed metrics', impact: 'Positive',
  },
  {
    id: 3, type: 'warning', icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Knowledge base freshness declining',
    desc: '340 documents haven\'t been updated in 90+ days. Stale content reduces answer quality and user trust.',
    action: 'Review stale documents', impact: 'Medium',
  },
  {
    id: 4, type: 'opportunity', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    title: '8 power users dominate 60% of queries',
    desc: 'Your top 8 users account for the majority of usage. Expanding training to other teams could 4x overall engagement.',
    action: 'Identify expansion candidates', impact: 'High',
  },
  {
    id: 5, type: 'trend', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20',
    title: 'Engineering docs are most-cited knowledge',
    desc: 'Technical documentation accounts for 42% of all citations in chat responses. Consider expanding technical knowledge depth.',
    action: 'Add more technical docs', impact: 'Medium',
  },
  {
    id: 6, type: 'cost', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
    title: 'AI costs can be reduced 23% by model routing',
    desc: '67% of queries are simple Q&A that could use a lighter model (e.g. Claude Haiku). Current: $127/mo → Projected: $98/mo.',
    action: 'Enable smart model routing', impact: 'Cost Saving',
  },
];

export default function AIInsightsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Insights</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated recommendations based on your usage patterns</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm">
          <RefreshCw className="w-4 h-4" /> Regenerate
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Insights', value: INSIGHTS.length.toString(), color: 'text-white' },
          { label: 'High Impact', value: INSIGHTS.filter(i => i.impact === 'High').length.toString(), color: 'text-indigo-400' },
          { label: 'Cost Savings', value: '$29/mo', color: 'text-green-400' },
          { label: 'Opportunities', value: INSIGHTS.filter(i => i.type === 'opportunity').length.toString(), color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Insight cards */}
      <div className="space-y-4">
        {INSIGHTS.map(insight => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className={`border rounded-2xl p-5 ${insight.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gray-900/60 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold text-sm">{insight.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insight.impact === 'High' ? 'bg-indigo-500/20 text-indigo-400' : insight.impact === 'Cost Saving' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {insight.impact}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{insight.desc}</p>
                  <button className={`mt-3 text-sm font-medium ${insight.color} hover:opacity-80 transition-opacity`}>{insight.action} →</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
