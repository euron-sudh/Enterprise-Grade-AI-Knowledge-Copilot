'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Users, Plus, Search, MoreHorizontal, Shield, Crown, User, Mail, Trash2, Settings, Loader2, RefreshCw } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  members: number;
  docs: number;
  color: string;
  role: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  avatar: string;
  joined: string;
}

const GRADIENT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-gray-500 to-slate-500',
  'from-cyan-500 to-sky-500',
  'from-indigo-500 to-blue-500',
];

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const roleIcon = (role: string) => {
  if (role === 'admin' || role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
  if (role === 'member') return <User className="w-3.5 h-3.5 text-blue-400" />;
  return <Shield className="w-3.5 h-3.5 text-surface-500 dark:text-gray-400" />;
};

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    member: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    viewer: 'bg-gray-500/10 text-surface-500 dark:text-gray-400 border-gray-500/20',
  };
  return styles[role] || styles.viewer;
};

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<'teams' | 'members'>('teams');
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const handleCreateTeam = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/backend/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      }, session?.accessToken, getUser());
      if (res.ok) {
        const created = await res.json();
        setTeams(prev => [{
          id: created.id,
          name: created.name,
          description: created.description,
          members: created.memberCount ?? 1,
          docs: 0,
          color: GRADIENT_COLORS[prev.length % GRADIENT_COLORS.length],
          role: 'owner',
        }, ...prev]);
        setNewName('');
        setNewDesc('');
        setShowCreate(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail ?? 'Failed to create team');
      }
    } catch {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await authFetch(`/api/backend/admin/teams/${teamId}`, { method: 'DELETE' }, session?.accessToken, getUser());
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch {
      setError('Failed to delete team');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamsRes, usersRes] = await Promise.all([
        authFetch('/api/backend/admin/teams', {}, session?.accessToken, getUser()),
        authFetch('/api/backend/users', {}, session?.accessToken, getUser()),
      ]);

      if (teamsRes.ok) {
        const data = await teamsRes.json();
        const items: any[] = Array.isArray(data) ? data : (data.items ?? data.teams ?? []);
        setTeams(items.map((t: any, i: number) => ({
          id: t.id ?? String(i),
          name: t.name ?? 'Unnamed Team',
          description: t.description ?? '',
          members: t.memberCount ?? t.members ?? 0,
          docs: t.documentCount ?? t.docs ?? 0,
          color: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
          role: t.userRole ?? t.role ?? 'member',
        })));
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        const items: any[] = Array.isArray(data) ? data : (data.items ?? data.users ?? []);
        setMembers(items.map((u: any) => ({
          id: u.id ?? String(Math.random()),
          name: u.name ?? u.fullName ?? u.email ?? 'Unknown',
          email: u.email ?? '',
          role: u.role ?? 'member',
          team: u.teamName ?? u.team ?? '—',
          avatar: initials(u.name ?? u.email ?? '?'),
          joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
        })));
      }
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken]);

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = members.length || teams.reduce((sum, t) => sum + t.members, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Teams</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">Manage teams and member access to knowledge</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white border border-surface-300 dark:border-gray-700 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Teams', value: teams.length.toString(), sub: 'across organization' },
          { label: 'Total Members', value: totalMembers.toString(), sub: 'active users' },
          { label: 'Shared Collections', value: '—', sub: 'knowledge collections' },
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

      {error && <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : tab === 'teams' ? (
        filteredTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 dark:border-gray-700 p-12 text-center">
            <Users className="w-10 h-10 text-surface-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-surface-500 dark:text-gray-400 font-medium mb-1">No teams yet</p>
            <p className="text-surface-400 dark:text-gray-600 text-sm mb-3">Create your first team to organize members and knowledge</p>
            <button onClick={() => setShowCreate(true)} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">Create a team →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map(team => (
              <div key={team.id} className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-5 hover:border-surface-300 dark:hover:border-gray-700 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${team.color} flex items-center justify-center`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-surface-400 dark:text-gray-500 hover:text-surface-900 dark:hover:text-white rounded-md hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteTeam(team.id)} className="p-1.5 text-surface-400 dark:text-gray-500 hover:text-red-400 rounded-md hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{team.name}</h3>
                <p className="text-sm text-surface-400 dark:text-gray-500 mb-4 line-clamp-2">{team.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs text-surface-400 dark:text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{team.members} members</span>
                  {team.docs > 0 && <span>{team.docs.toLocaleString()} docs</span>}
                  <span className={`px-2 py-0.5 rounded-full border text-xs ${roleBadge(team.role)} capitalize`}>
                    {team.role}
                  </span>
                </div>
              </div>
            ))}
            {/* Add team card */}
            <button onClick={() => setShowCreate(true)} className="bg-white dark:bg-gray-900 border border-dashed border-surface-300 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-500 hover:bg-surface-100 dark:hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center gap-2 text-surface-400 dark:text-gray-500 hover:text-indigo-400 min-h-[160px]">
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">Create new team</span>
            </button>
          </div>
        )
      ) : (
        filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 dark:border-gray-700 p-12 text-center">
            <Users className="w-10 h-10 text-surface-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-surface-500 dark:text-gray-400 font-medium mb-1">No members found</p>
            <p className="text-surface-400 dark:text-gray-600 text-sm">Invite members to your organization to get started</p>
          </div>
        ) : (
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">{m.avatar}</div>
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
        )
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Create Team</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-gray-300 mb-1">Team Name <span className="text-red-400">*</span></label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                  placeholder="e.g. Engineering, Marketing"
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-50 dark:bg-gray-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What does this team work on?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-50 dark:bg-gray-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-surface-600 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white rounded-lg border border-surface-300 dark:border-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
