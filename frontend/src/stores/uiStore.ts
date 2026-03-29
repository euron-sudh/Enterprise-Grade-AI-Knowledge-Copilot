import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type { Notification } from '@/types';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  theme: Theme;
  notifications: Notification[];
  unreadNotificationCount: number;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: Theme) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        commandPaletteOpen: false,
        theme: 'system',
        notifications: [],
        unreadNotificationCount: 0,

        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        toggleCommandPalette: () =>
          set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

        setTheme: (theme) => {
          set({ theme });
          if (typeof window !== 'undefined') {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            if (theme === 'system') {
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              root.classList.add(prefersDark ? 'dark' : 'light');
            } else {
              root.classList.add(theme);
            }
          }
        },

        addNotification: (notification) =>
          set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50),
            unreadNotificationCount: state.unreadNotificationCount + (notification.read ? 0 : 1),
          })),

        markNotificationRead: (id) =>
          set((state) => {
            const notif = state.notifications.find((n) => n.id === id);
            const wasUnread = notif && !notif.read;
            return {
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadNotificationCount: wasUnread
                ? Math.max(0, state.unreadNotificationCount - 1)
                : state.unreadNotificationCount,
            };
          }),

        markAllNotificationsRead: () =>
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadNotificationCount: 0,
          })),

        removeNotification: (id) =>
          set((state) => {
            const notif = state.notifications.find((n) => n.id === id);
            const wasUnread = notif && !notif.read;
            return {
              notifications: state.notifications.filter((n) => n.id !== id),
              unreadNotificationCount: wasUnread
                ? Math.max(0, state.unreadNotificationCount - 1)
                : state.unreadNotificationCount,
            };
          }),

        clearNotifications: () =>
          set({ notifications: [], unreadNotificationCount: 0 }),
      }),
      {
        name: 'kf-ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    )
  )
);
