'use client';

import { useState } from 'react';
import { FolderOpen, Plus, Search, MoreHorizontal, FileText, Lock, Globe, Users } from 'lucide-react';

const COLLECTIONS = [
  { id: '1', name: 'Engineering Docs', desc: 'Architecture, ADRs, runbooks, and technical guides', docs: 124, color: 'from-blue-500 to-cyan-600', access: 'Engineering', icon: '⚙️', updated: '2 hours ago' },
  { id: '2', name: 'HR Policies', desc: 'Employee handbook, benefits, PTO policy, onboarding', docs: 48, color: 'from-pink-500 to-rose-600', access: 'All staff', icon: '👥', updated: '1 day ago' },
  { id: '3', name: 'Sales Playbooks', desc: 'Pitch decks, objection handling, case studies', docs: 67, color: 'from-green-500 to-emerald-600', access: 'Sales', icon: '📈', updated: '3 days ago' },
  { id: '4', name: 'Product & Design', desc: 'PRDs, wireframes, design system documentation', docs: 89, color: 'from-violet-500 to-purple-600', access: 'Product', icon: '🎨', updated: '5 hours ago' },
  { id: '5', name: 'Legal & Compliance', desc: 'Contracts, privacy policies, compliance docs', docs: 32, color: 'from-red-500 to-rose-600', access: 'Legal only', icon: '⚖️', updated: '1 week ago' },
  { id: '6', name: 'Customer Success', desc: 'Onboarding guides, FAQs, support runbooks', docs: 56, color: 'from-amber-500 to-orange-600', access: 'CS Team', icon: '🤝', updated: '2 days ago' },
];

export default function CollectionsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = COLLECTIONS.filter(c => search === '' || c.name.toLowerCase().includes(search.toLowerCase()));

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
          { label: 'Collections', value: COLLECTIONS.length.toString(), color: 'text-white' },
          { label: 'Total Documents', value: COLLECTIONS.reduce((a, c) => a + c.docs, 0).toString(), color: 'text-indigo-400' },
          { label: 'Public', value: '1', color: 'text-green-400' },
          { label: 'Team-restricted', value: '5', color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search collections..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(col => (
          <div key={col.id} className="bg-gray-900 border border-white/5 hover:border-white/15 rounded-2xl p-5 transition-colors group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${col.color} flex items-center justify-center text-2xl`}>{col.icon}</div>
              <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-white font-semibold">{col.name}</h3>
            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{col.desc}</p>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-gray-500 text-xs flex items-center gap-1"><FileText className="w-3 h-3" />{col.docs} docs</span>
              <span className="text-gray-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />{col.access}</span>
            </div>
            <div className="text-gray-700 text-xs mt-2">Updated {col.updated}</div>
          </div>
        ))}

        {/* Add new */}
        <button onClick={() => setShowCreate(true)} className="border border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-colors group min-h-[180px]">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <Plus className="w-5 h-5 text-gray-500 group-hover:text-indigo-400" />
          </div>
          <span className="text-gray-500 group-hover:text-gray-300 text-sm transition-colors">New Collection</span>
        </button>
      </div>

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
                <input type="text" placeholder="e.g. Marketing Assets" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                <textarea rows={3} placeholder="What documents belong in this collection?" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Access</label>
                <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option>All team members</option>
                  <option>Specific teams</option>
                  <option>Admin only</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
