"use client";

import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useState } from 'react';

const COMMANDS = [
  { label: 'Search knowledge base', action: 'search' },
  { label: 'Go to Chat', action: 'goto_chat' },
  { label: 'Go to Voice', action: 'goto_voice' },
  { label: 'Go to Meetings', action: 'goto_meetings' },
  { label: 'Go to Knowledge Base', action: 'goto_kb' },
  { label: 'Open Settings', action: 'settings' },
];

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30"
      onClick={close}
    >
      <div
        className="mt-32 w-full max-w-md rounded-xl bg-white dark:bg-surface-900 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          className="w-full rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 mb-2"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        />
        <ul className="max-h-60 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
          {filtered.length === 0 && (
            <li className="p-3 text-surface-400 text-sm">No commands found</li>
          )}
          {filtered.map((cmd) => (
            <li
              key={cmd.action}
              className="p-3 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded"
              onClick={close}
            >
              {cmd.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
