'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useCallback, useState } from 'react';

import { TABLES } from '@/lib/constants';

interface ExecutionProgress {
  id: string;
  item_id: string;
  run_id: string | null;
  current_phase: string;
  started_at: string;
}

interface UseExecutionListenerOptions {
  client: SupabaseClient | null;
  enabled?: boolean;
  onExecutionStart?: (progress: ExecutionProgress) => void;
}

// Polling intervals in milliseconds
// When realtime is connected, we don't poll at all
// When realtime is disconnected, we use the base interval with exponential backoff on errors
const FALLBACK_POLLING_INTERVAL_MS = 10000; // 10 seconds when realtime fails
const MAX_POLLING_INTERVAL_MS = 30000; // Cap backoff at 30 seconds
// How far back to look on initial mount (in milliseconds)
const INITIAL_LOOKBACK_MS = 30000;
// Columns needed for ExecutionProgress (avoids fetching unnecessary data)
const REQUIRED_COLUMNS = 'id,item_id,run_id,current_phase,started_at';

/**
 * Global execution listener hook with adaptive polling.
 *
 * EFFICIENT DESIGN: Uses realtime as primary, with adaptive fallback polling.
 * - Realtime: Primary path for instant detection
 * - Polling: Only activates when realtime is disconnected
 * - Tab visibility: Pauses polling when tab is hidden
 *
 * Subscribes to mason_execution_progress table for new executions.
 * When a new execution starts (INSERT), triggers the callback.
 * Works across ALL repos - not filtered by selected repository.
 */
export function useExecutionListener({
  client,
  enabled = true,
  onExecutionStart,
}: UseExecutionListenerOptions) {
  const callbackRef = useRef(onExecutionStart);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastCheckTimeRef = useRef<string>(
    new Date(Date.now() - INITIAL_LOOKBACK_MS).toISOString(),
  );
  // Track realtime connection state reactively
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onExecutionStart;
  }, [onExecutionStart]);

  // Track tab visibility to pause polling when hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Helper to process a detected execution (shared by realtime and polling)
  const processExecution = useCallback(
    (progress: ExecutionProgress, source: 'realtime' | 'polling') => {
      // Deduplicate - only process each execution once
      if (seenIdsRef.current.has(progress.id)) {
        return;
      }

      // Only trigger on fresh executions (site_review phase)
      if (progress.current_phase !== 'site_review') {
        // eslint-disable-next-line no-console
        console.log(
          `[ExecutionListener] Skipping ${source} execution (phase: ${progress.current_phase}):`,
          progress.item_id,
        );
        return;
      }

      // Mark as seen and trigger callback
      seenIdsRef.current.add(progress.id);
      // eslint-disable-next-line no-console
      console.log(
        `[ExecutionListener] ✓ Detected via ${source.toUpperCase()} - item:`,
        progress.item_id,
        'run_id:',
        progress.run_id,
      );
      callbackRef.current?.(progress);
    },
    [],
  );

  // REALTIME: Subscribe to new execution progress records
  useEffect(() => {
    if (!client || !enabled) {
      // eslint-disable-next-line no-console
      console.log(
        '[ExecutionListener] Realtime disabled (client:',
        !!client,
        'enabled:',
        enabled,
        ')',
      );
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[ExecutionListener] Setting up realtime subscription...');

    const channel = client
      .channel('global-execution-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.EXECUTION_PROGRESS,
        },
        (payload) => {
          // eslint-disable-next-line no-console
          console.log(
            '[ExecutionListener] Realtime event received:',
            payload.eventType,
          );
          const progress = payload.new as ExecutionProgress;
          processExecution(progress, 'realtime');
        },
      )
      .subscribe((status) => {
        // eslint-disable-next-line no-console
        console.log(
          '[ExecutionListener] Realtime subscription status:',
          status,
        );

        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          // eslint-disable-next-line no-console
          console.log(
            '[ExecutionListener] ✓ Realtime CONNECTED - polling paused',
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false);
          // eslint-disable-next-line no-console
          console.warn(
            '[ExecutionListener] ⚠ Realtime FAILED - activating fallback polling',
          );
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
        }
      });

    return () => {
      // eslint-disable-next-line no-console
      console.log('[ExecutionListener] Cleaning up realtime subscription');
      setRealtimeConnected(false);
      void client.removeChannel(channel);
    };
  }, [client, enabled, processExecution]);

  // ADAPTIVE POLLING: Only runs when realtime is disconnected AND tab is visible
  useEffect(() => {
    // Don't poll if client not ready, not enabled, realtime is working, or tab is hidden
    if (!client || !enabled || realtimeConnected || !tabVisible) {
      return;
    }

    let currentInterval = FALLBACK_POLLING_INTERVAL_MS;
    let consecutiveErrors = 0;
    let intervalId: NodeJS.Timeout | null = null;

    // eslint-disable-next-line no-console
    console.log(
      '[ExecutionListener] Starting adaptive polling (every',
      currentInterval / 1000,
      'seconds) - realtime disconnected',
    );

    const poll = async () => {
      try {
        // Select only required columns to minimize data transfer
        const { data, error } = await client
          .from(TABLES.EXECUTION_PROGRESS)
          .select(REQUIRED_COLUMNS)
          .eq('current_phase', 'site_review')
          .is('completed_at', null)
          .gt('started_at', lastCheckTimeRef.current)
          .order('started_at', { ascending: false })
          .limit(5);

        if (error) {
          // Check for schema errors and log more helpful message
          if (
            error.message?.includes('column') ||
            error.message?.includes('does not exist')
          ) {
            // eslint-disable-next-line no-console
            console.error(
              '[ExecutionListener] Schema issue detected. User should update database schema in Settings.',
            );
          } else {
            // eslint-disable-next-line no-console
            console.error('[ExecutionListener] Polling error:', error.message);
          }
          // Backoff on error
          consecutiveErrors++;
          const newInterval = Math.min(
            FALLBACK_POLLING_INTERVAL_MS * Math.pow(2, consecutiveErrors),
            MAX_POLLING_INTERVAL_MS,
          );
          if (newInterval !== currentInterval) {
            currentInterval = newInterval;
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = setInterval(() => void poll(), currentInterval);
            }
          }
          return;
        }

        // Reset backoff on success
        if (consecutiveErrors > 0) {
          consecutiveErrors = 0;
          currentInterval = FALLBACK_POLLING_INTERVAL_MS;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(() => void poll(), currentInterval);
          }
        }

        if (data && data.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            '[ExecutionListener] Polling found',
            data.length,
            'candidate(s)',
          );
          for (const record of data) {
            // Map to ExecutionProgress interface, handling potentially missing run_id
            const progress: ExecutionProgress = {
              id: record.id,
              item_id: record.item_id,
              run_id: record.run_id ?? null,
              current_phase: record.current_phase,
              started_at: record.started_at,
            };
            processExecution(progress, 'polling');
          }
        }

        // Update last check time for next poll
        lastCheckTimeRef.current = new Date().toISOString();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ExecutionListener] Polling exception:', err);
        // Backoff on exception
        consecutiveErrors++;
        const newInterval = Math.min(
          FALLBACK_POLLING_INTERVAL_MS * Math.pow(2, consecutiveErrors),
          MAX_POLLING_INTERVAL_MS,
        );
        if (newInterval !== currentInterval) {
          currentInterval = newInterval;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(() => void poll(), currentInterval);
          }
        }
      }
    };

    // Poll immediately on mount to catch any executions that started before we were ready
    void poll();

    // Then poll at the current interval
    intervalId = setInterval(() => {
      void poll();
    }, currentInterval);

    return () => {
      // eslint-disable-next-line no-console
      console.log('[ExecutionListener] Stopping adaptive polling');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [client, enabled, realtimeConnected, tabVisible, processExecution]);
}

/**
 * Helper to fetch item details for an execution.
 */
export async function fetchItemForExecution(
  client: SupabaseClient,
  itemId: string,
): Promise<{ id: string; title: string } | null> {
  const { data, error } = await client
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('id, title')
    .eq('id', itemId)
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error(
      '[ExecutionListener] Failed to fetch item for execution:',
      itemId,
      error,
    );
    return null;
  }

  return data;
}
