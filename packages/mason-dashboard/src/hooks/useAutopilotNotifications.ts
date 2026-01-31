'use client';

/**
 * useAutopilotNotifications Hook
 *
 * Subscribes to autopilot run completions and shows toast notifications.
 * Enables real-time visibility when autopilot daemon completes runs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState, useCallback } from 'react';

import { TABLES } from '@/lib/constants';

interface AutopilotRun {
  id: string;
  user_id: string;
  repository_id: string;
  run_type: 'analysis' | 'execution';
  status: 'running' | 'completed' | 'failed';
  items_analyzed: number;
  items_auto_approved: number;
  items_executed: number;
  prs_created: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface AutopilotNotification {
  id: string;
  type: 'success' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

interface UseAutopilotNotificationsOptions {
  /** Supabase client instance */
  client: SupabaseClient | null;
  /** Whether to enable the subscription (default: true) */
  enabled?: boolean;
}

interface UseAutopilotNotificationsReturn {
  /** Current notification to display (null when none) */
  notification: AutopilotNotification | null;
  /** Dismiss the current notification */
  dismiss: () => void;
}

/**
 * Hook for subscribing to autopilot run completions.
 *
 * Usage:
 * ```tsx
 * const { notification, dismiss } = useAutopilotNotifications({ client });
 *
 * return (
 *   <>
 *     {notification && (
 *       <Toast
 *         type={notification.type}
 *         title={notification.title}
 *         message={notification.message}
 *         onDismiss={dismiss}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export function useAutopilotNotifications({
  client,
  enabled = true,
}: UseAutopilotNotificationsOptions): UseAutopilotNotificationsReturn {
  const [notification, setNotification] =
    useState<AutopilotNotification | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => {
    setNotification(null);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const showNotification = useCallback((run: AutopilotRun) => {
    // Only show notifications for completed or failed runs
    if (run.status !== 'completed' && run.status !== 'failed') {
      return;
    }

    const isSuccess = run.status === 'completed';
    const isAnalysis = run.run_type === 'analysis';

    let title: string;
    let message: string;

    if (isSuccess) {
      if (isAnalysis) {
        title = 'Autopilot Analysis Complete';
        const approved = run.items_auto_approved || 0;
        const analyzed = run.items_analyzed || 0;
        message =
          approved > 0
            ? `Discovered ${analyzed} items, auto-approved ${approved}`
            : `Discovered ${analyzed} items`;
      } else {
        title = 'Autopilot Execution Complete';
        const executed = run.items_executed || 0;
        const prs = run.prs_created || 0;
        message =
          prs > 0
            ? `Executed ${executed} items, created ${prs} PRs`
            : `Executed ${executed} items`;
      }
    } else {
      title = isAnalysis
        ? 'Autopilot Analysis Failed'
        : 'Autopilot Execution Failed';
      message = run.error_message || 'An error occurred during autopilot run';
    }

    const newNotification: AutopilotNotification = {
      id: run.id,
      type: isSuccess ? 'success' : 'error',
      title,
      message,
      timestamp: Date.now(),
    };

    setNotification(newNotification);

    // Auto-dismiss after 8 seconds
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    dismissTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 8000);
  }, []);

  useEffect(() => {
    if (!client || !enabled) {
      return;
    }

    const channel = client
      .channel('autopilot-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.AUTOPILOT_RUNS,
        },
        (payload) => {
          const run = payload.new as AutopilotRun;
          showNotification(run);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Autopilot] Subscribed to run notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Autopilot] Failed to subscribe to notifications');
        }
      });

    return () => {
      console.log('[Autopilot] Unsubscribing from notifications');
      void client.removeChannel(channel);
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [client, enabled, showNotification]);

  return {
    notification,
    dismiss,
  };
}

export default useAutopilotNotifications;
