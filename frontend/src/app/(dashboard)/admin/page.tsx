'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  CreditCard,
  Database,
  Globe,
  Key,
  Link2,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import * as adminApi from '@/lib/api/admin';
import type { AdminUser, InviteLink, Role } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const roleColors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default' | 'info' | 'outline'> = {
  'Super Admin': 'danger',
  Admin: 'primary',
  'Team Admin': 'info',
  Member: 'success',
  Viewer: 'default',
  Guest: 'outline',
};

const severityConfig = {
  info: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950', icon: CheckCircle2 },
  warning: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', icon: AlertTriangle },
  danger: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', icon: Shield },
};

const auditLogs = [
  { actor: 'System', action: 'Application started successfully', resource: 'System', time: 'Just now', severity: 'info' },
  { actor: 'System', action: 'Database connection pool initialized', resource: 'DB', time: '1 min ago', severity: 'info' },
  { actor: 'System', action: 'AI service connected (Anthropic)', resource: 'AI', time: '1 min ago', severity: 'info' },
];

const billing = {
  plan: 'Professional',
  seats: { used: 0, total: 100 },
  storage: { used: 0, total: 100 },
  nextBilling: 'Apr 1, 2026',
  amount: '$960 / mo',
};

const adminTabs = ['Users', 'Security', 'Billing', 'System'] as const;
type AdminTab = typeof adminTabs[number];

// ── Invite Link Modal ─────────────────────────────────────────────────────────

function InviteLinkModal({
  roles,
  onClose,
  onCreated,
}: {
  roles: Role[];
  onClose: () => void;
  onCreated: (link: InviteLink) => void;
}) {
  const [form, setForm] = useState({ email: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<InviteLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const link = await adminApi.createInviteLink({ email: form.email || undefined, role: form.role });
      setCreatedLink(link);
      onCreated(link);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create invite link';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdLink) return;
    void navigator.clipboard.writeText(createdLink.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-surface-900">
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-600" /> Generate Invite Link
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {createdLink ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Invite link created!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Valid for 7 days · Role: {createdLink.role}
                {createdLink.email ? ` · For: ${createdLink.email}` : ' · Open to anyone'}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-500 uppercase tracking-wider">Shareable URL</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={createdLink.inviteUrl}
                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                >
                  {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="text-xs text-surface-400">
              Send this link to your teammate. They'll be taken to the registration page where they can create their account.
            </p>
            <Button className="w-full" variant="outline" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Email Address <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Leave blank to allow anyone to register"
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
              />
              <p className="mt-1 text-xs text-surface-400">If specified, only this email can use the link</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">Assign Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({
  roles,
  onClose,
  onInvited,
}: {
  roles: Role[];
  onClose: () => void;
  onInvited: (user: AdminUser) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', role: 'member', password: 'Welcome123!' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    try {
      const user = await adminApi.inviteUser(form);
      onInvited(user);
      toast.success(`${user.name} added successfully`);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to add user';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-surface-900">
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100">Add New User</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.com"
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300">
              Temporary Password
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Welcome123!"
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            />
            <p className="mt-1 text-xs text-surface-400">User should change this on first login</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Adding...' : 'Add User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({
  user,
  roles,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  roles: Role[];
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
}) {
  const [selectedRole, setSelectedRole] = useState(
    roles.find((r) => r.label === user.role)?.value ?? 'member'
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await adminApi.updateUser(user.id, { role: selectedRole });
      onUpdated(updated);
      toast.success(`${user.name}'s role updated to ${updated.role}`);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to update role';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-surface-900">
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100">Edit Role</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-surface-50 px-3 py-2.5 dark:bg-surface-800">
            <Avatar name={user.name} size="sm" />
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user.name}</p>
              <p className="text-xs text-surface-400">{user.email}</p>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">New Role</label>
            <div className="space-y-2">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    selectedRole === r.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                      : 'border-surface-200 hover:border-surface-300 dark:border-surface-700'
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={selectedRole === r.value}
                    onChange={() => setSelectedRole(r.value)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{r.label}</p>
                    <p className="text-xs text-surface-400">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={loading} onClick={handleSave}>
              {loading ? 'Saving...' : 'Save Role'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('Users');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([
    { value: 'super_admin', label: 'Super Admin', description: 'Full platform access' },
    { value: 'admin', label: 'Admin', description: 'Organization-level administration' },
    { value: 'team_admin', label: 'Team Admin', description: 'Manage team members and content' },
    { value: 'member', label: 'Member', description: 'Standard access to all features' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
    { value: 'guest', label: 'Guest', description: 'Limited guest access' },
  ]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, pendingUsers: 0, adminUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [userData, statsData, rolesData, linksData] = await Promise.all([
        adminApi.listUsers({ search: search || undefined }),
        adminApi.getUserStats(),
        adminApi.listRoles(),
        adminApi.listInviteLinks().catch(() => [] as InviteLink[]),
      ]);
      setUsers(userData);
      setStats(statsData);
      if (rolesData.length > 0) setRoles(rolesData);
      setInviteLinks(linksData);
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 401 || status === 403) {
        toast.error('Access denied — log out and log back in as an Admin user');
      } else if (!status) {
        toast.error('Cannot reach backend — make sure the server is running on port 8000');
      } else {
        toast.error(`Failed to load users (${status}) — make sure you have Admin access`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLink = async (id: string) => {
    if (!confirm('Revoke this invite link? It will no longer be usable.')) return;
    setRevokingId(id);
    try {
      await adminApi.revokeInviteLink(id);
      setInviteLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success('Invite link revoked');
    } catch {
      toast.error('Failed to revoke link');
    } finally {
      setRevokingId(null);
    }
  };

  useEffect(() => {
    void fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search — only re-fetch when search term changes (not on initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => void fetchUsers(), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Remove ${user.name} (${user.email}) from the platform?`)) return;
    setDeletingId(user.id);
    try {
      await adminApi.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
      toast.success(`${user.name} removed`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to remove user';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-50 dark:bg-surface-950">

      {/* Modals */}
      {showInviteLink && (
        <InviteLinkModal
          roles={roles}
          onClose={() => setShowInviteLink(false)}
          onCreated={(link) => setInviteLinks((prev) => [link, ...prev])}
        />
      )}
      {showInvite && (
        <InviteModal
          roles={roles}
          onClose={() => setShowInvite(false)}
          onInvited={(user) => {
            setUsers((prev) => [user, ...prev]);
            setStats((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
          }}
        />
      )}
      {editUser && (
        <EditRoleModal
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onUpdated={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}

      {/* Header */}
      <div className="border-b border-surface-100 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-100">Admin Console</h1>
              <p className="text-xs text-surface-500">KnowledgeForge · Admin access</p>
            </div>
          </div>
          <Badge variant="danger" size="sm">
            <Lock className="mr-1 h-3 w-3" />
            Restricted Area
          </Badge>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto">
          {adminTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                tab === t
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700 dark:hover:bg-surface-800'
              )}
            >
              {t === 'Users' && <Users className="h-4 w-4" />}
              {t === 'Security' && <Shield className="h-4 w-4" />}
              {t === 'Billing' && <CreditCard className="h-4 w-4" />}
              {t === 'System' && <Server className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">

        {/* ── USERS TAB ── */}
        {tab === 'Users' && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Users', value: String(stats.totalUsers), icon: Users, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
                { label: 'Active Users', value: String(stats.activeUsers), icon: Activity, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
                { label: 'Admin Users', value: String(stats.adminUsers), icon: UserPlus, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
                { label: 'Seats Available', value: String(Math.max(0, billing.seats.total - stats.totalUsers)), icon: UserCheck, color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
              ].map((s) => (
                <Card key={s.label} variant="bordered" className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.color)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-surface-900 dark:text-surface-100">{s.value}</p>
                    <p className="text-xs text-surface-400">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* User table */}
            <Card variant="bordered">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 pl-8 pr-3 py-1.5 text-sm placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" leftIcon={<Link2 className="h-4 w-4" />} onClick={() => setShowInviteLink(true)}>
                    Invite Link
                  </Button>
                  <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setShowInvite(true)}>
                    Add User
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-surface-400">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-surface-300" />
                  <p className="text-sm font-medium text-surface-500">
                    {search ? 'No users match your search' : 'No users yet'}
                  </p>
                  {!search && (
                    <Button size="sm" className="mt-3" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setShowInvite(true)}>
                      Add first user
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-100 dark:border-surface-800">
                        {['User', 'Role', 'Status', 'Joined', ''].map((h) => (
                          <th key={h} className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-surface-400 pr-4">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-50 dark:divide-surface-800/50">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={u.name} size="sm" status={u.status === 'active' ? 'online' : 'offline'} />
                              <div>
                                <p className="font-medium text-surface-900 dark:text-surface-100">{u.name}</p>
                                <p className="text-xs text-surface-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge size="sm" variant={roleColors[u.role] ?? 'default'}>{u.role}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              size="sm"
                              variant={u.status === 'active' ? 'success' : 'default'}
                            >
                              {u.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-surface-400 text-xs">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Edit role"
                                onClick={() => setEditUser(u)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Remove user"
                                className="text-red-400 hover:text-red-600"
                                disabled={deletingId === u.id}
                                onClick={() => handleDelete(u)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Active Invite Links */}
            {inviteLinks.length > 0 && (
              <Card variant="bordered">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-brand-600" /> Active Invite Links
                    <span className="rounded-full bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-xs font-medium text-surface-500">
                      {inviteLinks.length}
                    </span>
                  </h2>
                  <Button size="sm" variant="outline" leftIcon={<Link2 className="h-4 w-4" />} onClick={() => setShowInviteLink(true)}>
                    New Link
                  </Button>
                </div>
                <div className="space-y-2">
                  {inviteLinks.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 rounded-lg border border-surface-100 dark:border-surface-800 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge size="sm" variant={roleColors[link.role] ?? 'default'}>{link.role}</Badge>
                          {link.email && (
                            <span className="text-xs text-surface-500 truncate">{link.email}</span>
                          )}
                          {!link.email && (
                            <span className="text-xs text-surface-400 italic">Open invite</span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400 truncate font-mono">{link.inviteUrl}</p>
                        <p className="text-xs text-surface-300 dark:text-surface-600 mt-0.5">
                          Expires {new Date(link.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          title="Copy link"
                          onClick={() => {
                            void navigator.clipboard.writeText(link.inviteUrl);
                            toast.success('Link copied!');
                          }}
                          className="rounded-md p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          title="Revoke link"
                          disabled={revokingId === link.id}
                          onClick={() => handleRevokeLink(link.id)}
                          className="rounded-md p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* No invite links placeholder */}
            {inviteLinks.length === 0 && !loading && (
              <Card variant="bordered" className="border-dashed">
                <div className="py-6 text-center">
                  <Link2 className="mx-auto mb-3 h-8 w-8 text-surface-300" />
                  <p className="text-sm font-medium text-surface-500">No active invite links</p>
                  <p className="mt-1 text-xs text-surface-400">Generate a shareable link so teammates can self-register</p>
                  <Button size="sm" className="mt-3" variant="outline" leftIcon={<Link2 className="h-4 w-4" />} onClick={() => setShowInviteLink(true)}>
                    Generate Invite Link
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── SECURITY TAB ── */}
        {tab === 'Security' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Auth settings */}
              <Card variant="bordered">
                <h2 className="mb-4 font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-brand-600" /> Authentication
                </h2>
                {[
                  { label: 'JWT Authentication', value: 'Active — HS256 signed tokens', on: true },
                  { label: 'Token Expiry', value: 'Access: 30 min · Refresh: 30 days', on: true },
                  { label: 'Password Hashing', value: 'bcrypt — industry standard', on: true },
                  { label: 'CORS Protection', value: 'Configured for localhost:3001', on: true },
                  { label: 'SAML / SSO', value: 'Not configured', on: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-surface-50 dark:border-surface-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{item.label}</p>
                      <p className="text-xs text-surface-400">{item.value}</p>
                    </div>
                    <div className={cn('h-2 w-2 rounded-full', item.on ? 'bg-emerald-500' : 'bg-surface-300')} />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-3 w-full" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Configure Auth
                </Button>
              </Card>

              {/* API Keys */}
              <Card variant="bordered">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                    <Key className="h-4 w-4 text-brand-600" /> API Keys
                  </h2>
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>New Key</Button>
                </div>
                <div className="py-8 text-center text-sm text-surface-400">
                  No API keys configured yet
                </div>
              </Card>
            </div>

            {/* Audit log */}
            <Card variant="bordered">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-brand-600" /> Audit Log
                </h2>
                <Button size="sm" variant="outline">Export</Button>
              </div>
              <div className="space-y-2">
                {auditLogs.map((log, i) => {
                  const sc = severityConfig[log.severity as keyof typeof severityConfig];
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/30">
                      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', sc.bg, sc.color)}>
                        <sc.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                          <span className="font-medium text-surface-900 dark:text-surface-100">{log.actor}</span>{' '}
                          {log.action}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-surface-400">
                          <Badge size="sm" variant="outline">{log.resource}</Badge>
                          {log.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {tab === 'Billing' && (
          <div className="space-y-4">
            <Card variant="bordered" className="bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-100">Current Plan</p>
                  <h2 className="text-2xl font-bold">{billing.plan}</h2>
                  <p className="mt-1 text-sm text-indigo-200">{billing.amount} · Renews {billing.nextBilling}</p>
                </div>
                <Button className="bg-white text-indigo-700 hover:bg-indigo-50 self-start sm:self-auto" size="sm">
                  Upgrade to Enterprise
                </Button>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card variant="bordered">
                <h3 className="mb-3 font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-600" /> Seat Usage
                </h3>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-bold text-surface-900 dark:text-surface-100">{stats.totalUsers}</span>
                  <span className="text-sm text-surface-400">/ {billing.seats.total} seats</span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800">
                  <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, (stats.totalUsers / billing.seats.total) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-surface-400">{billing.seats.total - stats.totalUsers} seats remaining</p>
              </Card>

              <Card variant="bordered">
                <h3 className="mb-3 font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <Database className="h-4 w-4 text-brand-600" /> Storage
                </h3>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-3xl font-bold text-surface-900 dark:text-surface-100">{billing.storage.used} GB</span>
                  <span className="text-sm text-surface-400">/ {billing.storage.total} GB</span>
                </div>
                <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(billing.storage.used / billing.storage.total) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-surface-400">{billing.storage.total - billing.storage.used} GB remaining</p>
              </Card>
            </div>

            <Card variant="bordered">
              <h3 className="mb-4 font-semibold text-surface-900 dark:text-surface-100">Invoice History</h3>
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {[
                  { date: 'Mar 1, 2026', amount: '$960.00', status: 'paid' },
                  { date: 'Feb 1, 2026', amount: '$960.00', status: 'paid' },
                  { date: 'Jan 1, 2026', amount: '$800.00', status: 'paid' },
                ].map((inv) => (
                  <div key={inv.date} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-surface-400" />
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{inv.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-surface-900 dark:text-surface-100">{inv.amount}</span>
                      <Badge size="sm" variant="success">{inv.status}</Badge>
                      <Button size="sm" variant="ghost">Download</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {tab === 'System' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'API Version', value: 'v1.0.0', icon: Settings, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
                { label: 'Uptime', value: '99.9%', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
                { label: 'Environment', value: 'Local Dev', icon: Globe, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
                { label: 'Database', value: 'PostgreSQL', icon: Server, color: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
              ].map((s) => (
                <Card key={s.label} variant="bordered" className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.color)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-surface-900 dark:text-surface-100">{s.value}</p>
                    <p className="text-xs text-surface-400">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card variant="bordered">
              <h3 className="mb-4 font-semibold text-surface-900 dark:text-surface-100">Feature Flags</h3>
              <div className="space-y-3">
                {[
                  { flag: 'voice_assistant', label: 'Voice Assistant', enabled: true },
                  { flag: 'meeting_intelligence', label: 'Meeting Intelligence', enabled: true },
                  { flag: 'ai_agents', label: 'AI Agents Framework', enabled: true },
                  { flag: 'workflow_builder', label: 'Workflow Builder', enabled: true },
                  { flag: 'knowledge_graph', label: 'Knowledge Graph Viz', enabled: false },
                ].map((f) => (
                  <div key={f.flag} className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2.5 dark:bg-surface-800/50">
                    <div>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{f.label}</p>
                      <p className="text-xs font-mono text-surface-400">{f.flag}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge size="sm" variant={f.enabled ? 'success' : 'default'}>{f.enabled ? 'ON' : 'OFF'}</Badge>
                      <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
