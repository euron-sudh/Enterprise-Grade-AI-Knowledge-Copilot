'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  FileText,
  Search,
  TrendingUp,
  Clock,
  Zap,
  BookOpen,
  Video,
  Bot,
  ArrowRight,
  BarChart3,
  Users,
  Database,
  Activity,
  Loader2,
} from 'lucide-react';

interface HomeStats {
  queriesToday: number;
  queriesChange: number;
  totalDocuments: number;
  activeConnectors: number;
  totalConversations: number;
  recentActivity: { type: string; action: string; time: string }[];
}

const QUICK_ACTIONS = [
  { label: 'Ask AI', description: 'Chat with your knowledge base', href: '/chat', icon: MessageSquare, gradient: 'from-brand-500 to-brand-600' },
  { label: 'Upload Documents', description: 'Add files to your knowledge base', href: '/knowledge-base', icon: BookOpen, gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'Search', description: 'Find anything across all sources', href: '/search', icon: Search, gradient: 'from-violet-500 to-violet-600' },
  { label: 'New Meeting', description: 'Start or schedule a meeting', href: '/meetings', icon: Video, gradient: 'from-rose-500 to-rose-600' },
  { label: 'Analytics', description: 'View usage and insights', href: '/analytics', icon: BarChart3, gradient: 'from-amber-500 to-amber-600' },
  { label: 'AI Agents', description: 'Run autonomous AI workflows', href: '/agents', icon: Bot, gradient: 'from-cyan-500 to-cyan-600' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  chat: { icon: MessageSquare, color: 'text-brand-500 bg-brand-50 dark:bg-brand-950' },
  document: { icon: FileText, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950' },
  search: { icon: Search, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950' },
};

export default function HomePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;
    fetch('/api/backend/analytics/home-stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const statCards = [
    {
      label: 'Queries Today',
      value: loading ? '—' : (stats?.queriesToday ?? 0).toLocaleString(),
      change: stats ? `${stats.queriesChange >= 0 ? '+' : ''}${stats.queriesChange}% vs yesterday` : '—',
      trend: (stats?.queriesChange ?? 0) >= 0 ? 'up' : 'down',
      icon: MessageSquare,
      color: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950',
    },
    {
      label: 'Documents Indexed',
      value: loading ? '—' : (stats?.totalDocuments ?? 0).toLocaleString(),
      change: 'Total in knowledge base',
      trend: 'neutral',
      icon: FileText,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Conversations',
      value: loading ? '—' : (stats?.totalConversations ?? 0).toLocaleString(),
      change: 'All time',
      trend: 'neutral',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950',
    },
    {
      label: 'Active Connectors',
      value: loading ? '—' : (stats?.activeConnectors ?? 0).toLocaleString(),
      change: 'Connected data sources',
      trend: 'neutral',
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950',
    },
  ] as const;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Here&apos;s what&apos;s happening across your knowledge base today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              All systems operational
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{stat.label}</p>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-surface-400" /> : stat.value}
              </p>
              <p className={`mt-1 text-xs font-medium ${
                stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                : stat.trend === 'down' ? 'text-red-600 dark:text-red-400'
                : 'text-surface-400'
              }`}>
                <TrendingUp className="inline h-3 w-3 mr-0.5" />
                {stat.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="card p-4 flex flex-col items-center gap-3 text-center hover:shadow-card-hover hover:border-brand-200 dark:hover:border-brand-800 transition-all group cursor-pointer"
            >
              <div className={`rounded-xl bg-gradient-to-br ${action.gradient} p-3 shadow-sm group-hover:scale-105 transition-transform`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">{action.label}</p>
                <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5 line-clamp-2">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-surface-400" />
              Recent Activity
            </h2>
            <Link href="/analytics" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
            </div>
          ) : !stats?.recentActivity?.length ? (
            <div className="px-5 py-10 text-center text-sm text-surface-400">
              No activity yet. Start a conversation or upload a document!
            </div>
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {stats.recentActivity.map((item, i) => {
                const cfg = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS['chat'];
                const Icon = cfg.icon;
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{item.action}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-surface-400 dark:text-surface-500 whitespace-nowrap">
                      {timeAgo(item.time)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Knowledge Summary */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-surface-400" />
              Knowledge Base
            </h2>
            <Link href="/knowledge-base" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-5 py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Documents</p>
                <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  {loading ? '—' : (stats?.totalDocuments ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
                <Database className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-surface-500">Active Connectors</p>
                <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  {loading ? '—' : (stats?.activeConnectors ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
            <Link
              href="/knowledge-base"
              className="block w-full rounded-lg border border-dashed border-surface-200 dark:border-surface-700 py-3 text-center text-xs text-surface-500 hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors"
            >
              + Upload documents
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
