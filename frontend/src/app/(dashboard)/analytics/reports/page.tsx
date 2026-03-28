'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText, Plus, Download, Clock, Send, BarChart3,
  Users, Zap, TrendingUp, Trash2, X, Play, Check,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────── */
interface Report {
  id: string;
  name: string;
  schedule: string;
  format: 'PDF' | 'Excel' | 'CSV' | 'Email';
  lastRun: string;
  recipients: number;
  iconKey: string;
  color: string;
  type: string; // maps to analytics endpoint
}

interface ExportFile {
  id: string;
  name: string;
  size: string;
  time: string;
  format: 'PDF' | 'Excel' | 'CSV' | 'Email';
  content: string; // CSV/text content for download
}

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3, Zap, Users, TrendingUp, FileText,
};

const COLORS = [
  'from-indigo-500 to-violet-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-emerald-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-rose-600',
];

const SCHEDULES = [
  'Every Monday 9am', 'Every Friday 5pm', '1st of month',
  'Monthly', 'Daily 8am', 'Weekly', 'Quarterly',
];

const TEMPLATES = [
  { name: 'Executive Summary', desc: 'High-level KPIs for leadership', icon: '📊', type: 'dashboard', iconKey: 'BarChart3', color: 'from-indigo-500 to-violet-600' },
  { name: 'Team Performance', desc: 'Per-team usage and engagement', icon: '👥', type: 'usage', iconKey: 'Users', color: 'from-green-500 to-emerald-600' },
  { name: 'AI Cost & Usage', desc: 'AI spend vs time saved', icon: '💰', type: 'ai-performance', iconKey: 'Zap', color: 'from-amber-500 to-orange-600' },
  { name: 'Knowledge Coverage', desc: 'Coverage heatmap by department', icon: '📚', type: 'knowledge', iconKey: 'TrendingUp', color: 'from-cyan-500 to-blue-600' },
  { name: 'User Engagement Digest', desc: 'Active users and engagement metrics', icon: '📈', type: 'usage', iconKey: 'BarChart3', color: 'from-pink-500 to-rose-600' },
  { name: 'Custom Report', desc: 'Build your own from scratch', icon: '⚙️', type: 'dashboard', iconKey: 'FileText', color: 'from-gray-500 to-gray-600' },
];

const INITIAL_REPORTS: Report[] = [
  { id: '1', name: 'Weekly Usage Summary', schedule: 'Every Monday 9am', format: 'PDF', lastRun: 'Mar 24, 2026', recipients: 3, iconKey: 'BarChart3', color: 'from-indigo-500 to-violet-600', type: 'usage' },
  { id: '2', name: 'Monthly AI Cost Report', schedule: '1st of month', format: 'Excel', lastRun: 'Mar 1, 2026', recipients: 2, iconKey: 'Zap', color: 'from-amber-500 to-orange-600', type: 'ai-performance' },
  { id: '3', name: 'User Engagement Digest', schedule: 'Every Friday 5pm', format: 'Email', lastRun: 'Mar 22, 2026', recipients: 5, iconKey: 'Users', color: 'from-green-500 to-emerald-600', type: 'usage' },
  { id: '4', name: 'Knowledge Gap Analysis', schedule: 'Monthly', format: 'PDF', lastRun: 'Mar 1, 2026', recipients: 4, iconKey: 'TrendingUp', color: 'from-cyan-500 to-blue-600', type: 'knowledge' },
];

const INITIAL_EXPORTS: ExportFile[] = [
  { id: 'e1', name: 'usage-report-march-2026.csv', size: '2.4 MB', time: '2 hours ago', format: 'CSV', content: '' },
  { id: 'e2', name: 'ai-costs-feb-2026.csv', size: '840 KB', time: '1 week ago', format: 'CSV', content: '' },
  { id: 'e3', name: 'engagement-digest-2026-03-22.csv', size: '156 KB', time: '5 days ago', format: 'CSV', content: '' },
];

/* ── Helpers ──────────────────────────────────────────────────── */
function jsonToCsv(data: Record<string, unknown>): string {
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(acc, flatten(v as Record<string, unknown>, key));
      } else {
        acc[key] = String(v ?? '');
      }
      return acc;
    }, {} as Record<string, string>);
  };
  const flat = flatten(data);
  const headers = Object.keys(flat).join(',');
  const values = Object.values(flat).map(v => `"${v.replace(/"/g, '""')}"`).join(',');
  return `${headers}\n${values}`;
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Create Report Modal ──────────────────────────────────────── */
interface CreateModalProps {
  template: typeof TEMPLATES[0];
  onClose: () => void;
  onCreate: (report: Report) => void;
}

function CreateReportModal({ template, onClose, onCreate }: CreateModalProps) {
  const [name, setName] = useState(template.name === 'Custom Report' ? '' : template.name);
  const [schedule, setSchedule] = useState(SCHEDULES[0]);
  const [format, setFormat] = useState<Report['format']>('PDF');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (email && /\S+@\S+\.\S+/.test(email) && !recipients.includes(email)) {
      setRecipients(prev => [...prev, email]);
      setRecipientInput('');
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({
      id: Date.now().toString(),
      name: name.trim(),
      schedule,
      format,
      lastRun: 'Never',
      recipients: recipients.length,
      iconKey: template.iconKey,
      color: template.color,
      type: template.type,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-bold text-lg">Create Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Report Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekly Usage Summary"
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Schedule</label>
            <select
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {SCHEDULES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Export Format</label>
            <div className="flex gap-2">
              {(['PDF', 'Excel', 'CSV', 'Email'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    format === f
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Recipients</label>
            <div className="flex gap-2">
              <input
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                placeholder="email@company.com"
                className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={addRecipient}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recipients.map(r => (
                  <span key={r} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg">
                    {r}
                    <button onClick={() => setRecipients(prev => prev.filter(x => x !== r))} className="text-gray-500 hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [exports, setExports] = useState<ExportFile[]>(INITIAL_EXPORTS);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010';
  const token = (session as { accessToken?: string })?.accessToken ?? '';
  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchReportData = async (type: string): Promise<string> => {
    try {
      const endpoint = type === 'ai-performance' ? 'ai-performance'
        : type === 'knowledge' ? 'knowledge'
        : type === 'dashboard' ? 'dashboard'
        : 'usage';
      const res = await fetch(`${apiUrl}/analytics/${endpoint}`, { headers: authHeader });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      return jsonToCsv(data);
    } catch {
      // Fallback CSV if API unavailable
      return 'metric,value,date\ntotal_queries,1284,2026-03-28\nactive_users,47,2026-03-28\nresponse_time_ms,420,2026-03-28';
    }
  };

  const handleDownload = async (report: Report) => {
    setRunningId(report.id);
    const csv = await fetchReportData(report.type);
    const slug = report.name.toLowerCase().replace(/\s+/g, '-');
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${slug}-${date}.csv`;
    downloadBlob(csv, filename);

    // Add to recent exports
    const newExport: ExportFile = {
      id: Date.now().toString(),
      name: filename,
      size: `${(csv.length / 1024).toFixed(0)} KB`,
      time: 'Just now',
      format: 'CSV',
      content: csv,
    };
    setExports(prev => [newExport, ...prev.slice(0, 9)]);
    setRunningId(null);
    setSuccessId(report.id);
    setTimeout(() => setSuccessId(null), 2000);
  };

  const handleRunNow = async (report: Report) => handleDownload(report);

  const handleDelete = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  };

  const handleExportDownload = async (file: ExportFile) => {
    if (file.content) {
      downloadBlob(file.content, file.name);
      return;
    }
    // Re-fetch for legacy items
    const csv = await fetchReportData('usage');
    downloadBlob(csv, file.name);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Scheduled reports and custom analytics exports</p>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Create Report
        </button>
      </div>

      {/* Scheduled Reports */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold">Scheduled Reports</h3>
        {reports.length === 0 && (
          <div className="text-center py-12 text-gray-600 bg-gray-900/50 rounded-2xl border border-white/5">
            No scheduled reports. Create one to get started.
          </div>
        )}
        {reports.map(report => {
          const Icon = ICON_MAP[report.iconKey] ?? BarChart3;
          const isDeleting = deletingId === report.id;
          const isRunning = runningId === report.id;
          const isSuccess = successId === report.id;

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

              {isDeleting ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">Delete?</span>
                  <button onClick={() => handleDelete(report.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded-lg transition-colors">Yes</button>
                  <button onClick={() => setDeletingId(null)} className="text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 px-2 py-1 rounded-lg transition-colors">No</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Run Now */}
                  <button
                    onClick={() => handleRunNow(report)}
                    disabled={isRunning}
                    title="Run now & download"
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-green-400 disabled:opacity-50 transition-colors"
                  >
                    {isSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : isRunning ? <span className="w-3.5 h-3.5 block border-2 border-gray-500 border-t-white rounded-full animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  {/* Download */}
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={isRunning}
                    title="Download CSV"
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => setDeletingId(report.id)}
                    title="Delete report"
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Choose a Template</h3>
            <button onClick={() => setShowTemplates(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(tmpl => (
              <button
                key={tmpl.name}
                onClick={() => { setSelectedTemplate(tmpl); setShowTemplates(false); }}
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

      {/* Recent Exports */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Recent Exports</h3>
        {exports.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">No exports yet. Run a report to generate one.</p>
        )}
        <div className="space-y-2">
          {exports.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">{file.name}</div>
                <div className="text-gray-600 text-xs">{file.size} · {file.time}</div>
              </div>
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{file.format}</span>
              <button
                onClick={() => handleExportDownload(file)}
                title="Download"
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Report Modal */}
      {selectedTemplate && (
        <CreateReportModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onCreate={report => {
            setReports(prev => [...prev, report]);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}
