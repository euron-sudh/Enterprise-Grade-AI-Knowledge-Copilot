'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface TypingEvent {
  user_id: string;
  is_typing: boolean;
}

function getWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
  }
  return 'ws://localhost:8000';
}
const WS_BASE = getWsBase();

/**
 * Connect to a chat conversation's presence channel.
 * Exposes: onlineUsers list, typingUsers set, sendTyping() helper.
 */
export function useChatPresence(conversationId: string | null) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (!conversationId) return;
    const token = (session as any)?.accessToken;
    if (!token) return;

    const url = `${WS_BASE}/ws/chat/${encodeURIComponent(conversationId)}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'presence') {
          setOnlineUsers(msg.online_users ?? []);
        } else if (msg.type === 'typing') {
          const { user_id, is_typing } = msg as TypingEvent;
          setTypingUsers(prev => {
            const next = new Set(prev);
            if (is_typing) next.add(user_id);
            else next.delete(user_id);
            return next;
          });
          // Clear typing indicator after 4 seconds regardless
          if (is_typing) {
            setTimeout(() => {
              setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(user_id);
                return next;
              });
            }, 4000);
          }
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setOnlineUsers([]);
      setTypingUsers(new Set());
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [conversationId, session]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  }, []);

  return { onlineUsers, typingUsers, sendTyping };
}
