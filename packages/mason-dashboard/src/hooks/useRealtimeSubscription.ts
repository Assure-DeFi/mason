'use client';

/**
 * useRealtimeSubscription Hook
 *
 * Provides resilient real-time subscriptions with exponential backoff retry.
 * When a subscription fails, it will automatically retry with increasing delays:
 * 1s -> 2s -> 4s -> 8s -> 16s -> 30s (capped)
 *
 * After MAX_RETRIES (10) failed attempts, gives up and exposes connection state
 * for UI feedback.
 */

import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { useEffect, useRef, useState, useCallback } from 'react';

/** Connection state for UI feedback */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'retrying'
  | 'failed';

/** Configuration for a postgres_changes subscription */
export interface SubscriptionConfig {
  /** Event type to listen for */
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Database schema (usually 'public') */
  schema?: string;
  /** Table name to watch */
  table: string;
  /** Optional filter expression (e.g., "id=eq.123") */
  filter?: string;
  /** Callback when event fires */
  onPayload: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
}

export interface UseRealtimeSubscriptionOptions {
  /** Supabase client instance */
  client: SupabaseClient | null;
  /** Unique channel name */
  channelName: string;
  /** Subscription configurations */
  subscriptions: SubscriptionConfig[];
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
  /** Called when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** Maximum retry attempts before giving up (default: 10) */
  maxRetries?: number;
  /** Maximum delay between retries in ms (default: 30000) */
  maxRetryDelay?: number;
}

interface UseRealtimeSubscriptionReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Number of retry attempts made */
  retryCount: number;
  /** Manually trigger a reconnection attempt */
  reconnect: () => void;
}

/**
 * Hook for resilient real-time subscriptions with exponential backoff retry.
 *
 * Usage:
 * ```tsx
 * const { connectionState, retryCount, reconnect } = useRealtimeSubscription({
 *   client,
 *   channelName: 'my-channel',
 *   subscriptions: [
 *     {
 *       event: 'INSERT',
 *       table: 'my_table',
 *       onPayload: (payload) => console.log('New item:', payload.new),
 *     },
 *   ],
 * });
 *
 * // Show connection status in UI
 * if (connectionState === 'retrying') {
 *   return <Banner>Reconnecting... (attempt {retryCount})</Banner>;
 * }
 * ```
 */
export function useRealtimeSubscription({
  client,
  channelName,
  subscriptions,
  enabled = true,
  onConnectionStateChange,
  maxRetries = 10,
  maxRetryDelay = 30000,
}: UseRealtimeSubscriptionOptions): UseRealtimeSubscriptionReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  // Refs to track state across effect runs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Keep subscription callbacks stable via refs
  const subscriptionsRef = useRef(subscriptions);
  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  useEffect(() => {
    onConnectionStateChangeRef.current = onConnectionStateChange;
  }, [onConnectionStateChange]);

  // Helper to update connection state
  const updateConnectionState = useCallback((state: ConnectionState) => {
    if (!mountedRef.current) {
      return;
    }
    setConnectionState(state);
    onConnectionStateChangeRef.current?.(state);
  }, []);

  // Calculate delay with exponential backoff
  const getRetryDelay = useCallback(
    (attempt: number): number => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
      const baseDelay = 1000;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxRetryDelay);
      return delay;
    },
    [maxRetryDelay],
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (channelRef.current && client) {
      void client.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [client]);

  // Subscribe function
  const subscribe = useCallback(
    (attemptNumber: number = 0) => {
      if (!client || !mountedRef.current) {
        return;
      }

      // Clean up existing channel first
      if (channelRef.current) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      updateConnectionState(attemptNumber === 0 ? 'connecting' : 'retrying');
      setRetryCount(attemptNumber);

      // Create new channel
      let channel = client.channel(channelName);

      // Add all subscription configurations
      for (const sub of subscriptionsRef.current) {
        channel = channel.on(
          'postgres_changes',
          {
            event: sub.event,
            schema: sub.schema ?? 'public',
            table: sub.table,
            filter: sub.filter,
          },
          sub.onPayload,
        );
      }

      // Subscribe with status handling
      channel.subscribe((status, error) => {
        if (!mountedRef.current) {
          return;
        }

        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${channelName}`);
          updateConnectionState('connected');
          setRetryCount(0);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.error(
            `[Realtime] ${channelName} error: ${status}`,
            error ?? '',
          );

          // Check if we should retry
          if (attemptNumber < maxRetries) {
            const delay = getRetryDelay(attemptNumber);
            console.log(
              `[Realtime] Retrying ${channelName} in ${delay}ms (attempt ${attemptNumber + 1}/${maxRetries})`,
            );
            updateConnectionState('retrying');

            retryTimeoutRef.current = setTimeout(() => {
              subscribe(attemptNumber + 1);
            }, delay);
          } else {
            console.error(
              `[Realtime] ${channelName} failed after ${maxRetries} attempts, giving up`,
            );
            updateConnectionState('failed');
          }
        }
      });

      channelRef.current = channel;
    },
    [client, channelName, updateConnectionState, maxRetries, getRetryDelay],
  );

  // Manual reconnect function
  const reconnect = useCallback(() => {
    cleanup();
    subscribe(0);
  }, [cleanup, subscribe]);

  // Main effect to manage subscription lifecycle
  useEffect(() => {
    mountedRef.current = true;

    if (!client || !enabled) {
      cleanup();
      updateConnectionState('disconnected');
      return;
    }

    subscribe(0);

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [client, enabled, channelName, subscribe, cleanup, updateConnectionState]);

  return {
    connectionState,
    retryCount,
    reconnect,
  };
}

export default useRealtimeSubscription;
