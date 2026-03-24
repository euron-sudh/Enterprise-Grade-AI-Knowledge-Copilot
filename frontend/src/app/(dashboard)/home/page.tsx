import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
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
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// ---- Stat card types ----
interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

const STATS: StatCard[] = [
  {
    label: 'Queries Today',
    value: '1,284',
    change: '+12% vs yesterday',
    trend: 'up',
    icon: MessageSquare,
    color: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950',
  },
  {
    label: 'Documents Indexed',
    value: '48,392',
    change: '+340 this week',
    trend: 'up',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950',
  },
  {
    label: 'Active Users',
    value: '312',
    change: '+8 new this week',
    trend: 'up',
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950',
  },
  {
    label: 'Avg Response Time',
    value: '380ms',
    change: '-22ms vs last week',
    trend: 'up',
    icon: Activity,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950',
  },
];

// ---- Recent activity ----
interface ActivityItem {
  id: string;
  type: 'query' | 'upload' | 'search' | 'meeting';
  title: string;
  subtitle: string;
  time: string;
  icon: React.ElementType;
  iconColor: string;
}

const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'query',
    title: 'Chat with KnowledgeForge',
    subtitle: '"What is our Q4 sales target?" — 3 citations found',
    time: '2 min ago',
    icon: MessageSquare,
    iconColor: 'text-brand-500 bg-brand-50 dark:bg-brand-950',
  },
  {
    id: '2',
    type: 'upload',
    title: 'Document Uploaded',
    subtitle: 'Product Roadmap 2026.pdf — 48 pages indexed',
    time: '15 min ago',
    icon: FileText,
    iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  },
  {
    id: '3',
    type: 'search',
    title: 'Enterprise Search',
    subtitle: '"engineering onboarding process" — 24 results',
    time: '1 hr ago',
    icon: Search,
    iconColor: 'text-violet-500 bg-violet-50 dark:bg-violet-950',
  },
  {
    id: '4',
    type: 'meeting',
    title: 'Meeting Recap Generated',
    subtitle: 'All-Hands March 2026 — 12 action items extracted',
    time: '3 hr ago',
    icon: Video,
    iconColor: 'text-rose-500 bg-rose-50 dark:bg-rose-950',
  },
  {
    id: '5',
    type: 'query',
    title: 'Research Agent Run',
    subtitle: 'Competitor analysis report generated — 8 sources',
    time: '5 hr ago',
    icon: Bot,
    iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  },
];

// ---- Quick actions ----
interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Ask AI',
    description: 'Chat with your knowledge base',
    href: '/chat',
    icon: MessageSquare,
    gradient: 'from-brand-500 to-brand-600',
  },
  {
    label: 'Upload Documents',
    description: 'Add files to your knowledge base',
    href: '/knowledge-base/upload',
    icon: BookOpen,
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    label: 'Search',
    description: 'Find anything across all sources',
    href: '/search',
    icon: Search,
    gradient: 'from-violet-500 to-violet-600',
  },
  {
    label: 'New Meeting',
    description: 'Start or schedule a meeting',
    href: '/meetings/schedule',
    icon: Video,
    gradient: 'from-rose-500 to-rose-600',
  },
  {
    label: 'Analytics',
    description: 'View usage and insights',
    href: '/analytics',
    icon: BarChart3,
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    label: 'AI Agents',
    description: 'Run autonomous AI workflows',
    href: '/agents',
    icon: Bot,
    gradient: 'from-cyan-500 to-cyan-600',
  },
];

// ---- Knowledge coverage ----
interface CoverageItem {
  source: string;
  docs: number;
  lastSync: string;
  status: 'synced' | 'syncing' | 'error';
  icon: React.ElementType;
}

const KNOWLEDGE_SOURCES: CoverageItem[] = [
  { source: 'Confluence', docs: 12_480, lastSync: '5 min ago', status: 'synced', icon: BookOpen },
  { source: 'Google Drive', docs: 8_234, lastSync: '10 min ago', status: 'synced', icon: Database },
  { source: 'Slack', docs: 18_920, lastSync: 'Syncing...', status: 'syncing', icon: MessageSquare },
  { source: 'GitHub', docs: 4_102, lastSync: '1 hr ago', status: 'synced', icon: Database },
  { source: 'Notion', docs: 3_456, lastSync: '2 hr ago', status: 'synced', icon: BookOpen },
];

function StatusDot({ status }: { status: CoverageItem['status'] }) {
  return (
    <span
      className={
        status === 'synced'
          ? 'h-2 w-2 rounded-full bg-emerald-500'
          : status === 'syncing'
            ? 'h-2 w-2 rounded-full bg-amber-500 animate-pulse'
            : 'h-2 w-2 rounded-full bg-red-500'
      }
    />
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
                {stat.label}
              </p>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {stat.value}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  stat.trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stat.trend === 'down'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-surface-400'
                }`}
              >
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
          <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="card p-4 flex flex-col items-center gap-3 text-center hover:shadow-card-hover hover:border-brand-200 dark:hover:border-brand-800 transition-all group cursor-pointer"
            >
              <div
                className={`rounded-xl bg-gradient-to-br ${action.gradient} p-3 shadow-sm group-hover:scale-105 transition-transform`}
              >
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-800 dark:text-surface-200">
                  {action.label}
                </p>
                <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5 line-clamp-2">
                  {action.description}
                </p>
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
            <Link
              href="/analytics"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-surface-100 dark:divide-surface-700/50">
            {RECENT_ACTIVITY.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.iconColor}`}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {item.title}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                    {item.subtitle}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs text-surface-400 dark:text-surface-500 whitespace-nowrap">
                  {item.time}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Knowledge Sources */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-surface-400" />
              Knowledge Sources
            </h2>
            <Link
              href="/knowledge-base/sources"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-surface-100 dark:divide-surface-700/50">
            {KNOWLEDGE_SOURCES.map((src) => (
              <li key={src.source} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
                  <src.icon className="h-3.5 w-3.5 text-surface-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-800 dark:text-surface-200">
                    {src.source}
                  </p>
                  <p className="text-[10px] text-surface-400 dark:text-surface-500">
                    {src.docs.toLocaleString()} docs
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StatusDot status={src.status} />
                  <span className="text-[10px] text-surface-400 dark:text-surface-500 whitespace-nowrap">
                    {src.lastSync}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Total count */}
          <div className="px-5 py-3 bg-surface-50 dark:bg-surface-800/50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500 dark:text-surface-400">Total indexed</span>
              <span className="text-sm font-bold text-surface-800 dark:text-surface-200">
                {KNOWLEDGE_SOURCES.reduce((a, b) => a + b.docs, 0).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-brand"
                style={{ width: '73%' }}
              />
            </div>
            <p className="mt-1 text-[10px] text-surface-400">73% of quota used</p>
          </div>
        </div>
      </div>
    </div>
  );
}
