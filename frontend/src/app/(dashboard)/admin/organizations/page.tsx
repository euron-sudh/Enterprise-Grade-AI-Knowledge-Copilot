'use client';

import { useState } from 'react';
import { Search, Building2, Users, ChevronRight, Globe, Shield, MoreHorizontal, Plus } from 'lucide-react';

const ORGS = [
  { id: '1', name: 'Acme Corp', domain: 'acme.com', plan: 'Enterprise', users: 312, status: 'Active', created: 'Jan 5, 2026', storage: '84GB', queries: '128K', avatar: 'AC', color: 'from-indigo-500 to-violet-600' },
  { id: '2', name: 'TechFlow Inc', domain: 'techflow.io', plan: 'Professional', users: 87, status: 'Active', created: 'Jan 18, 2026', storage: '22GB', queries: '38K', avatar: 'TF', color: 'from-cyan-500 to-blue-600' },
  { id: '3', name: 'DataNova', domain: 'datanova.ai', plan: 'Professional', users: 45, status: 'Active', created: 'Feb 2, 2026', storage: '15GB', queries: '21K', avatar: 'DN', color: 'from-green-500 to-emerald-600' },
  { id: '4', name: 'Catalyst Labs', domain: 'catalystlabs.dev', plan: 'Starter', users: 8, status: 'Trial', created: 'Mar 10, 2026', storage: '2GB', queries: '1.2K', avatar: 'CL', color: 'from-amber-500 to-orange-600' },
  { id: '5', name: 'Meridian Health', domain: 'meridianhealth.org', plan: 'Enterprise', users: 520, status: 'Active', created: 'Dec 1, 2025', storage: '210GB', queries: '290K', avatar: 'MH', color: 'from-red-500 to-rose-600' },
  { id: '6', name: 'Stackr Dev', domain: 'stackr.dev', plan: 'Starter', users: 3, status: 'Suspended', created: 'Feb 20, 2026', storage: '0.8GB', queries: '320', avatar: 'SD', color: 'from-gray-500 to-slate-600' },
];

const planColors: Record<string, string> = {
  Enterprise: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Professional: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  Starter: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/20 text-green-400',
  Trial: 'bg-amber-500/20 text-amber-400',
  Suspended: 'bg-red-500/20 text-red-400',
};

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');

  const filtered = ORGS.filter(o =>
    search === '' || o.name.toLowerCase().includes(search.toLowerCase()) || o.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-gray-400 text-sm mt-1">Manage tenant organizations across the platform</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Org
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs', value: ORGS.length.toString(), color: 'text-white' },
          { label: 'Active', value: ORGS.filter(o => o.status === 'Active').length.toString(), color: 'text-green-400' },
          { label: 'Enterprise', value: ORGS.filter(o => o.plan === 'Enterprise').length.toString(), color: 'text-indigo-400' },
          { label: 'Total Users', value: ORGS.reduce((a, o) => a + o.users, 0).toLocaleString(), color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Plan</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Users</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Storage</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(org => (
              <tr key={org.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${org.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{org.avatar}</div>
                    <div>
                      <div className="text-white text-sm font-medium">{org.name}</div>
                      <div className="text-gray-500 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />{org.domain}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${planColors[org.plan] || 'bg-gray-500/20 text-gray-400'}`}>{org.plan}</span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[org.status] || 'bg-gray-500/20 text-gray-400'}`}>{org.status}</span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <span className="text-white text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-500" />{org.users.toLocaleString()}</span>
                </td>
                <td className="px-5 py-4 text-gray-400 text-sm hidden xl:table-cell">{org.storage}</td>
                <td className="px-5 py-4 text-right">
                  <button className="text-gray-500 hover:text-white transition-colors p-1 rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
