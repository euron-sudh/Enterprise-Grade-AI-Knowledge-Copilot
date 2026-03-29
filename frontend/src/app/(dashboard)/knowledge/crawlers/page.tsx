'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Globe, Plus, Play, Trash2, RefreshCw, CheckCircle, Pause, AlertCircle, X, Loader2 } from 'lucide-react';

interface Crawler {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
  documentCount: number;
  config: {
    url?: string;
    depth?: number;
    frequency?: string;
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  connected: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Active' },
  syncing: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
  disconnected: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Paused' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
};

export default function CrawlersPage() {
  const { data: session } = useSession();
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDepth, setNewDepth] = useState('2');
  const [newFrequency, setNewFrequency] = useState('Daily');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const fetchCrawlers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/backend/knowledge/connectors', {}, session?.accessToken, getUser());
      if (!res.ok) throw new Error('Failed to load');
      const data: Crawler[] = await res.json();
      setCrawlers(data.filter(c => c.type === 'web_crawler'));
    } catch {
      setError('Failed to load crawlers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchCrawlers(); }, []);

  const createCrawler = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      setCreateError('Name and URL are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await authFetch(
        '/api/backend/knowledge/connectors',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'web_crawler',
            name: newName.trim(),
            config: { url: newUrl.trim(), depth: parseInt(newDepth), frequency: newFrequency },
          }),
        },
        session?.accessToken,
        getUser(),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Failed (${res.status})`);
      }
      setShowCreate(false);
      setNewName(''); setNewUrl(''); setNewDepth('2'); setNewFrequency('Daily');
      void fetchCrawlers();
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create crawler.');
    } finally {
      setCreating(false);
    }
  };

  const syncCrawler = async (id: string) => {
    setSyncing(id);
    try {
      await authFetch(`/api/backend/knowledge/connectors/${id}/sync`, { method: 'POST' }, session?.accessToken, getUser());
      void fetchCrawlers();
    } catch {
      setError('Failed to start sync.');
    } finally {
      setSyncing(null);
    }
  };

  const deleteCrawler = async (id: string) => {
    if (!confirm('Delete this crawler?')) return;
    try {
      await authFetch(`/api/backend/knowledge/connectors/${id}`, { method: 'DELETE' }, session?.accessToken, getUser());
      setCrawlers(prev => prev.filter(c => c.id !== id));
    } catch {
      setError('Failed to delete crawler.');
    }
  };

  const totalPages = crawlers.reduce((a, c) => a + (c.documentCount || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Web Crawlers</h1>
          <p className="text-gray-400 text-sm mt-1">Automatically crawl and index web content into your knowledge base</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError(''); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Crawler
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Crawlers', value: crawlers.length.toString(), color: 'text-white' },
          { label: 'Active', value: crawlers.filter(c => c.status === 'connected').length.toString(), color: 'text-green-400' },
          { label: 'Pages Indexed', value: totalPages.toLocaleString(), color: 'text-indigo-400' },
          { label: 'Errors', value: crawlers.filter(c => c.status === 'error').length.toString(), color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : crawlers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No crawlers yet</p>
          <p className="text-gray-500 text-sm">Create a crawler to automatically index web content</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">+ New Crawler</button>
        </div>
      ) : (
        <div className="space-y-3">
          {crawlers.map(crawler => {
            const cfg = statusConfig[crawler.status] ?? statusConfig.disconnected;
            const StatusIcon = cfg.icon;
            return (
              <div key={crawler.id} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{crawler.name}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className={`w-3 h-3 ${crawler.status === 'syncing' ? 'animate-spin' : ''}`} /> {cfg.label}
                      </span>
                    </div>
                    {crawler.config?.url && <p className="text-gray-500 text-sm font-mono mt-0.5 truncate">{crawler.config.url}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-gray-600 text-xs">Pages: <span className="text-gray-400">{crawler.documentCount}</span></span>
                      {crawler.config?.depth && <span className="text-gray-600 text-xs">Depth: <span className="text-gray-400">{crawler.config.depth}</span></span>}
                      {crawler.config?.frequency && <span className="text-gray-600 text-xs">Freq: <span className="text-gray-400">{crawler.config.frequency}</span></span>}
                      {crawler.lastSyncAt && <span className="text-gray-600 text-xs">Last: <span className="text-gray-400">{new Date(crawler.lastSyncAt).toLocaleDateString()}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => void syncCrawler(crawler.id)} disabled={syncing === crawler.id || crawler.status === 'syncing'}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50" title="Run now">
                      {syncing === crawler.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => void deleteCrawler(crawler.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">New Web Crawler</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Crawler Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Company Help Center"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Start URL</label>
                <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://docs.example.com"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Crawl Depth</label>
                  <select value={newDepth} onChange={e => setNewDepth(e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {['1', '2', '3', '4', '5'].map(d => <option key={d} value={d}>{d} level{d !== '1' ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Frequency</label>
                  <select value={newFrequency} onChange={e => setNewFrequency(e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    {['Once', 'Hourly', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              {createError && <p className="text-red-400 text-xs">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={() => void createCrawler()} disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create & Run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
