'use client';

import { useState } from 'react';
import { FileText, Plus, Download, Clock, Send, BarChart3, Users, Zap, TrendingUp, Trash2 } from 'lucide-react';

const REPORTS = [
  { id: '1', name: 'Weekly Usage Summary', schedule: 'Every Monday 9am', format: 'PDF', lastRun: 'Mar 24, 2026', recipients: 3, icon: BarChart3, color: 'from-indigo-500 to-violet-600' },
  { id: '2', name: 'Monthly AI Cost Report', schedule: '1st of month', format: 'Excel', lastRun: 'Mar 1, 2026', recipients: 2, icon: Zap, color: 'from-amber-500 to-orange-600' },
  { id: '3', name: 'User Engagement Digest', schedule: 'Every Friday 5pm', format: 'Email', lastRun: 'Mar 22, 2026', recipients: 5, icon: Users, color: 'from-green-500 to-emerald-600' },
  { id: '4', name: 'Knowledge Gap Analysis', schedule: 'Monthly', format: 'PDF', lastRun: 'Mar 1, 2026', recipients: 4, icon: TrendingUp, color: 'from-cyan-500 to-blue-600' },
];

const TEMPLATES = [
  { name: 'Executive Summary', desc: 'High-level KPIs for leadership', icon: '📊' },
  { name: 'Team Performance', desc: 'Per-team usage and engagement', icon: '👥' },
  { name: 'Cost & ROI Analysis', desc: 'AI spend vs time saved', icon: '💰' },
  { name: 'Security Audit Report', desc: 'Access logs, anomalies, compliance', icon: '🔒' },
  { name: 'Knowledge Coverage', desc: 'Coverage heatmap by department', icon: '📚' },
  { name: 'Custom Report', desc: 'Build your own from scratch', icon: '⚙️' },
];

export default function ReportsPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Scheduled reports and custom analytics exports</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> Create Report
        </button>
      </div>

      {/* Scheduled reports */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold">Scheduled Reports</h3>
        {REPORTS.map(report => {
          const Icon = report.icon;
          return (
            <div key={report.id} className="bg-gray-900 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">{report.name}</div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{report.schedule}</span>
                  <span className="text-gray-500 text-xs flex items-center gap-1"><Send className="w-3 h-3" />{report.recipients} recipients</span>
                  <span className="text-gray-500 text-xs">Last: {report.lastRun}</span>
                </div>
              </div>
              <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full flex-shrink-0">{report.format}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report templates */}
      {showCreate && (
        <div>
          <h3 className="text-white font-semibold mb-3">Choose a Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.name}
                onClick={() => setShowCreate(false)}
                className="bg-gray-900 border border-white/5 hover:border-indigo-500/50 rounded-xl p-5 text-left transition-colors group"
              >
                <div className="text-3xl mb-3">{tmpl.icon}</div>
                <div className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-colors">{tmpl.name}</div>
                <div className="text-gray-500 text-xs mt-1">{tmpl.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent exports */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Recent Exports</h3>
        <div className="space-y-2">
          {[
            { name: 'usage-report-march-2026.pdf', size: '2.4 MB', time: '2 hours ago', type: 'PDF' },
            { name: 'ai-costs-feb-2026.xlsx', size: '840 KB', time: '1 week ago', type: 'Excel' },
            { name: 'engagement-digest-2026-03-22.html', size: '156 KB', time: '5 days ago', type: 'Email' },
          ].map(file => (
            <div key={file.name} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">{file.name}</div>
                <div className="text-gray-600 text-xs">{file.size} · {file.time}</div>
              </div>
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{file.type}</span>
              <button className="p-1 text-gray-500 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
