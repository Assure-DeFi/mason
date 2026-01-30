'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { TABLES } from '@/lib/constants';

interface ExecutionProgress {
  id: string;
  item_id: string;
  current_phase: string;
  started_at: string;
}

interface UseExecutionListenerOptions {
  client: SupabaseClient | null;
  enabled?: boolean;
  onExecutionStart?: (progress: ExecutionProgress) => void;
}

/**
 * Global execution listener hook.
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

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onExecutionStart;
  }, [onExecutionStart]);

  useEffect(() => {
    if (!client || !enabled) {
      return;
    }

    // Subscribe to new execution progress records
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
          const progress = payload.new as ExecutionProgress;

          // Only trigger on fresh executions (site_review phase)
          if (progress.current_phase === 'site_review') {
            callbackRef.current?.(progress);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, enabled]);
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
    return null;
  }

  return data;
}
