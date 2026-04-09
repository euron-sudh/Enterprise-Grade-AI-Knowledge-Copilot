'use client';

import { useCallback, useEffect } from 'react';
import { useWebSocketNotifications, WsNotification } from '@/hooks/use-websocket-notifications';

/**
 * Client component that connects to the backend real-time notification
 * WebSocket and shows a browser toast for each incoming event.
 * Mount this once inside the dashboard layout.
 */
export function NotificationProvider() {
  const handleNotification = useCallback((notification: WsNotification) => {
    // Dispatch a custom DOM event so any component can listen
    window.dispatchEvent(
      new CustomEvent('kf:notification', { detail: notification })
    );

    // Native browser notification (if permission granted)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(notification.title, { body: notification.body });
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.info('[WS notification]', notification.notification_type, notification.title);
    }
  }, []);

  useWebSocketNotifications(handleNotification);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {/* ignore */});
    }
  }, []);

  return null; // purely side-effectful
}
