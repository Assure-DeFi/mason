'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  X,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { TABLES } from '@/lib/constants';
import type { RemoteExecutionStatus, ItemResult } from '@/types/auth';

import { BuildingTheater } from './BuildingTheater';

interface ExecutionLog {
  id: string;
  created_at: string;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
}

interface ExecutionProgressProps {
  runId: string;
  itemId?: string;
  itemTitle?: string;
  client?: SupabaseClient | null;
  onClose: () => void;
  repositoryId?: string;
}

export function ExecutionProgress({
  runId,
  itemId,
  itemTitle,
  client,
  onClose,
  repositoryId,
}: ExecutionProgressProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [status, setStatus] = useState<RemoteExecutionStatus>('in_progress');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [failureCount, setFailureCount] = useState<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Check if this is a CLI execution with a real run_id (UUID format)
  // vs a synthetic "cli-{item_id}" format
  const isRealRunId = runId && !runId.startsWith('cli-');

  // Subscribe to execution_logs via Supabase realtime for CLI executions with real run_id
  useEffect(() => {
    if (!client || !isRealRunId) {
      return;
    }

    console.log(
      '[ExecutionProgress] Subscribing to execution_logs for run_id:',
      runId,
    );

    // First, fetch existing logs
    const fetchExistingLogs = async () => {
      const { data, error: fetchError } = await client
        .from(TABLES.EXECUTION_LOGS)
        .select('*')
        .eq('execution_run_id', runId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error(
          '[ExecutionProgress] Error fetching existing logs:',
          fetchError,
        );
        return;
      }

      if (data && data.length > 0) {
        console.log('[ExecutionProgress] Found', data.length, 'existing logs');
        setLogs(data as ExecutionLog[]);
      }
    };

    void fetchExistingLogs();

    // Subscribe to new logs
    const channel = client
      .channel(`execution-logs-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.EXECUTION_LOGS,
          filter: `execution_run_id=eq.${runId}`,
        },
        (payload) => {
          console.log('[ExecutionProgress] New log received:', payload.new);
          const newLog = payload.new as ExecutionLog;
          setLogs((prev) => [...prev, newLog]);
        },
      )
      .subscribe((subscriptionStatus) => {
        console.log(
          '[ExecutionProgress] Logs subscription status:',
          subscriptionStatus,
        );
      });

    return () => {
      console.log('[ExecutionProgress] Unsubscribing from execution_logs');
      void client.removeChannel(channel);
    };
  }, [client, runId, isRealRunId]);

  // Also check execution run status for completion
  useEffect(() => {
    if (!client || !isRealRunId) {
      return;
    }

    // Subscribe to execution run updates
    const channel = client
      .channel(`execution-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLES.REMOTE_EXECUTION_RUNS,
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          console.log(
            '[ExecutionProgress] Execution run updated:',
            payload.new,
          );
          const run = payload.new as {
            status: RemoteExecutionStatus;
            pr_url?: string;
            item_results?: ItemResult[];
            success_count?: number;
            failure_count?: number;
          };

          if (run.status && run.status !== 'in_progress') {
            setStatus(run.status);
            if (run.pr_url) {
              setPrUrl(run.pr_url);
            }
            if (run.item_results) {
              setItemResults(run.item_results);
            }
            if (run.success_count !== undefined) {
              setSuccessCount(run.success_count);
            }
            if (run.failure_count !== undefined) {
              setFailureCount(run.failure_count);
            }
          }
        },
      )
      .subscribe();

    // Also fetch current status in case we missed the update
    const fetchRunStatus = async () => {
      const { data } = await client
        .from(TABLES.REMOTE_EXECUTION_RUNS)
        .select('status, pr_url, item_results, success_count, failure_count')
        .eq('id', runId)
        .single();

      if (data && data.status !== 'in_progress') {
        setStatus(data.status);
        if (data.pr_url) {
          setPrUrl(data.pr_url);
        }
        if (data.item_results) {
          setItemResults(data.item_results as ItemResult[]);
        }
        if (data.success_count !== undefined) {
          setSuccessCount(data.success_count);
        }
        if (data.failure_count !== undefined) {
          setFailureCount(data.failure_count);
        }
      }
    };

    void fetchRunStatus();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, runId, isRealRunId]);

  // Connect to SSE endpoint for remote executions (non-CLI)
  useEffect(() => {
    // Skip SSE for CLI executions - we use Supabase realtime instead
    if (runId.startsWith('cli-') || isRealRunId) {
      return;
    }

    // Connect to SSE endpoint for logs
    const eventSource = new EventSource(`/api/execution/${runId}/logs`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'complete') {
          setStatus(data.status);
          setPrUrl(data.pr_url);
          // Extract item results for partial success display
          if (data.item_results) {
            setItemResults(data.item_results);
          }
          if (data.success_count !== undefined) {
            setSuccessCount(data.success_count);
          }
          if (data.failure_count !== undefined) {
            setFailureCount(data.failure_count);
          }
          eventSource.close();
        } else if (data.type === 'error') {
          setError(data.message || 'An error occurred during execution');
          setStatus('failed');
          eventSource.close();
        } else {
          setLogs((prev) => [...prev, data]);
        }
      } catch (e) {
        console.error('Failed to parse log:', e);
      }
    };

    eventSource.onerror = () => {
      setError('Connection lost. Please refresh.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, isRealRunId]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const isPartialSuccess = status === 'success' && failureCount > 0;

  const getStatusIcon = () => {
    if (isPartialSuccess) {
      return <AlertTriangle className="h-6 w-6 text-yellow-400" />;
    }
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-400" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-gold" />;
    }
  };

  const getStatusText = () => {
    if (isPartialSuccess) {
      return `Partial Success (${successCount} succeeded, ${failureCount} failed)`;
    }
    switch (status) {
      case 'success':
        return 'Execution Complete';
      case 'failed':
        return 'Execution Failed';
      case 'cancelled':
        return 'Execution Cancelled';
      default:
        return 'Executing...';
    }
  };

  const failedItems = itemResults.filter((r) => !r.success);

  const showBuildingTheater = itemId && client;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-progress-title"
      aria-busy={status === 'in_progress'}
    >
      <div
        className={`flex max-h-[80vh] w-full flex-col overflow-hidden rounded-lg bg-navy shadow-xl ${showBuildingTheater ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2
                id="execution-progress-title"
                className="text-lg font-semibold text-white"
              >
                {getStatusText()}
              </h2>
              {prUrl && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gold hover:underline"
                >
                  View Pull Request
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content - Two columns when BuildingTheater is shown */}
        <div
          className={`flex-1 overflow-hidden ${showBuildingTheater ? 'grid grid-cols-2 gap-4 p-4' : ''}`}
        >
          {/* BuildingTheater (left column) */}
          {showBuildingTheater && (
            <div className="overflow-y-auto">
              <BuildingTheater
                itemId={itemId}
                client={client}
                itemTitle={itemTitle}
              />
            </div>
          )}

          {/* Logs (right column or full width) */}
          <div
            className={`overflow-y-auto bg-black p-4 font-mono text-sm ${showBuildingTheater ? 'rounded-lg' : 'flex-1'}`}
            role="log"
            aria-live="polite"
            aria-label="Execution logs"
          >
            {error && (
              <div className="mb-4 rounded bg-red-900/20 p-3 text-red-400">
                {error}
              </div>
            )}

            {logs.length === 0 && !error && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for logs...
              </div>
            )}

            {logs.map((log) => (
              <div key={log.id} className="mb-1">
                <span className="text-gray-600">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>{' '}
                <span className={getLogLevelStyles(log.log_level)}>
                  [{log.log_level.toUpperCase()}]
                </span>{' '}
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}

            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Item Results Section (shown for partial success) */}
        {itemResults.length > 0 && (
          <div className="border-t border-gray-800 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              Item Results
              {isPartialSuccess && (
                <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-400">
                  Partial Success
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {itemResults.map((result) => (
                <div
                  key={result.itemId}
                  className={`flex items-start gap-3 rounded p-2 ${
                    result.success
                      ? 'bg-green-900/20 text-green-300'
                      : 'bg-red-900/20 text-red-300'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{result.title}</div>
                    {result.success && result.filesChanged && (
                      <div className="text-xs text-green-400/70">
                        {result.filesChanged} file
                        {result.filesChanged !== 1 ? 's' : ''} changed
                      </div>
                    )}
                    {!result.success && result.error && (
                      <div className="mt-1 text-xs text-red-400/70">
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* View Failed Items Button */}
            {failedItems.length > 0 && repositoryId && (
              <div className="mt-4">
                <a
                  href={`/admin/backlog?status=rejected&repository=${repositoryId}`}
                  className="inline-flex items-center gap-2 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 hover:bg-red-900/50"
                >
                  <Filter className="h-4 w-4" />
                  View Failed Items ({failedItems.length})
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-800 p-4">
          {status === 'in_progress' ? (
            <span className="text-sm text-gray-400">
              Execution in progress...
            </span>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
