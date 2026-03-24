'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from 'next-auth/react';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Home,
  MessageSquare,
  Mic,
  Settings,
  Shield,
  Video,
  Workflow,
  Zap,
} from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/voice', label: 'Voice', icon: Mic },
  { href: '/video', label: 'Video', icon: Video },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-surface-950 border-r border-surface-100 dark:border-surface-800',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-16',
          'lg:static lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-surface-100 dark:border-surface-800">
          {sidebarOpen && (
            <Link className="flex items-center gap-2 min-w-0" href="/chat">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="truncate font-bold text-surface-900 dark:text-surface-100">
                KnowledgeForge
              </span>
            </Link>
          )}
          {!sidebarOpen && (
            <Link
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand mx-auto"
              href="/chat"
            >
              <Zap className="h-4 w-4 text-white" />
            </Link>
          )}
          {sidebarOpen && (
            <button
              aria-label="Collapse sidebar"
              className="ml-auto rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
              onClick={toggleSidebar}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100',
                      !sidebarOpen && 'justify-center px-0'
                    )}
                    href={href}
                    title={!sidebarOpen ? label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin section — only visible to admin/super_admin */}
          {(session?.user as { role?: string })?.role === 'Admin' && (
          <div className={cn('mt-4 pt-3 border-t border-surface-100 dark:border-surface-800')}>
            {sidebarOpen && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                Admin
              </p>
            )}
            <ul className="space-y-1">
              {adminItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                          : 'text-surface-600 hover:bg-red-50 hover:text-red-600 dark:text-surface-400 dark:hover:bg-red-950 dark:hover:text-red-400',
                        !sidebarOpen && 'justify-center px-0'
                      )}
                      href={href}
                      title={!sidebarOpen ? label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {sidebarOpen && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-surface-100 p-3 dark:border-surface-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <Avatar
                name={session?.user?.name ?? 'User'}
                size="sm"
                src={session?.user?.image ?? undefined}
                status="online"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {session?.user?.name ?? 'User'}
                </p>
                <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                  {session?.user?.email ?? ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                aria-label="Expand sidebar"
                className="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
                onClick={toggleSidebar}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
