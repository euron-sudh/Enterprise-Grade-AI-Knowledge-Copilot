'use client';

import { AlertCircle, Search, TrendingUp, FileQuestion, BookOpen, Plus, ArrowUpRight } from 'lucide-react';

const GAPS = [
  { query: 'How to set up SSO with Okta?', count: 47, answers: 0, category: 'IT/Auth', trend: 'up', priority: 'high' },
  { query: 'Q1 2026 OKR review template', count: 38, answers: 0, category: 'HR', trend: 'up', priority: 'high' },
  { query: 'Incident escalation procedure', count: 31, answers: 1, category: 'Engineering', trend: 'stable', priority: 'medium' },
  { query: 'Expense reimbursement policy', count: 28, answers: 0, category: 'Finance', trend: 'up', priority: 'high' },
  { query: 'AWS cost optimization guide', count: 24, answers: 2, category: 'Engineering', trend: 'stable', priority: 'medium' },
  { query: 'Customer onboarding checklist', count: 21, answers: 0, category: 'Sales', trend: 'down', priority: 'medium' },
  { query: 'Data retention schedule', count: 18, answers: 0, category: 'Legal', trend: 'stable', priority: 'low' },
  { query: 'Vendor evaluation criteria', count: 15, answers: 1, category: 'Procurement', trend: 'up', priority: 'low' },
];

const categoryColors: Record<string, string> = {
  'IT/Auth': 'bg-indigo-500/20 text-indigo-400',
  'HR': 'bg-pink-500/20 text-pink-400',
  'Engineering': 'bg-cyan-500/20 text-cyan-400',
  'Finance': 'bg-green-500/20 text-green-400',
  'Sales': 'bg-amber-500/20 text-amber-400',
  'Legal': 'bg-red-500/20 text-red-400',
  'Procurement': 'bg-violet-500/20 text-violet-400',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-gray-700 text-gray-400',
};

export default function KnowledgeGapsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Knowledge Gaps</h1>
        <p className="text-gray-400 text-sm mt-1">Frequently asked questions that have no or low-quality answers in your knowledge base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Unanswered Queries', value: '222+', color: 'text-red-400', icon: FileQuestion },
          { label: 'Unique Gap Topics', value: GAPS.length.toString(), color: 'text-amber-400', icon: AlertCircle },
          { label: 'High Priority', value: GAPS.filter(g => g.priority === 'high').length.toString(), color: 'text-orange-400', icon: TrendingUp },
          { label: 'Docs Needed', value: '12', color: 'text-indigo-400', icon: BookOpen },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top gaps */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold">Top Knowledge Gaps</h3>
          <span className="text-gray-500 text-xs">Sorted by query frequency</span>
        </div>
        <div className="divide-y divide-white/5">
          {GAPS.map((gap, i) => (
            <div key={gap.query} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors">
              <span className="text-gray-600 text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{gap.query}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[gap.category] || 'bg-gray-700 text-gray-400'}`}>{gap.category}</span>
                  <span className="text-gray-600 text-xs">{gap.answers} answer{gap.answers !== 1 ? 's' : ''} found</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColors[gap.priority]}`}>{gap.priority}</span>
                <div className="text-right">
                  <div className="text-white text-sm font-semibold">{gap.count}</div>
                  <div className="text-gray-600 text-xs">queries</div>
                </div>
                <button className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-400" /> Recommended Actions</h3>
        <div className="space-y-2">
          {[
            'Create an "SSO Setup Guide" document covering Okta, Google, and Microsoft integrations',
            'Add Q1 2026 OKR template to the HR Knowledge collection',
            'Update the Finance collection with a detailed expense policy',
            'Ask your IT team to document the incident escalation procedure',
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <ArrowUpRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-sm">{rec}</span>
            </div>
          ))}
        </div>
        <button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
          Generate Document Drafts with AI
        </button>
      </div>
    </div>
  );
}
