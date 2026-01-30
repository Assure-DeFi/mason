'use client';

/**
 * useRealtimeBacklog Hook
 *
 * Subscribes to real-time changes on the mason_pm_backlog_items table.
 * Enables the dashboard to update automatically when CLI executes items.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { TABLES, REALTIME_CHANNELS } from '@/lib/constants';
import type { BacklogItem } from '@/types/backlog';

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
}

/**
 * Hook for subscribing to real-time backlog item changes.
 *
 * Usage:
 * ```tsx
 * useRealtimeBacklog({
 *   client,
 *   onItemUpdate: (item) => {
 *     setItems(prev => prev.map(i => i.id === item.id ? item : i));
 *   },
 *   onItemInsert: (item) => {
 *     setItems(prev => [item, ...prev]);
 *   },
 * });
 * ```
 */
export function useRealtimeBacklog({
  client,
  onItemUpdate,
  onItemInsert,
  onItemDelete,
  enabled = true,
}: UseRealtimeBacklogOptions): void {
  // Use refs to avoid recreating subscription when callbacks change
  const onItemUpdateRef = useRef(onItemUpdate);
  const onItemInsertRef = useRef(onItemInsert);
  const onItemDeleteRef = useRef(onItemDelete);

  // Keep refs up to date
  useEffect(() => {
    onItemUpdateRef.current = onItemUpdate;
    onItemInsertRef.current = onItemInsert;
    onItemDeleteRef.current = onItemDelete;
  }, [onItemUpdate, onItemInsert, onItemDelete]);

  useEffect(() => {
    if (!client || !enabled) {
      return;
    }

    const channel = client
      .channel(REALTIME_CHANNELS.BACKLOG_CHANGES)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.PM_BACKLOG_ITEMS,
        },
        (payload) => {
          if (onItemUpdateRef.current) {
            onItemUpdateRef.current(payload.new as BacklogItem);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.PM_BACKLOG_ITEMS,
        },
        (payload) => {
          if (onItemInsertRef.current) {
            onItemInsertRef.current(payload.new as BacklogItem);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: TABLES.PM_BACKLOG_ITEMS,
        },
        (payload) => {
          if (onItemDeleteRef.current) {
            onItemDeleteRef.current(payload.old as BacklogItem);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to backlog changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Failed to subscribe to backlog changes');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from backlog changes');
      void client.removeChannel(channel);
    };
  }, [client, enabled]);
}

export default useRealtimeBacklog;
