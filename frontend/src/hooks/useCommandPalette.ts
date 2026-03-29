'use client';

import { useEffect } from 'react';

import { useUIStore } from '@/stores/uiStore';

export function useCommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }

      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette]);

  return {
    isOpen: commandPaletteOpen,
    open: () => setCommandPaletteOpen(true),
    close: () => setCommandPaletteOpen(false),
    toggle: toggleCommandPalette,
  };
}
