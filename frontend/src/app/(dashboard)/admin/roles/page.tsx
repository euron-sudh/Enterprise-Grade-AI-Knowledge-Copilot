'use client';

import { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronUp, Users } from 'lucide-react';

const PERMISSIONS = [
  { group: 'Knowledge Base', perms: ['knowledge:read', 'knowledge:write', 'knowledge:delete', 'knowledge:admin'] },
  { group: 'Chat', perms: ['chat:read', 'chat:write', 'chat:delete', 'chat:share'] },
  { group: 'Analytics', perms: ['analytics:read', 'analytics:export', 'analytics:admin'] },
  { group: 'Users', perms: ['users:read', 'users:invite', 'users:manage', 'users:delete'] },
  { group: 'Admin', perms: ['admin:read', 'admin:write', 'admin:billing', 'admin:security'] },
  { group: 'Integrations', perms: ['integrations:read', 'integrations:manage', 'integrations:delete'] },
];

const ROLES = [
  {
    id: '1', name: 'Super Admin', description: 'Full access to everything', color: 'from-red-500 to-rose-600',
    users: 2, isSystem: true,
    permissions: ['knowledge:read','knowledge:write','knowledge:delete','knowledge:admin','chat:read','chat:write','chat:delete','chat:share','analytics:read','analytics:export','analytics:admin','users:read','users:invite','users:manage','users:delete','admin:read','admin:write','admin:billing','admin:security','integrations:read','integrations:manage','integrations:delete'],
  },
  {
    id: '2', name: 'Admin', description: 'Administrative access excluding billing and security', color: 'from-indigo-500 to-violet-600',
    users: 3, isSystem: true,
    permissions: ['knowledge:read','knowledge:write','knowledge:delete','knowledge:admin','chat:read','chat:write','chat:delete','chat:share','analytics:read','analytics:export','users:read','users:invite','users:manage','integrations:read','integrations:manage'],
  },
  {
    id: '3', name: 'Team Admin', description: 'Manage team members and team resources', color: 'from-violet-500 to-purple-600',
    users: 8, isSystem: false,
    permissions: ['knowledge:read','knowledge:write','knowledge:delete','chat:read','chat:write','chat:share','analytics:read','users:read','users:invite'],
  },
  {
    id: '4', name: 'Member', description: 'Standard access to chat, knowledge, and search', color: 'from-green-500 to-emerald-600',
    users: 34, isSystem: true,
    permissions: ['knowledge:read','knowledge:write','chat:read','chat:write','chat:share','analytics:read'],
  },
  {
    id: '5', name: 'Viewer', description: 'Read-only access to knowledge and chat', color: 'from-gray-500 to-slate-600',
    users: 12, isSystem: false,
    permissions: ['knowledge:read','chat:read'],
  },
  {
    id: '6', name: 'Guest', description: 'Limited access, invite-only', color: 'from-amber-500 to-orange-600',
    users: 5, isSystem: false,
    permissions: ['knowledge:read','chat:read'],
  },
];

export default function RolesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Role Management</h1>
          <p className="text-gray-400 text-sm mt-1">Define roles and configure granular permissions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {/* Roles list */}
      <div className="space-y-3">
        {ROLES.map(role => (
          <div key={role.id} className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === role.id ? null : role.id)}
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{role.name}</span>
                  {role.isSystem && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">System</span>}
                </div>
                <p className="text-gray-500 text-sm truncate">{role.description}</p>
              </div>
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Users className="w-3.5 h-3.5" />
                  <span>{role.users} users</span>
                </div>
                <div className="text-gray-400 text-sm">{role.permissions.length} permissions</div>
                {!role.isSystem && (
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {expanded === role.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>
            {expanded === role.id && (
              <div className="border-t border-white/5 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PERMISSIONS.map(group => (
                    <div key={group.group} className="bg-gray-800/50 rounded-xl p-4">
                      <h4 className="text-white text-sm font-semibold mb-3">{group.group}</h4>
                      <div className="space-y-2">
                        {group.perms.map(perm => {
                          const has = role.permissions.includes(perm);
                          return (
                            <div key={perm} className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs font-mono">{perm}</span>
                              {has ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-gray-600" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Create Custom Role</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Role Name</label>
                <input type="text" placeholder="e.g. Content Manager" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                <input type="text" placeholder="Brief description of this role" className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Base on existing role</label>
                <select className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="">Start from scratch</option>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">Create & Configure</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
