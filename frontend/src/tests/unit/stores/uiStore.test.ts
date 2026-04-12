import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import type { Notification } from '@/types';

const mockNotification: Notification = {
  id: 'notif-1',
  type: 'info',
  title: 'Document processed',
  message: 'Your file has been indexed successfully.',
  read: false,
  createdAt: new Date().toISOString(),
};

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      commandPaletteOpen: false,
      theme: 'system',
      notifications: [],
      unreadNotificationCount: 0,
    });
  });

  describe('sidebar', () => {
    it('sets sidebar open', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggles sidebar', () => {
      useUIStore.getState().setSidebarOpen(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('command palette', () => {
    it('opens command palette', () => {
      useUIStore.getState().setCommandPaletteOpen(true);
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    });

    it('toggles command palette', () => {
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe('theme', () => {
    it('sets theme to dark', () => {
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('sets theme to light', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('sets theme to system', () => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setTheme('system');
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('notifications', () => {
    it('adds a notification and increments unread count', () => {
      useUIStore.getState().addNotification(mockNotification);
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().unreadNotificationCount).toBe(1);
    });

    it('adds multiple notifications', () => {
      const notif2: Notification = { ...mockNotification, id: 'notif-2', title: 'Second' };
      useUIStore.getState().addNotification(mockNotification);
      useUIStore.getState().addNotification(notif2);
      expect(useUIStore.getState().notifications).toHaveLength(2);
      expect(useUIStore.getState().unreadNotificationCount).toBe(2);
    });

    it('marks a notification as read', () => {
      useUIStore.getState().addNotification(mockNotification);
      useUIStore.getState().markNotificationRead('notif-1');
      const notif = useUIStore.getState().notifications[0];
      expect(notif?.read).toBe(true);
      expect(useUIStore.getState().unreadNotificationCount).toBe(0);
    });

    it('marks all notifications as read', () => {
      const notif2: Notification = { ...mockNotification, id: 'notif-2' };
      useUIStore.getState().addNotification(mockNotification);
      useUIStore.getState().addNotification(notif2);
      useUIStore.getState().markAllNotificationsRead();
      const state = useUIStore.getState();
      expect(state.unreadNotificationCount).toBe(0);
      expect(state.notifications.every((n) => n.read)).toBe(true);
    });

    it('removes a notification', () => {
      useUIStore.getState().addNotification(mockNotification);
      useUIStore.getState().removeNotification('notif-1');
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('clears all notifications', () => {
      useUIStore.getState().addNotification(mockNotification);
      useUIStore.getState().addNotification({ ...mockNotification, id: 'notif-2' });
      useUIStore.getState().clearNotifications();
      expect(useUIStore.getState().notifications).toHaveLength(0);
      expect(useUIStore.getState().unreadNotificationCount).toBe(0);
    });
  });
});
