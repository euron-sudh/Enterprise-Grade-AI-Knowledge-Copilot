'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  Search,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  usePinConversation,
} from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';

export function ConversationList() {
  const pathname = usePathname();
  const { conversations, sidebarSearchQuery, setSidebarSearch } = useChatStore();
  const { isLoading } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const pinConversation = usePinConversation();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = conversations.filter(
    (c) =>
      !sidebarSearchQuery ||
      c.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  const pinned = filtered.filter((c) => c.isPinned);
  const regular = filtered.filter((c) => !c.isPinned);

  const handleNew = () => {
    createConversation.mutate({});
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Conversations
        </h2>
        <Button
          aria-label="New conversation"
          loading={createConversation.isPending}
          size="icon-sm"
          variant="ghost"
          onClick={handleNew}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
          <input
            className="w-full rounded-md border border-surface-200 bg-surface-50 py-1.5 pl-8 pr-3 text-xs text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            placeholder="Search conversations..."
            value={sidebarSearchQuery}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-surface-400">No conversations yet</p>
            <Button className="mt-3" size="sm" onClick={handleNew}>
              Start a chat
            </Button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <Section label="Pinned">
                {pinned.map((c) => (
                  <ConversationItem
                    key={c.id}
                    isActive={pathname === `/chat/${c.id}`}
                    menuOpenId={menuOpenId}
                    title={c.title}
                    conversationId={c.id}
                    isPinned={c.isPinned}
                    lastMessage={c.lastMessage}
                    lastMessageAt={c.lastMessageAt}
                    onDelete={() => deleteConversation.mutate(c.id)}
                    onMenuClose={() => setMenuOpenId(null)}
                    onMenuOpen={() => setMenuOpenId(c.id)}
                    onPin={() => pinConversation.mutate({ id: c.id, pinned: !c.isPinned })}
                  />
                ))}
              </Section>
            )}
            {regular.length > 0 && (
              <Section label={pinned.length > 0 ? 'Recent' : undefined}>
                {regular.map((c) => (
                  <ConversationItem
                    key={c.id}
                    isActive={pathname === `/chat/${c.id}`}
                    menuOpenId={menuOpenId}
                    title={c.title}
                    conversationId={c.id}
                    isPinned={c.isPinned}
                    lastMessage={c.lastMessage}
                    lastMessageAt={c.lastMessageAt}
                    onDelete={() => deleteConversation.mutate(c.id)}
                    onMenuClose={() => setMenuOpenId(null)}
                    onMenuOpen={() => setMenuOpenId(c.id)}
                    onPin={() => pinConversation.mutate({ id: c.id, pinned: !c.isPinned })}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      {label && (
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

interface ConversationItemProps {
  conversationId: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isPinned: boolean;
  isActive: boolean;
  menuOpenId: string | null;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
  onPin: () => void;
}

function ConversationItem({
  conversationId,
  title,
  lastMessage,
  lastMessageAt,
  isActive,
  menuOpenId,
  onMenuOpen,
  onMenuClose,
  onDelete,
  onPin,
}: ConversationItemProps) {
  const isMenuOpen = menuOpenId === conversationId;

  return (
    <div className="group relative">
      <Link
        className={cn(
          'flex flex-col rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-brand-50 dark:bg-brand-950'
            : 'hover:bg-surface-50 dark:hover:bg-surface-800'
        )}
        href={`/chat/${conversationId}`}
      >
        <span
          className={cn(
            'truncate font-medium',
            isActive
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-surface-800 dark:text-surface-200'
          )}
        >
          {title}
        </span>
        {lastMessage && (
          <span className="mt-0.5 truncate text-xs text-surface-400">{lastMessage}</span>
        )}
        {lastMessageAt && (
          <span className="mt-0.5 text-xs text-surface-300 dark:text-surface-500">
            {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
          </span>
        )}
      </Link>

      {/* Menu trigger */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="rounded p-0.5 text-surface-400 hover:bg-surface-200 hover:text-surface-600 dark:hover:bg-surface-700"
          onClick={(e) => {
            e.preventDefault();
            isMenuOpen ? onMenuClose() : onMenuOpen();
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onMenuClose} />
            <div className="absolute right-0 top-6 z-20 w-36 rounded-lg border border-surface-100 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-900">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                onClick={() => {
                  onPin();
                  onMenuClose();
                }}
              >
                <Pin className="h-3 w-3" />
                Pin
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => {
                  onDelete();
                  onMenuClose();
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
