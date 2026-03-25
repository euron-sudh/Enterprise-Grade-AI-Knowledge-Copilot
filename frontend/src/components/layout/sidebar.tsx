'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Video,
  BookOpen,
  Search,
  Workflow,
  Bot,
  BarChart3,
  Bell,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'new' | 'beta';
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/home', icon: LayoutDashboard },
      { label: 'Chat', href: '/chat', icon: MessageSquare, badge: '' },
      { label: 'Voice', href: '/voice', icon: Mic, badgeVariant: 'beta', badge: 'Beta' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
      { label: 'Search', href: '/search', icon: Search },
      { label: 'Video Library', href: '/video', icon: Video },
    ],
  },
  {
    label: 'Meetings',
    items: [
      { label: 'Meetings', href: '/meetings', icon: Video },
    ],
  },
  {
    label: 'Automation',
    items: [
      { label: 'AI Agents', href: '/agents', icon: Bot, badge: 'New', badgeVariant: 'new' },
      { label: 'Workflows', href: '/workflows', icon: Workflow },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Teams', href: '/teams', icon: Users },
      { label: 'Profile', href: '/profile', icon: Settings },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive =
    item.href === '/home'
      ? pathname === '/home'
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'nav-link',
        isActive && 'active',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isActive
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-surface-500 dark:text-surface-400'
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                'badge text-[10px] px-1.5 py-0.5 font-semibold',
                item.badgeVariant === 'new'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : item.badgeVariant === 'beta'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 transition-all duration-300',
        collapsed ? 'w-14' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-[60px] items-center border-b border-surface-200 dark:border-surface-800 px-4',
          collapsed && 'justify-center px-2'
        )}
      >
        <Link
          href="/home"
          className="flex items-center gap-2.5 min-w-0"
        >
          {/* Logo mark */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-brand">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                KnowledgeForge
              </p>
              <p className="truncate text-[10px] text-surface-400 dark:text-surface-500">
                AI Copilot
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-3')}>
            {!collapsed && group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
                {group.label}
              </p>
            )}
            {collapsed && group.label && gi > 0 && (
              <div className="my-2 mx-2 border-t border-surface-100 dark:border-surface-800" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin link */}
      <div className={cn('border-t border-surface-200 dark:border-surface-800 p-2')}>
        <Link
          href="/admin"
          className={cn('nav-link', collapsed && 'justify-center px-2')}
          title={collapsed ? 'Admin' : undefined}
        >
          <Shield className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />
          {!collapsed && <span className="flex-1 truncate">Admin</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 shadow-sm transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}

