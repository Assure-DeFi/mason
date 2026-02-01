'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useCallback } from 'react';

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

// Polling interval in milliseconds
const BASE_POLLING_INTERVAL_MS = 3000;
const MAX_POLLING_INTERVAL_MS = 15000;
// How far back to look on initial mount (in milliseconds)
const INITIAL_LOOKBACK_MS = 30000;

/**
 * Global execution listener hook.
 *
 * BULLETPROOF DESIGN: Uses both realtime AND polling for reliability.
 * - Realtime: Fast path for instant detection (when it works)
 * - Polling: Guaranteed fallback every 3 seconds (always works)
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
  const realtimeConnectedRef = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onExecutionStart;
  }, [onExecutionStart]);

  // Helper to process a detected execution (shared by realtime and polling)
  const processExecution = useCallback(
    (progress: ExecutionProgress, source: 'realtime' | 'polling') => {
      // Deduplicate - only process each execution once
      if (seenIdsRef.current.has(progress.id)) {
        return;
      }

      // Only trigger on fresh executions (site_review phase)
      if (progress.current_phase !== 'site_review') {
        console.log(
          `[ExecutionListener] Skipping ${source} execution (phase: ${progress.current_phase}):`,
          progress.item_id,
        );
        return;
      }

      // Mark as seen and trigger callback
      seenIdsRef.current.add(progress.id);
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
      console.log(
        '[ExecutionListener] Realtime disabled (client:',
        !!client,
        'enabled:',
        enabled,
        ')',
      );
      return;
    }

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
          console.log(
            '[ExecutionListener] Realtime event received:',
            payload.eventType,
          );
          const progress = payload.new as ExecutionProgress;
          processExecution(progress, 'realtime');
        },
      )
      .subscribe((status) => {
        console.log(
          '[ExecutionListener] Realtime subscription status:',
          status,
        );
        realtimeConnectedRef.current = status === 'SUBSCRIBED';

        if (status === 'SUBSCRIBED') {
          console.log(
            '[ExecutionListener] ✓ Realtime CONNECTED - listening on:',
            TABLES.EXECUTION_PROGRESS,
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(
            '[ExecutionListener] ⚠ Realtime FAILED - falling back to polling only',
          );
        }
      });

    return () => {
      console.log('[ExecutionListener] Cleaning up realtime subscription');
      realtimeConnectedRef.current = false;
      void client.removeChannel(channel);
    };
  }, [client, enabled, processExecution]);

  // POLLING: Guaranteed fallback that runs regardless of realtime status
  // Uses dynamic interval with backoff on errors to prevent resource exhaustion
  useEffect(() => {
    if (!client || !enabled) {
      return;
    }

    let currentInterval = BASE_POLLING_INTERVAL_MS;
    let consecutiveErrors = 0;
    let intervalId: NodeJS.Timeout | null = null;

    console.log(
      '[ExecutionListener] Starting polling fallback (every',
      currentInterval / 1000,
      'seconds)',
    );

    const poll = async () => {
      try {
        // Use select('*') to avoid column-not-found errors on older schemas
        // This is more resilient than specifying exact columns
        const { data, error } = await client
          .from(TABLES.EXECUTION_PROGRESS)
          .select('*')
          .eq('current_phase', 'site_review')
          .is('completed_at', null)
          .gt('started_at', lastCheckTimeRef.current)
          .order('started_at', { ascending: false })
          .limit(5);

        if (error) {
          // Check for schema errors and log more helpful message
          if (error.message?.includes('column') || error.message?.includes('does not exist')) {
            console.error(
              '[ExecutionListener] Schema issue detected. User should update database schema in Settings.'
            );
          } else {
            console.error('[ExecutionListener] Polling error:', error.message);
          }
          // Backoff on error
          consecutiveErrors++;
          const newInterval = Math.min(
            BASE_POLLING_INTERVAL_MS * Math.pow(2, consecutiveErrors),
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
          currentInterval = BASE_POLLING_INTERVAL_MS;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = setInterval(() => void poll(), currentInterval);
          }
        }

        if (data && data.length > 0) {
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
        console.error('[ExecutionListener] Polling exception:', err);
        // Backoff on exception
        consecutiveErrors++;
        const newInterval = Math.min(
          BASE_POLLING_INTERVAL_MS * Math.pow(2, consecutiveErrors),
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
      console.log('[ExecutionListener] Stopping polling fallback');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [client, enabled, processExecution]);
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
    console.error(
      '[ExecutionListener] Failed to fetch item for execution:',
      itemId,
      error,
    );
    return null;
  }

  return data;
}
