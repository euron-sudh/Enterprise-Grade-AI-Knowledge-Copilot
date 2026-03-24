'use client';

import { useState } from 'react';
import { Bell, MessageSquare, FileText, Users, Zap, CheckCheck, Trash2, Settings, Search, Filter } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'chat', title: 'New reply in "Q4 Strategy" conversation', body: 'The AI found 3 new documents relevant to your question about revenue targets.', time: '2 min ago', read: false, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: '2', type: 'document', title: 'Document indexed successfully', body: 'Q4_Financial_Report.pdf has been processed and is now searchable.', time: '15 min ago', read: false, icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: '3', type: 'team', title: 'Sarah Chen shared a collection with you', body: '"Product Roadmap 2026" collection is now accessible to your account.', time: '1 hour ago', read: false, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: '4', type: 'workflow', title: 'Workflow "Weekly Digest" ran successfully', body: 'Your weekly knowledge digest has been sent to 12 team members.', time: '3 hours ago', read: true, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { id: '5', type: 'document', title: 'Sync completed: Google Drive', body: '47 new documents were imported from your Google Drive connection.', time: '5 hours ago', read: true, icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: '6', type: 'chat', title: 'Meeting recap ready', body: 'AI recap for "Product Planning - March 24" is now available with action items.', time: '1 day ago', read: true, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: '7', type: 'team', title: 'You were added to "Engineering" team', body: 'Admin granted you access to the Engineering knowledge base and channels.', time: '2 days ago', read: true, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: '8', type: 'workflow', title: 'Workflow error: Slack Digest', body: 'Failed to deliver Slack digest — check your Slack integration settings.', time: '3 days ago', read: true, icon: Zap, color: 'text-red-400', bg: 'bg-red-500/10' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));
  const markRead = (id: string) => setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const remove = (id: string) => setNotifications(n => n.filter(x => x.id !== id));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Stay updated on your knowledge base activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
          <button className="p-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-lg mb-6 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {f} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {displayed.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => (
            <div key={n.id} onClick={() => markRead(n.id)}
              className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-gray-900 border-indigo-500/30 hover:border-indigo-500/50'}`}>
              {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />}
              {n.read && <div className="w-2 h-2 mt-2 shrink-0" />}
              <div className={`w-9 h-9 rounded-lg ${n.bg} flex items-center justify-center shrink-0`}>
                <n.icon className={`w-4 h-4 ${n.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.read ? 'text-gray-300' : 'text-white'}`}>{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
                <p className="text-xs text-gray-600 mt-1">{n.time}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(n.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
