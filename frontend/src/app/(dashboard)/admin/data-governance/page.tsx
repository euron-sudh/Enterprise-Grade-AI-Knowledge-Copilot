'use client';

import { useState } from 'react';
import { Database, Shield, Clock, Trash2, Archive, Eye, Plus, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';

const POLICIES = [
  { id: '1', name: 'PII Auto-Redaction', type: 'Data Masking', status: 'active', applies: 'All documents', trigger: 'On ingest', lastRun: '5 min ago' },
  { id: '2', name: '90-Day Chat Retention', type: 'Retention', status: 'active', applies: 'Chat messages', trigger: 'Scheduled daily', lastRun: '6 hours ago' },
  { id: '3', name: '2-Year Document Archive', type: 'Archival', status: 'active', applies: 'Knowledge Base', trigger: 'Scheduled weekly', lastRun: '2 days ago' },
  { id: '4', name: 'HIPAA Data Classification', type: 'Classification', status: 'inactive', applies: 'All documents', trigger: 'On ingest', lastRun: 'Never' },
  { id: '5', name: 'Legal Hold', type: 'Legal Hold', status: 'active', applies: 'Tagged documents', trigger: 'Manual', lastRun: '1 week ago' },
];

const typeIcons: Record<string, React.ElementType> = {
  'Data Masking': Shield,
  'Retention': Clock,
  'Archival': Archive,
  'Classification': Database,
  'Legal Hold': Eye,
};

const typeColors: Record<string, string> = {
  'Data Masking': 'bg-red-500/20 text-red-400',
  'Retention': 'bg-amber-500/20 text-amber-400',
  'Archival': 'bg-blue-500/20 text-blue-400',
  'Classification': 'bg-violet-500/20 text-violet-400',
  'Legal Hold': 'bg-orange-500/20 text-orange-400',
};

export default function DataGovernancePage() {
  const [policies, setPolicies] = useState(POLICIES);

  const toggle = (id: string) => {
    setPolicies(ps => ps.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Governance</h1>
          <p className="text-gray-400 text-sm mt-1">Define data retention, classification, and access policies</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies', value: policies.filter(p => p.status === 'active').length.toString(), color: 'text-green-400' },
          { label: 'PII Instances Masked', value: '12.4K', color: 'text-red-400' },
          { label: 'Docs Archived (30d)', value: '340', color: 'text-blue-400' },
          { label: 'Docs Deleted (30d)', value: '28', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Policies */}
      <div className="space-y-3">
        {policies.map(policy => {
          const Icon = typeIcons[policy.type] || Database;
          return (
            <div key={policy.id} className={`bg-gray-900 border border-white/5 rounded-2xl p-5 flex items-start gap-4 ${policy.status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{policy.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[policy.type] || 'bg-gray-500/20 text-gray-400'}`}>{policy.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${policy.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>{policy.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-gray-500 text-xs">Applies to: <span className="text-gray-400">{policy.applies}</span></span>
                  <span className="text-gray-500 text-xs">Trigger: <span className="text-gray-400">{policy.trigger}</span></span>
                  <span className="text-gray-500 text-xs">Last run: <span className="text-gray-400">{policy.lastRun}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggle(policy.id)}>
                  {policy.status === 'active'
                    ? <ToggleRight className="w-8 h-8 text-indigo-400" />
                    : <ToggleLeft className="w-8 h-8 text-gray-600" />
                  }
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data classification */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Data Classification Levels</h3>
        <div className="space-y-3">
          {[
            { level: 'Public', desc: 'Freely shareable outside the organization', color: 'bg-green-500', count: '2.1K docs' },
            { level: 'Internal', desc: 'For employees only, no external sharing', color: 'bg-blue-500', count: '8.4K docs' },
            { level: 'Confidential', desc: 'Restricted — need explicit permission to view', color: 'bg-amber-500', count: '1.2K docs' },
            { level: 'Restricted', desc: 'Highly sensitive — legal, HR, financial', color: 'bg-red-500', count: '340 docs' },
          ].map(cls => (
            <div key={cls.level} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cls.color}`} />
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{cls.level}</div>
                <div className="text-gray-500 text-xs">{cls.desc}</div>
              </div>
              <span className="text-gray-400 text-xs">{cls.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Retention schedule */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-400 font-semibold text-sm">Upcoming Scheduled Deletions</h4>
          <p className="text-gray-400 text-xs mt-1">128 chat messages will be deleted in 3 days per the 90-day retention policy. <button className="text-amber-400 underline">Review before deletion</button></p>
        </div>
      </div>
    </div>
  );
}
