'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { FolderOpen, Plus, Search, MoreHorizontal, FileText, Users, Loader2, Trash2 } from 'lucide-react';

const GRADIENT_COLORS = [
  'from-blue-500 to-cyan-600', 'from-pink-500 to-rose-600', 'from-green-500 to-emerald-600',
  'from-violet-500 to-purple-600', 'from-red-500 to-rose-600', 'from-amber-500 to-orange-600',
  'from-teal-500 to-cyan-600', 'from-indigo-500 to-blue-600',
];

interface Collection { id: string; name: string; description: string; documentCount: number; createdAt: string }

export default function CollectionsPage() {
  const { data: session, status } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const getToken = () => (session as any)?.accessToken;
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name });

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);
    authFetch('/api/backend/knowledge/collections', {}, getToken(), getUser())
      .then(r => r.ok ? r.json() : [])
      .then(data => setCollections(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, session?.user?.email]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/backend/knowledge/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      }, getToken(), getUser());
      if (res.ok) {
        const col = await res.json();
        setCollections(prev => [col, ...prev]);
        setShowCreate(false);
        setNewName(''); setNewDesc('');
      }
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    await authFetch(`/api/backend/knowledge/collections/${id}`, { method: 'DELETE' }, getToken(), getUser());
    setCollections(prev => prev.filter(c => c.id !== id));
  };

  const filtered = collections.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const totalDocs = collections.reduce((a, c) => a + (c.documentCount ?? 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Collections</h1>
          <p className="text-gray-400 text-sm mt-1">Organize your knowledge into curated collections</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Collection
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Collections',      value: loading ? '—' : String(collections.length),  color: 'text-white' },
          { label: 'Total Documents',  value: loading ? '—' : String(totalDocs),            color: 'text-indigo-400' },
          { label: 'Shared',           value: loading ? '—' : String(collections.length),   color: 'text-green-400' },
          { label: 'Private',          value: '0',                                            color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search collections..."
          className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading collections…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((col, i) => (
            <div key={col.id} className="bg-gray-900 border border-white/5 hover:border-white/15 rounded-2xl p-5 transition-colors group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} flex items-center justify-center`}>
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <button onClick={() => handleDelete(col.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-white font-semibold">{col.name}</h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{col.description || 'No description'}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-gray-500 text-xs flex items-center gap-1"><FileText className="w-3 h-3" />{col.documentCount ?? 0} docs</span>
                <span className="text-gray-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />Shared</span>
              </div>
              <div className="text-gray-700 text-xs mt-2">{col.createdAt ? new Date(col.createdAt).toLocaleDateString() : ''}</div>
            </div>
          ))}

          <button onClick={() => setShowCreate(true)} className="border border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-colors group min-h-[180px]">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <Plus className="w-5 h-5 text-gray-500 group-hover:text-indigo-400" />
            </div>
            <span className="text-gray-500 group-hover:text-gray-300 text-sm transition-colors">New Collection</span>
          </button>
        </div>
      )}

      {filtered.length === 0 && !loading && search && (
        <div className="text-center py-10 text-gray-500 text-sm">No collections matching "{search}"</div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">New Collection</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Marketing Assets"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                <textarea rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="What documents belong in this collection?"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
