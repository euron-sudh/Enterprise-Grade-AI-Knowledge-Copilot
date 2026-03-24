'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { cn, getInitials } from '@/lib/utils';
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Keyboard,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const initial = stored ?? preferred;
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return { theme, toggle };
}

export function Topbar() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = session?.user;

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const avatarUrl = user?.image;
  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';

  return (
    <header className="flex h-[60px] items-center justify-between border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 gap-4">
      {/* Search trigger */}
      <button
        className="flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-1.5 text-sm text-surface-400 dark:text-surface-500 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
        onClick={() => {
          // TODO: open command palette
        }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">Search knowledge base...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-1.5 py-0.5 text-[10px] font-mono text-surface-400">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Keyboard shortcuts */}
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100 transition-all duration-150"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {/* Unread badge */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-surface-900" />
        </Link>

        {/* User menu */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="relative h-7 w-7 flex-shrink-0 rounded-full overflow-hidden bg-gradient-brand">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">
                  {getInitials(userName)}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300 leading-tight">
                {userName}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-3 w-3 text-surface-400 transition-transform duration-150',
                menuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-lg overflow-hidden z-50 animate-fade-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {userName}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                  {userEmail}
                </p>
              </div>

              {/* Menu items */}
              <div className="p-1">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <User className="h-4 w-4 text-surface-400" />
                  Profile & Settings
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <Settings className="h-4 w-4 text-surface-400" />
                  Admin Console
                </Link>
                <Link
                  href="#"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 text-surface-400" />
                  Help & Support
                </Link>
              </div>

              <div className="border-t border-surface-100 dark:border-surface-700 p-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut({ callbackUrl: '/login' });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
