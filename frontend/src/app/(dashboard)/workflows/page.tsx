'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageSquare,
  FileText,
  Bell,
  Activity,
  Loader2,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  status: string;
  runCount: number;
  lastRunAt: string | null;
  recentRuns: WorkflowRun[];
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  webhook: Zap,
  schedule: Clock,
  event: Bell,
  manual: Play,
};

const STATUS_STYLES: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-900/30',
  paused: 'text-amber-400 bg-amber-900/30',
  error: 'text-red-400 bg-red-900/30',
  draft: 'text-surface-500 dark:text-gray-400 bg-surface-100 dark:bg-gray-800',
};

const TEMPLATES = [
  { name: 'New Document Alert', description: 'Slack notification when docs are uploaded', icon: Bell, color: 'bg-violet-600', trigger: 'event' },
  { name: 'Meeting Recap Email', description: 'Email recap after every meeting', icon: Mail, color: 'bg-blue-600', trigger: 'event' },
  { name: 'Weekly Digest', description: 'Curated weekly knowledge summary', icon: FileText, color: 'bg-emerald-600', trigger: 'schedule' },
  { name: 'Knowledge Gap Alert', description: 'Alert when gap score exceeds threshold', icon: AlertCircle, color: 'bg-amber-600', trigger: 'schedule' },
];

export default function WorkflowsPage() {
  const { data: session } = useSession();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTrigger, setNewTrigger] = useState('manual');
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};

  const fetchWorkflows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/backend/workflows', { headers: authHeader });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load workflows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const createWorkflow = async (name?: string, desc?: string, trigger?: string) => {
    const n = name || newName.trim();
    const d = desc || newDesc.trim();
    const t = trigger || newTrigger;
    if (!n) return;
    setCreating(true);
    try {
      const res = await fetch('/api/backend/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: n, description: d, trigger_type: t, steps: [] }),
      });
      if (!res.ok) throw new Error('Create failed');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      fetchWorkflows();
    } catch {
      setError('Failed to create workflow.');
    } finally {
      setCreating(false);
    }
  };

  const toggleWorkflow = async (wf: Workflow) => {
    const endpoint = wf.status === 'active' ? 'pause' : 'resume';
    try {
      await fetch(`/api/backend/workflows/${wf.id}/${endpoint}`, {
        method: 'POST',
        headers: authHeader,
      });
      fetchWorkflows();
    } catch {
      setError('Failed to update workflow.');
    }
  };

  const runWorkflow = async (id: string) => {
    setRunning(id);
    try {
      await fetch(`/api/backend/workflows/${id}/run`, {
        method: 'POST',
        headers: authHeader,
      });
      fetchWorkflows();
    } catch {
      setError('Failed to run workflow.');
    } finally {
      setRunning(null);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await fetch(`/api/backend/workflows/${id}`, { method: 'DELETE', headers: authHeader });
      fetchWorkflows();
    } catch {
      setError('Failed to delete.');
    }
  };

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Workflow Automations</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">Automate tasks triggered by events, schedules, or webhooks</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchWorkflows} className="flex items-center gap-1 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-surface-900 dark:text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Workflow
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Create Workflow</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Workflow name" className="rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)" className="rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
              className="rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-3 py-2 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-indigo-500">
              <option value="manual">Manual</option>
              <option value="schedule">Schedule</option>
              <option value="event">Event</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createWorkflow()} disabled={creating || !newName.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-surface-900 dark:text-white hover:bg-indigo-700 disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-4 py-2 text-sm text-surface-600 dark:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* Active workflows */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider mb-3">Your Workflows</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
        ) : workflows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 dark:border-gray-700 p-8 text-center">
            <Zap className="h-8 w-8 text-surface-400 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-surface-500 dark:text-gray-400 text-sm mb-1">No workflows yet</p>
            <p className="text-surface-400 dark:text-gray-600 text-xs">Create one above or use a template below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => {
              const TriggerIcon = TRIGGER_ICONS[wf.triggerType] || Zap;
              return (
                <div key={wf.id} className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-900/50 border border-indigo-800">
                        <TriggerIcon className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-900 dark:text-white text-sm">{wf.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[wf.status] || STATUS_STYLES.draft}`}>{wf.status}</span>
                        </div>
                        {wf.description && <p className="text-xs text-surface-500 dark:text-gray-400 mt-0.5">{wf.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-surface-400 dark:text-gray-500">
                          <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{wf.runCount} runs</span>
                          {wf.lastRunAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                          <span className="capitalize">{wf.triggerType} trigger</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => runWorkflow(wf.id)} disabled={running === wf.id}
                        className="flex items-center gap-1 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 disabled:opacity-50">
                        {running === wf.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Run
                      </button>
                      <button onClick={() => toggleWorkflow(wf)}
                        className="flex items-center gap-1 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700">
                        {wf.status === 'active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {wf.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button onClick={() => deleteWorkflow(wf.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-900 bg-red-900/20 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-900/40">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-sm font-semibold text-surface-500 dark:text-gray-400 uppercase tracking-wider mb-3">Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="rounded-xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-surface-300 dark:hover:border-gray-700 transition-colors">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.color} mb-3`}>
                  <Icon className="h-4 w-4 text-surface-900 dark:text-white" />
                </div>
                <h3 className="text-sm font-medium text-surface-900 dark:text-white mb-1">{t.name}</h3>
                <p className="text-xs text-surface-500 dark:text-gray-400 mb-3">{t.description}</p>
                <button onClick={() => createWorkflow(t.name, t.description, t.trigger)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  Use template →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
