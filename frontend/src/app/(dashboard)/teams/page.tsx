'use client';

import { useState } from 'react';
import { Users, Plus, Search, MoreHorizontal, Shield, Crown, User, Mail, Trash2, Settings } from 'lucide-react';

const MOCK_TEAMS = [
  { id: '1', name: 'Engineering', description: 'Backend, frontend, and infrastructure teams', members: 24, docs: 1240, color: 'from-blue-500 to-cyan-500', role: 'admin' },
  { id: '2', name: 'Product', description: 'Product management, design and research', members: 12, docs: 843, color: 'from-violet-500 to-purple-500', role: 'member' },
  { id: '3', name: 'Sales', description: 'Account executives and sales development', members: 18, docs: 567, color: 'from-green-500 to-emerald-500', role: 'member' },
  { id: '4', name: 'Marketing', description: 'Content, demand gen and brand teams', members: 9, docs: 412, color: 'from-orange-500 to-amber-500', role: 'member' },
  { id: '5', name: 'Customer Success', description: 'Onboarding, support and retention', members: 15, docs: 688, color: 'from-rose-500 to-pink-500', role: 'viewer' },
  { id: '6', name: 'Legal & Compliance', description: 'Legal, privacy and regulatory teams', members: 5, docs: 334, color: 'from-gray-500 to-slate-500', role: 'viewer' },
];

const MOCK_MEMBERS = [
  { id: '1', name: 'Afeefa Quadri', email: 'afeefaquadri@gmail.com', role: 'admin', team: 'Engineering', avatar: 'AQ', joined: 'Mar 2025' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@euron.ai', role: 'member', team: 'Product', avatar: 'SC', joined: 'Jan 2025' },
  { id: '3', name: 'James Wilson', email: 'james@euron.ai', role: 'member', team: 'Engineering', avatar: 'JW', joined: 'Feb 2025' },
  { id: '4', name: 'Priya Sharma', email: 'priya@euron.ai', role: 'admin', team: 'Marketing', avatar: 'PS', joined: 'Nov 2024' },
  { id: '5', name: 'Tom Bradley', email: 'tom@euron.ai', role: 'viewer', team: 'Sales', avatar: 'TB', joined: 'Mar 2025' },
];

const roleIcon = (role: string) => {
  if (role === 'admin') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
  if (role === 'member') return <User className="w-3.5 h-3.5 text-blue-400" />;
  return <Shield className="w-3.5 h-3.5 text-surface-500 dark:text-gray-400" />;
};

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    member: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    viewer: 'bg-gray-500/10 text-surface-500 dark:text-gray-400 border-gray-500/20',
  };
  return styles[role] || styles.viewer;
};

export default function TeamsPage() {
  const [tab, setTab] = useState<'teams' | 'members'>('teams');
  const [search, setSearch] = useState('');

  const filteredTeams = MOCK_TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMembers = MOCK_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Teams</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">Manage teams and member access to knowledge</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-surface-900 dark:text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Team
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Teams', value: '6', sub: 'across organization' },
          { label: 'Total Members', value: '83', sub: 'active users' },
          { label: 'Shared Collections', value: '24', sub: 'knowledge collections' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{s.value}</p>
            <p className="text-sm font-medium text-surface-600 dark:text-gray-300 mt-0.5">{s.label}</p>
            <p className="text-xs text-surface-400 dark:text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-lg">
          {(['teams', 'members'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-surface-200 dark:bg-gray-700 text-surface-900 dark:text-white' : 'text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-surface-300 dark:border-gray-700 rounded-lg text-sm text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56" />
        </div>
      </div>

      {/* Teams grid */}
      {tab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map(team => (
            <div key={team.id} className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-5 hover:border-surface-300 dark:hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${team.color} flex items-center justify-center`}>
                  <Users className="w-5 h-5 text-surface-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-surface-400 dark:text-gray-500 hover:text-surface-900 dark:hover:text-white rounded-md hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-surface-400 dark:text-gray-500 hover:text-surface-900 dark:hover:text-white rounded-md hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{team.name}</h3>
              <p className="text-sm text-surface-400 dark:text-gray-500 mb-4 line-clamp-2">{team.description}</p>
              <div className="flex items-center justify-between text-xs text-surface-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{team.members} members</span>
                <span>{team.docs.toLocaleString()} docs</span>
                <span className={`px-2 py-0.5 rounded-full border text-xs ${roleBadge(team.role)} capitalize`}>
                  {team.role}
                </span>
              </div>
            </div>
          ))}
          {/* Add team card */}
          <button className="bg-white dark:bg-gray-900 border border-dashed border-surface-300 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-500 hover:bg-surface-100 dark:hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center gap-2 text-surface-400 dark:text-gray-500 hover:text-indigo-400 min-h-[160px]">
            <Plus className="w-8 h-8" />
            <span className="text-sm font-medium">Create new team</span>
          </button>
        </div>
      )}

      {/* Members table */}
      {tab === 'members' && (
        <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-gray-800">
            <span className="text-sm text-surface-500 dark:text-gray-400">{filteredMembers.length} members</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-surface-900 dark:text-white rounded-lg transition-colors">
              <Mail className="w-4 h-4" />
              Invite
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 dark:border-gray-800 text-xs text-surface-400 dark:text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Member</th>
                <th className="text-left px-5 py-3">Team</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(m => (
                <tr key={m.id} className="border-b border-surface-200 dark:border-gray-800/50 hover:bg-surface-100 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-surface-900 dark:text-white text-xs font-bold">{m.avatar}</div>
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">{m.name}</p>
                        <p className="text-xs text-surface-400 dark:text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-surface-500 dark:text-gray-400">{m.team}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${roleBadge(m.role)} capitalize`}>
                      {roleIcon(m.role)}{m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-surface-400 dark:text-gray-500">{m.joined}</td>
                  <td className="px-5 py-3">
                    <button className="p-1.5 text-surface-400 dark:text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
