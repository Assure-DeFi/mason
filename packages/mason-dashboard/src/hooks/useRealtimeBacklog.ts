'use client';

/**
 * useRealtimeBacklog Hook
 *
 * Subscribes to real-time changes on the mason_pm_backlog_items table.
 * Enables the dashboard to update automatically when CLI executes items.
 * Uses exponential backoff retry for resilient connections.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useRef, useEffect, useMemo } from 'react';

import { TABLES, REALTIME_CHANNELS } from '@/lib/constants';
import type { BacklogItem } from '@/types/backlog';

import {
  useRealtimeSubscription,
  type ConnectionState,
  type SubscriptionConfig,
} from './useRealtimeSubscription';

interface UseRealtimeBacklogOptions {
  /** Supabase client instance */
  client: SupabaseClient | null;
  /** Called when an existing item is updated */
  onItemUpdate?: (item: BacklogItem) => void;
  /** Called when a new item is inserted */
  onItemInsert?: (item: BacklogItem) => void;
  /** Called when an item is deleted */
  onItemDelete?: (oldItem: BacklogItem) => void;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Called when connection state changes (for UI feedback) */
  onConnectionStateChange?: (state: ConnectionState) => void;
}

interface UseRealtimeBacklogReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Number of retry attempts made */
  retryCount: number;
  /** Manually trigger a reconnection attempt */
  reconnect: () => void;
}

/**
 * Hook for subscribing to real-time backlog item changes.
 * Features exponential backoff retry for resilient connections.
 *
 * Usage:
 * ```tsx
 * const { connectionState, retryCount } = useRealtimeBacklog({
 *   client,
 *   onItemUpdate: (item) => {
 *     setItems(prev => prev.map(i => i.id === item.id ? item : i));
 *   },
 *   onItemInsert: (item) => {
 *     setItems(prev => [item, ...prev]);
 *   },
 * });
 *
 * // Optional: Show connection status
 * if (connectionState === 'retrying') {
 *   console.log(`Reconnecting... attempt ${retryCount}`);
 * }
 * ```
 */
export function useRealtimeBacklog({
  client,
  onItemUpdate,
  onItemInsert,
  onItemDelete,
  enabled = true,
  onConnectionStateChange,
}: UseRealtimeBacklogOptions): UseRealtimeBacklogReturn {
  // Use refs to avoid recreating subscriptions when callbacks change
  const onItemUpdateRef = useRef(onItemUpdate);
  const onItemInsertRef = useRef(onItemInsert);
  const onItemDeleteRef = useRef(onItemDelete);

  // Keep refs up to date
  useEffect(() => {
    onItemUpdateRef.current = onItemUpdate;
    onItemInsertRef.current = onItemInsert;
    onItemDeleteRef.current = onItemDelete;
  }, [onItemUpdate, onItemInsert, onItemDelete]);

  // Build subscription configurations
  const subscriptions = useMemo((): SubscriptionConfig[] => {
    return [
      {
        event: 'UPDATE',
        table: TABLES.PM_BACKLOG_ITEMS,
        onPayload: (payload) => {
          if (onItemUpdateRef.current) {
            onItemUpdateRef.current(payload.new as BacklogItem);
          }
        },
      },
      {
        event: 'INSERT',
        table: TABLES.PM_BACKLOG_ITEMS,
        onPayload: (payload) => {
          if (onItemInsertRef.current) {
            onItemInsertRef.current(payload.new as BacklogItem);
          }
        },
      },
      {
        event: 'DELETE',
        table: TABLES.PM_BACKLOG_ITEMS,
        onPayload: (payload) => {
          if (onItemDeleteRef.current) {
            onItemDeleteRef.current(payload.old as BacklogItem);
          }
        },
      },
    ];
  }, []);

  return useRealtimeSubscription({
    client,
    channelName: REALTIME_CHANNELS.BACKLOG_CHANGES,
    subscriptions,
    enabled,
    onConnectionStateChange,
  });
}

export default useRealtimeBacklog;
