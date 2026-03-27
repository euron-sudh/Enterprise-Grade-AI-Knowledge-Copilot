'use client';

import { useState } from 'react';
import { Search, UserPlus, MoreHorizontal, Shield, Check, X, Mail, Trash2, Ban, ChevronLeft, ChevronRight } from 'lucide-react';

const USERS = [
  { id: '1', name: 'Alex Kim', email: 'alex@company.com', role: 'Super Admin', status: 'Active', joined: 'Jan 5, 2026', lastActive: '2 min ago', avatar: 'AK', color: 'from-indigo-500 to-violet-600' },
  { id: '2', name: 'Sofia Reyes', email: 'sofia@company.com', role: 'Admin', status: 'Active', joined: 'Jan 5, 2026', lastActive: '1 hour ago', avatar: 'SR', color: 'from-violet-500 to-purple-600' },
  { id: '3', name: 'James Chen', email: 'james@company.com', role: 'Member', status: 'Active', joined: 'Feb 1, 2026', lastActive: '3 hours ago', avatar: 'JC', color: 'from-pink-500 to-rose-600' },
  { id: '4', name: 'Maya Patel', email: 'maya@company.com', role: 'Member', status: 'Active', joined: 'Feb 10, 2026', lastActive: 'Yesterday', avatar: 'MP', color: 'from-amber-500 to-orange-600' },
  { id: '5', name: 'David Lee', email: 'david@company.com', role: 'Team Admin', status: 'Active', joined: 'Feb 15, 2026', lastActive: '2 days ago', avatar: 'DL', color: 'from-teal-500 to-emerald-600' },
  { id: '6', name: 'Emma Brooks', email: 'emma@company.com', role: 'Viewer', status: 'Active', joined: 'Mar 1, 2026', lastActive: '1 week ago', avatar: 'EB', color: 'from-cyan-500 to-blue-600' },
  { id: '7', name: 'Ryan Walsh', email: 'ryan@company.com', role: 'Member', status: 'Suspended', joined: 'Mar 5, 2026', lastActive: '2 weeks ago', avatar: 'RW', color: 'from-gray-500 to-slate-600' },
  { id: '8', name: 'Lisa Park', email: 'lisa@company.com', role: 'Guest', status: 'Invited', joined: 'Mar 20, 2026', lastActive: 'Never', avatar: 'LP', color: 'from-rose-500 to-pink-600' },
];

const roleColors: Record<string, string> = {
  'Super Admin': 'bg-red-500/20 text-red-400 border-red-500/30',
  Admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Team Admin': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  Member: 'bg-green-500/20 text-green-400 border-green-500/30',
  Viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  Guest: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/20 text-green-400',
  Suspended: 'bg-red-500/20 text-red-400',
  Invited: 'bg-amber-500/20 text-amber-400',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');

  const filtered = USERS.filter(u =>
    (search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === 'All' || u.role === roleFilter) &&
    (statusFilter === 'All' || u.status === statusFilter)
  );

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allSelected = filtered.length > 0 && filtered.every(u => selected.includes(u.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your organization's members and permissions</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '47', color: 'text-white' },
          { label: 'Active', value: '43', color: 'text-green-400' },
          { label: 'Admins', value: '3', color: 'text-indigo-400' },
          { label: 'New This Month', value: '8', color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          {['All', 'Super Admin', 'Admin', 'Team Admin', 'Member', 'Viewer', 'Guest'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          {['All', 'Active', 'Suspended', 'Invited'].map(s => <option key={s}>{s}</option>)}
        </select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">{selected.length} selected</span>
            <button className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center gap-1"><Ban className="w-3 h-3" />Suspend</button>
            <button className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : filtered.map(u => u.id))} className="rounded" /></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Active</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(user => (
              <tr key={user.id} className={`hover:bg-gray-800/50 transition-colors ${selected.includes(user.id) ? 'bg-indigo-500/5' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleSelect(user.id)} className="rounded" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{user.avatar}</div>
                    <div>
                      <div className="text-white text-sm font-medium">{user.name}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400'}`}>{user.role}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[user.status] || 'bg-gray-500/20 text-gray-400'}`}>{user.status}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-sm">{user.joined}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-sm">{user.lastActive}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-gray-500 hover:text-white transition-colors p-1 rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-gray-500 text-sm">Showing {filtered.length} of {USERS.length} users</span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-gray-400 text-sm px-2">1 / 1</span>
            <button className="p-1.5 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Invite User</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email address</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="colleague@company.com" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                  {['Member', 'Team Admin', 'Admin', 'Viewer', 'Guest'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={() => setShowInvite(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"><Mail className="w-4 h-4" />Send Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
