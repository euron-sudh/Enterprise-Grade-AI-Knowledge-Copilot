'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { io, type Socket } from 'socket.io-client';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  url?: string;
  namespace?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  auth?: Record<string, unknown>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:8000',
    namespace = '/',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
    auth,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const listenersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const socket = io(`${url}${namespace}`, {
      auth: { ...(auth ?? {}), token },
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    // Re-register listeners
    listenersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });
  }, [url, namespace, auth, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn(`WebSocket not connected. Cannot emit: ${event}`);
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);
    socketRef.current?.on(event, handler);

    return () => {
      listenersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      listenersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    } else {
      listenersRef.current.delete(event);
      socketRef.current?.off(event);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, connect, disconnect, emit, on, off, socket: socketRef.current };
}
