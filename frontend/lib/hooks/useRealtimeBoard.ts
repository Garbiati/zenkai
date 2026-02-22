'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Task } from '@/lib/types';

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const hostname = window.location.hostname;
  if (hostname.endsWith('.trycloudflare.com')) {
    return process.env.NEXT_PUBLIC_WS_URL || 'https://cannon-mtv-fragrances-til.trycloudflare.com';
  }
  return `http://${hostname}:3001`;
}

interface UseRealtimeBoardOptions {
  memberId: string | null;
  orgId?: string | null;
  onTaskCreated: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (payload: { taskId: string }) => void;
}

/**
 * Manages a WebSocket connection for real-time board updates.
 * Replaces 30s polling for task state changes.
 *
 * Presence: WebSocket connect = online, disconnect = offline.
 * member:presence events from the server update the onlineMembers set.
 * The existing heartbeat endpoint is still used for workedHoursToday metrics.
 *
 * @see ADR 0005 — WebSockets for real-time (Phase 1 implementation)
 */
export function useRealtimeBoard({
  memberId,
  orgId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}: UseRealtimeBoardOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!memberId) return;

    const socket = io(getWsUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join org room for scoped updates (Phase 2: pass real orgId when available)
      socket.emit('join', { orgId: orgId || 'default', memberId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      // Clear presence on disconnect — server will re-broadcast on reconnect
      setOnlineMembers(new Set());
    });

    socket.on('task:created', (task: Task) => {
      onTaskCreated(task);
    });

    socket.on('task:updated', (task: Task) => {
      onTaskUpdated(task);
    });

    socket.on('task:deleted', (payload: { taskId: string }) => {
      onTaskDeleted(payload);
    });

    socket.on('member:presence', (payload: { memberId: string; online: boolean }) => {
      setOnlineMembers((prev) => {
        const next = new Set(prev);
        if (payload.online) {
          next.add(payload.memberId);
        } else {
          next.delete(payload.memberId);
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return { isConnected, onlineMembers };
}
