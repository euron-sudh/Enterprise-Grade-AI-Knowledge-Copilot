'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { User, Mail, Building2, Bell, Shield, Key, Palette, Globe, Save, Camera, Moon, Sun, Monitor, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['General', 'Notifications', 'Security', 'Appearance'] as const;
type Tab = typeof TABS[number];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [notifs, setNotifs] = useState({
    emailDigest: true, newDocuments: true, meetingRecaps: true,
    workflowAlerts: false, teamMentions: true, systemUpdates: false,
  });

  // Profile form state
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading]  = useState(true);

  // Password change state
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const getToken = () => (session as any)?.accessToken;
  const getUser  = () => ({ email: session?.user?.email, name: session?.user?.name });

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);
    authFetch('/api/backend/auth/me', {}, getToken(), getUser())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setName(data.name ?? '');
          setEmail(data.email ?? '');
          setCompany(data.company ?? '');
          setJobTitle(data.jobTitle ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, session?.user?.email]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/backend/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, jobTitle }),
      }, getToken(), getUser());
      if (res.ok) {
        setSaved(true);
        toast.success('Profile saved');
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('Failed to save profile');
      }
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8)    { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      const res = await authFetch('/api/backend/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      }, getToken(), getUser());
      if (res.ok) { toast.success('Password updated'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
      else { const d = await res.json().catch(() => ({})); toast.error(d?.detail ?? 'Failed to update password'); }
    } finally { setChangingPw(false); }
  };

  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const roleLabel = (session as any)?.user?.role ?? 'Member';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Profile & Settings</h1>
        <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-indigo-500/10 text-indigo-400' : 'text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-gray-800'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {/* General */}
          {activeTab === 'General' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-6">Personal Information</h2>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                      <button className="absolute bottom-0 right-0 w-7 h-7 bg-surface-200 dark:bg-gray-700 hover:bg-surface-300 dark:hover:bg-gray-600 border border-surface-300 dark:border-gray-600 rounded-full flex items-center justify-center transition-colors">
                        <Camera className="w-3.5 h-3.5 text-surface-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <div>
                      <p className="text-surface-900 dark:text-white font-medium">{name || email}</p>
                      <p className="text-sm text-surface-400 dark:text-gray-500">{email}</p>
                      <p className="text-xs text-indigo-400 mt-1">{roleLabel}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                          className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm placeholder-surface-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                        <input value={email} disabled placeholder="your@email.com"
                          className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm opacity-50 cursor-not-allowed" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Company</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name"
                          className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm placeholder-surface-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Job Title</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Product Manager"
                          className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm placeholder-surface-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Language</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                        <select className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none">
                          <option>English (US)</option><option>Spanish</option><option>French</option><option>German</option><option>Japanese</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'Notifications' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Notification Preferences</h2>
              <p className="text-sm text-surface-400 dark:text-gray-500 mb-6">Choose how and when you receive notifications.</p>
              <div className="space-y-4">
                {(Object.entries(notifs) as [keyof typeof notifs, boolean][]).map(([key, val]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    emailDigest:    { title: 'Email Digest',     desc: 'Daily summary of knowledge base activity' },
                    newDocuments:   { title: 'New Documents',    desc: 'When new docs are added to your collections' },
                    meetingRecaps:  { title: 'Meeting Recaps',   desc: 'When AI recaps are ready for your meetings' },
                    workflowAlerts: { title: 'Workflow Alerts',  desc: 'When workflows fail or need attention' },
                    teamMentions:   { title: 'Team Mentions',    desc: 'When someone @mentions you in a conversation' },
                    systemUpdates:  { title: 'System Updates',   desc: 'Platform maintenance and feature announcements' },
                  };
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-surface-200 dark:border-gray-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">{labels[key].title}</p>
                        <p className="text-xs text-surface-400 dark:text-gray-500">{labels[key].desc}</p>
                      </div>
                      <button onClick={() => setNotifs(n => ({ ...n, [key]: !val }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-indigo-600' : 'bg-surface-200 dark:bg-gray-700'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'Security' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400" />Change Password</h2>
                <div className="space-y-4">
                  {[['Current Password', currentPw, setCurrentPw], ['New Password', newPw, setNewPw], ['Confirm New Password', confirmPw, setConfirmPw]].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">{label as string}</label>
                      <input type="password" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                  ))}
                  <button onClick={handleChangePassword} disabled={changingPw || !currentPw || !newPw || !confirmPw}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                    {changingPw && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">Two-Factor Authentication</h2>
                <p className="text-sm text-surface-400 dark:text-gray-500 mb-4">Add an extra layer of security to your account.</p>
                <button className="px-4 py-2 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 text-sm font-medium rounded-lg transition-colors">Enable 2FA</button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'Appearance' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-6 flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-400" />Appearance</h2>
              <div>
                <p className="text-sm font-medium text-surface-600 dark:text-gray-300 mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {([['dark', Moon, 'Dark'], ['light', Sun, 'Light'], ['system', Monitor, 'System']] as const).map(([val, Icon, label]) => (
                    <button key={val} onClick={() => setTheme(val)}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === val ? 'border-indigo-500 bg-indigo-500/10' : 'border-surface-300 dark:border-gray-700 hover:border-surface-300 dark:hover:border-gray-600'}`}>
                      <Icon className={`w-6 h-6 ${theme === val ? 'text-indigo-400' : 'text-surface-500 dark:text-gray-400'}`} />
                      <span className={`text-sm font-medium ${theme === val ? 'text-indigo-400' : 'text-surface-500 dark:text-gray-400'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
