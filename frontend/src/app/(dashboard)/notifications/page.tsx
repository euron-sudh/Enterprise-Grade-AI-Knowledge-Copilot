'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import { Bell, MessageSquare, FileText, Users, Zap, CheckCheck, Trash2, Settings, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  chat: { icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  document: { icon: FileText, color: 'text-green-400', bg: 'bg-green-500/10' },
  team: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  workflow: { icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  system: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.system;
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/backend/notifications', {}, session?.accessToken, getUser());
      if (res.ok) {
        const data = await res.json();
        const items: any[] = Array.isArray(data) ? data : (data.items ?? data.notifications ?? []);
        setNotifications(items.map((n: any) => ({
          id: n.id ?? String(Math.random()),
          type: n.type ?? 'system',
          title: n.title ?? n.message ?? 'Notification',
          body: n.body ?? n.content ?? n.description ?? '',
          time: n.createdAt ?? n.time ?? '',
          read: n.read ?? n.isRead ?? false,
        })));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.accessToken]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markAllRead = async () => {
    setNotifications(n => n.map(x => ({ ...x, read: true })));
    try {
      await authFetch('/api/backend/notifications/read-all', { method: 'PUT' }, session?.accessToken, getUser());
    } catch { /* optimistic update already applied */ }
  };

  const markRead = async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    try {
      await authFetch(`/api/backend/notifications/${id}/read`, { method: 'PUT' }, session?.accessToken, getUser());
    } catch { /* optimistic update already applied */ }
  };

  const remove = async (id: string) => {
    setNotifications(n => n.filter(x => x.id !== id));
    try {
      await authFetch(`/api/backend/notifications/${id}`, { method: 'DELETE' }, session?.accessToken, getUser());
    } catch { /* optimistic update already applied */ }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-500 text-surface-900 dark:text-white rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">Stay updated on your knowledge base activity</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white border border-surface-300 dark:border-gray-700 rounded-lg hover:border-surface-300 dark:hover:border-gray-600 transition-colors">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button className="p-2 text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white border border-surface-300 dark:border-gray-700 rounded-lg hover:border-surface-300 dark:hover:border-gray-600 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-lg mb-6 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-surface-200 dark:bg-gray-700 text-surface-900 dark:text-white' : 'text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white'}`}>
            {f} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-surface-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-gray-400 font-medium mb-1">No {filter === 'unread' ? 'unread ' : ''}notifications</p>
          <p className="text-surface-400 dark:text-gray-600 text-sm">
            {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here as you use the platform'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => {
            const meta = getTypeMeta(n.type);
            const Icon = meta.icon;
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-white dark:bg-gray-900 border-surface-200 dark:border-gray-800 hover:border-surface-300 dark:hover:border-gray-700' : 'bg-white dark:bg-gray-900 border-indigo-500/30 hover:border-indigo-500/50'}`}>
                {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />}
                {n.read && <div className="w-2 h-2 mt-2 shrink-0" />}
                <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.read ? 'text-surface-600 dark:text-gray-300' : 'text-surface-900 dark:text-white'}`}>{n.title}</p>
                  {n.body && <p className="text-sm text-surface-400 dark:text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>}
                  <p className="text-xs text-surface-400 dark:text-gray-600 mt-1">{n.time ? timeAgo(n.time) : ''}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); void remove(n.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-400 dark:text-gray-600 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
