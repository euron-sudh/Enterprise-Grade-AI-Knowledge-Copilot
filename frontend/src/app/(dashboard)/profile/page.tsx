'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, Building2, Bell, Shield, Key, Palette, Globe, Save, Camera, Moon, Sun, Monitor } from 'lucide-react';

const TABS = ['General', 'Notifications', 'Security', 'Appearance', 'API Keys'] as const;
type Tab = typeof TABS[number];

export default function ProfilePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [notifs, setNotifs] = useState({
    emailDigest: true, newDocuments: true, meetingRecaps: true,
    workflowAlerts: false, teamMentions: true, systemUpdates: false,
  });

  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
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

        {/* Content */}
        <div className="flex-1">
          {/* General */}
          {activeTab === 'General' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-6">Personal Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-surface-900 dark:text-white text-2xl font-bold">
                    {initials}
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-surface-200 dark:bg-gray-700 hover:bg-surface-300 dark:hover:bg-gray-600 border border-surface-300 dark:border-gray-600 rounded-full flex items-center justify-center transition-colors">
                    <Camera className="w-3.5 h-3.5 text-surface-600 dark:text-gray-300" />
                  </button>
                </div>
                <div>
                  <p className="text-surface-900 dark:text-white font-medium">{name}</p>
                  <p className="text-sm text-surface-400 dark:text-gray-500">{email}</p>
                  <p className="text-xs text-indigo-400 mt-1">Member · Euron</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Full Name', icon: User, value: name, placeholder: 'Your full name' },
                  { label: 'Email Address', icon: Mail, value: email, placeholder: 'your@email.com', disabled: true },
                  { label: 'Company', icon: Building2, value: 'Euron', placeholder: 'Company name' },
                  { label: 'Job Title', icon: User, value: '', placeholder: 'e.g. Product Manager' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">{f.label}</label>
                    <div className="relative">
                      <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                      <input defaultValue={f.value} placeholder={f.placeholder} disabled={f.disabled}
                        className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm placeholder-surface-400 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">Language</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-gray-500" />
                    <select className="w-full pl-9 pr-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Japanese</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-surface-900 dark:text-white text-sm font-medium rounded-lg transition-colors">
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'Notifications' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Notification Preferences</h2>
              <p className="text-sm text-surface-400 dark:text-gray-500 mb-6">Choose how and when you receive notifications.</p>
              <div className="space-y-4">
                {Object.entries(notifs).map(([key, val]) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    emailDigest: { title: 'Email Digest', desc: 'Daily summary of knowledge base activity' },
                    newDocuments: { title: 'New Documents', desc: 'When new docs are added to your collections' },
                    meetingRecaps: { title: 'Meeting Recaps', desc: 'When AI recaps are ready for your meetings' },
                    workflowAlerts: { title: 'Workflow Alerts', desc: 'When workflows fail or need attention' },
                    teamMentions: { title: 'Team Mentions', desc: 'When someone @mentions you in a conversation' },
                    systemUpdates: { title: 'System Updates', desc: 'Platform maintenance and feature announcements' },
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
                  {['Current Password', 'New Password', 'Confirm New Password'].map(l => (
                    <div key={l}>
                      <label className="block text-sm font-medium text-surface-600 dark:text-gray-300 mb-1.5">{l}</label>
                      <input type="password" placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-surface-100 dark:bg-gray-800 border border-surface-300 dark:border-gray-700 rounded-lg text-surface-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                  ))}
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-surface-900 dark:text-white text-sm font-medium rounded-lg transition-colors">Update Password</button>
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

          {/* API Keys */}
          {activeTab === 'API Keys' && (
            <div className="bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2"><Key className="w-5 h-5 text-indigo-400" />API Keys</h2>
                  <p className="text-sm text-surface-400 dark:text-gray-500 mt-1">Use API keys to access KnowledgeForge programmatically.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-surface-900 dark:text-white text-sm font-medium rounded-lg transition-colors">
                  <Key className="w-4 h-4" />Generate Key
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Production Key', key: 'kf_live_••••••••••••••••3a9f', created: 'Mar 1, 2026', lastUsed: '2 hours ago' },
                  { name: 'Development Key', key: 'kf_test_••••••••••••••••7c2e', created: 'Feb 15, 2026', lastUsed: '1 day ago' },
                ].map(k => (
                  <div key={k.name} className="flex items-center justify-between p-4 bg-surface-100 dark:bg-gray-800 rounded-lg border border-surface-300 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{k.name}</p>
                      <p className="text-xs text-surface-400 dark:text-gray-500 font-mono mt-0.5">{k.key}</p>
                      <p className="text-xs text-surface-400 dark:text-gray-600 mt-1">Created {k.created} · Last used {k.lastUsed}</p>
                    </div>
                    <button className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Revoke</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
