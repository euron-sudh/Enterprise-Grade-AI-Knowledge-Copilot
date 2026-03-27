'use client';

import { useState } from 'react';
import { Search, Download, Filter, AlertCircle, CheckCircle, Info, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

const LOGS = [
  { id: 1, user: 'Alex Kim', email: 'alex@company.com', action: 'user.role_changed', resource: 'User: Sofia Reyes', ip: '192.168.1.10', time: '2 min ago', severity: 'warning', detail: 'Role changed from Member to Admin' },
  { id: 2, user: 'System', email: 'system', action: 'auth.login_success', resource: 'User: James Chen', ip: '10.0.1.45', time: '5 min ago', severity: 'info', detail: 'Successful login via Google OAuth' },
  { id: 3, user: 'Sofia Reyes', email: 'sofia@company.com', action: 'document.deleted', resource: 'Doc: Q4 Strategy.pdf', ip: '192.168.1.22', time: '12 min ago', severity: 'warning', detail: 'Document permanently deleted' },
  { id: 4, user: 'Alex Kim', email: 'alex@company.com', action: 'admin.settings_changed', resource: 'Security Settings', ip: '192.168.1.10', time: '1 hour ago', severity: 'critical', detail: 'MFA enforcement enabled for all users' },
  { id: 5, user: 'System', email: 'system', action: 'auth.login_failed', resource: 'User: unknown', ip: '203.45.67.89', time: '1 hour ago', severity: 'critical', detail: '5 failed login attempts — account locked' },
  { id: 6, user: 'Maya Patel', email: 'maya@company.com', action: 'api_key.created', resource: 'API Key: prod-key-001', ip: '192.168.1.30', time: '2 hours ago', severity: 'info', detail: 'New API key created with read scope' },
  { id: 7, user: 'David Lee', email: 'david@company.com', action: 'connector.synced', resource: 'Connector: Google Drive', ip: '192.168.1.55', time: '3 hours ago', severity: 'info', detail: 'Sync completed: 124 documents processed' },
  { id: 8, user: 'Alex Kim', email: 'alex@company.com', action: 'user.suspended', resource: 'User: Ryan Walsh', ip: '192.168.1.10', time: '1 day ago', severity: 'warning', detail: 'User account suspended by admin' },
  { id: 9, user: 'System', email: 'system', action: 'billing.payment_success', resource: 'Invoice: INV-2026-03', ip: 'stripe-webhook', time: '2 days ago', severity: 'info', detail: 'Payment of $1,247.00 processed successfully' },
  { id: 10, user: 'Sofia Reyes', email: 'sofia@company.com', action: 'knowledge.collection_created', resource: 'Collection: HR Policies', ip: '192.168.1.22', time: '3 days ago', severity: 'info', detail: 'New knowledge collection created' },
];

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Info' },
  warning: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Warning' },
  critical: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
  success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Success' },
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');

  const filtered = LOGS.filter(log =>
    (search === '' || log.action.includes(search.toLowerCase()) || log.user.toLowerCase().includes(search.toLowerCase()) || log.detail.toLowerCase().includes(search.toLowerCase())) &&
    (severity === 'All' || log.severity === severity.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-1">Track all security-relevant events and administrative actions</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl border border-white/10 transition-colors text-sm">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Events Today', value: '247', color: 'text-white' },
          { label: 'Critical', value: '3', color: 'text-red-400' },
          { label: 'Warnings', value: '12', color: 'text-amber-400' },
          { label: 'Failed Logins', value: '5', color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          {['All', 'Critical', 'Warning', 'Info'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          {['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Custom range'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(log => {
              const cfg = severityConfig[log.severity as keyof typeof severityConfig] || severityConfig.info;
              const Icon = cfg.icon;
              return (
                <tr key={log.id} className="hover:bg-gray-800/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-mono">{log.action}</div>
                    <div className="text-gray-500 text-xs mt-0.5 hidden group-hover:block">{log.detail}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-white text-sm">{log.user}</div>
                    <div className="text-gray-500 text-xs">{log.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm hidden lg:table-cell">{log.resource}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono hidden xl:table-cell">{log.ip}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{log.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-gray-500 text-sm">Showing {filtered.length} of {LOGS.length} events</span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-gray-400 text-sm px-2">1 / 1</span>
            <button className="p-1.5 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
