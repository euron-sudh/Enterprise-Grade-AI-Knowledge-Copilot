'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  BarChart3,
  BookOpen,
  Bot,
  MessageSquare,
  Mic,
  Search,
  Settings,
  Video,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { conversations } = useChatStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (href: string) => {
    router.push(href);
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const staticCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-chat',
        label: 'Go to Chat',
        icon: <MessageSquare className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/chat'),
        keywords: ['chat', 'message', 'conversation'],
      },
      {
        id: 'nav-voice',
        label: 'Go to Voice Assistant',
        icon: <Mic className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/voice'),
        keywords: ['voice', 'audio', 'speech'],
      },
      {
        id: 'nav-meetings',
        label: 'Go to Meetings',
        icon: <Video className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/meetings'),
        keywords: ['meetings', 'video', 'call'],
      },
      {
        id: 'nav-knowledge',
        label: 'Go to Knowledge Base',
        icon: <BookOpen className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/knowledge'),
        keywords: ['knowledge', 'documents', 'files'],
      },
      {
        id: 'nav-search',
        label: 'Search',
        icon: <Search className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/search'),
        keywords: ['search', 'find', 'query'],
      },
      {
        id: 'nav-agents',
        label: 'AI Agents',
        icon: <Bot className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/agents'),
        keywords: ['agents', 'ai', 'automation'],
      },
      {
        id: 'nav-analytics',
        label: 'Analytics',
        icon: <BarChart3 className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/analytics'),
        keywords: ['analytics', 'metrics', 'reports'],
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        icon: <Settings className="h-4 w-4" />,
        category: 'Navigation',
        action: () => navigate('/settings'),
        keywords: ['settings', 'preferences', 'account'],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const recentConversationCommands: CommandItem[] = useMemo(
    () =>
      conversations.slice(0, 5).map((c) => ({
        id: `conv-${c.id}`,
        label: c.title,
        description: c.lastMessage,
        icon: <MessageSquare className="h-4 w-4" />,
        category: 'Recent Conversations',
        action: () => navigate(`/chat/${c.id}`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations]
  );

  const allCommands = [...staticCommands, ...recentConversationCommands];

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q))
    );
  }, [query, allCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[selectedIndex]?.action();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [commandPaletteOpen, filtered, selectedIndex]);

  if (!commandPaletteOpen) return null;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category]!.push(cmd);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="relative w-full max-w-xl animate-slide-down rounded-xl border border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-900">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-surface-100 px-4 dark:border-surface-800">
          <Search className="h-4 w-4 shrink-0 text-surface-400" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-4 text-sm text-surface-900 placeholder-surface-400 focus:outline-none dark:text-surface-100"
            placeholder="Search commands, conversations, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="shrink-0 rounded-md p-1 text-surface-400 hover:text-surface-600"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-surface-400">No results found</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-surface-400">
                  {category}
                </p>
                {items.map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                        selectedIndex === globalIdx
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                          : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800'
                      )}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <span className="shrink-0 text-surface-400">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-xs text-surface-400">{item.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-surface-100 px-4 py-2 text-xs text-surface-400 dark:border-surface-800">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface-100 px-1 py-0.5 dark:bg-surface-800">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface-100 px-1 py-0.5 dark:bg-surface-800">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-surface-100 px-1 py-0.5 dark:bg-surface-800">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
