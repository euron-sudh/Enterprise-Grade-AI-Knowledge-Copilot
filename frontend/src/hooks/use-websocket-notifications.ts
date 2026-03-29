'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface WsNotification {
  id: string;
  type: 'notification';
  notification_type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body: string;
  timestamp: string;
  data: Record<string, unknown>;
}

type NotificationHandler = (notification: WsNotification) => void;

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

/**
 * Connect to the backend real-time notification stream.
 * Automatically reconnects on disconnect. Sends ping/pong to keep alive.
 */
export function useWebSocketNotifications(onNotification: NotificationHandler) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef<NotificationHandler>(onNotification);
  handlerRef.current = onNotification;

  const connect = useCallback(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    const url = `${WS_BASE}/ws/notifications?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'notification') {
          handlerRef.current(msg as WsNotification);
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [session]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  return { sendPing };
}
