'use client';

import { useState } from 'react';

import { useSession, signOut } from 'next-auth/react';
import { Bell, Command, LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

export function Header() {
  const { data: session } = useSession();
  const { toggleSidebar, theme, setTheme, unreadNotificationCount } = useUIStore();
  const { open: openCommandPalette } = useCommandPalette();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-100 bg-white/80 px-4 backdrop-blur-sm dark:border-surface-800 dark:bg-surface-950/80">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button
          aria-label="Toggle sidebar"
          size="icon-sm"
          variant="ghost"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Command palette trigger */}
        <button
          className={cn(
            'hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-surface-500',
            'border border-surface-200 bg-surface-50 hover:bg-surface-100',
            'dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-400 dark:hover:bg-surface-700',
            'transition-colors duration-200 cursor-pointer'
          )}
          onClick={openCommandPalette}
        >
          <Command className="h-3.5 w-3.5" />
          <span>Quick search...</span>
          <kbd className="ml-2 rounded bg-surface-200 px-1.5 py-0.5 text-xs font-medium dark:bg-surface-700">
            K
          </kbd>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button aria-label="Toggle theme" size="icon-sm" variant="ghost" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button aria-label="Notifications" size="icon-sm" variant="ghost">
            <Bell className="h-4 w-4" />
          </Button>
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            aria-expanded={userMenuOpen}
            aria-label="User menu"
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <Avatar
              name={session?.user?.name ?? 'User'}
              size="sm"
              src={session?.user?.image ?? undefined}
              status="online"
            />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-surface-100 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-900">
                <div className="border-b border-surface-100 p-3 dark:border-surface-800">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {session?.user?.email}
                  </p>
                  <Badge className="mt-2" size="sm" variant="primary">
                    Pro Plan
                  </Badge>
                </div>
                <div className="p-1">
                  <a
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                    href="/settings"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </a>
                  <a
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                    href="/settings"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </a>
                </div>
                <div className="border-t border-surface-100 p-1 dark:border-surface-800">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
