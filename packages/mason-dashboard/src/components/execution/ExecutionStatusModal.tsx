'use client';

/**
 * ExecutionStatusModal - Real-time execution progress display
 *
 * Replaces BuildingTheater with practical information density:
 * - Progress bar with percentage
 * - Checkpoint timeline
 * - Current file indicator
 * - Validation status grid
 * - Batch execution support
 *
 * Uses polling (1.5s) + realtime subscription for reliability.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import {
  X,
  Loader2,
  Check,
  Circle,
  XCircle,
  FileCode,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { TABLES } from '@/lib/constants';
import type {
  ExecutionProgressRecord,
  Checkpoint,
} from '@/lib/execution/progress';

type ValidationStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';

interface ExecutionStatusModalProps {
  itemId: string;
  itemTitle?: string;
  client: SupabaseClient;
  onComplete: (
    success: boolean,
    progress: ExecutionProgressRecord | null,
  ) => void;
  onClose: () => void;
}

export function ExecutionStatusModal({
  itemId,
  itemTitle,
  client,
  onComplete,
  onClose,
}: ExecutionStatusModalProps) {
  const [progress, setProgress] = useState<ExecutionProgressRecord | null>(
    null,
  );
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Connection timeout - if still connecting after 15 seconds, show helpful error
  const CONNECTION_TIMEOUT_POLLS = 10; // 10 polls * 1.5s = 15 seconds

  // Poll for checkpoint progress (1.5 second interval)
  const pollProgress = useCallback(async () => {
    try {
      setPollAttempts((prev) => prev + 1);

      const { data, error: fetchError } = await client
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Check for schema errors
        if (
          fetchError.message?.includes('column') ||
          fetchError.message?.includes('does not exist')
        ) {
          setConnectionError(
            'Database schema is out of date. To fix this:\n' +
              '1. Go to Settings (gear icon in top navigation)\n' +
              '2. Click "Update Database Schema" button\n' +
              '3. Wait for confirmation, then retry this action',
          );
          console.error('[ExecutionStatusModal] Schema error:', fetchError);
          return;
        }
        console.error('[ExecutionStatusModal] Poll error:', fetchError);
        return;
      }

      if (data) {
        setIsConnecting(false);
        setConnectionError(null);
        setProgress(data as ExecutionProgressRecord);

        // Check for completion
        if (data.completed_at) {
          const isSuccess =
            data.validation_typescript !== 'fail' &&
            data.validation_eslint !== 'fail' &&
            data.validation_build !== 'fail' &&
            data.validation_tests !== 'fail';
          onComplete(isSuccess, data as ExecutionProgressRecord);
        }
      } else if (pollAttempts >= CONNECTION_TIMEOUT_POLLS && isConnecting) {
        // Timeout - no data found after many attempts
        setConnectionError(
          'No execution progress found after 15 seconds. Possible causes:\n' +
            '• The CLI command may have errored before starting execution\n' +
            '• The item may not have been selected for execution\n\n' +
            'Try running /execute-approved again from your terminal.',
        );
      }
    } catch (err) {
      console.error('[ExecutionStatusModal] Poll exception:', err);
      if (pollAttempts >= CONNECTION_TIMEOUT_POLLS) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setConnectionError(
          `Unable to connect to database: ${errorMsg}\n\n` +
            'Troubleshooting steps:\n' +
            '1. Check your internet connection\n' +
            '2. Verify Supabase is configured in Settings\n' +
            '3. Try refreshing the page',
        );
      }
    }
  }, [client, itemId, onComplete, pollAttempts, isConnecting]);

  // Start polling when component mounts
  useEffect(() => {
    // Initial fetch
    void pollProgress();

    // Poll every 1.5 seconds
    const pollInterval = setInterval(() => {
      void pollProgress();
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [pollProgress]);

  // Also set up realtime subscription as backup
  useEffect(() => {
    const channel = client
      .channel(`execution-progress-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.EXECUTION_PROGRESS,
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const data = payload.new as ExecutionProgressRecord;
          if (data) {
            setIsConnecting(false);
            setProgress(data);

            // Check for completion
            if (data.completed_at) {
              const isSuccess =
                data.validation_typescript !== 'fail' &&
                data.validation_eslint !== 'fail' &&
                data.validation_build !== 'fail' &&
                data.validation_tests !== 'fail';
              onComplete(isSuccess, data);
            }
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, itemId, onComplete]);

  // Elapsed time counter
  useEffect(() => {
    if (!progress?.started_at || progress?.completed_at) {
      return;
    }

    const startTime = new Date(progress.started_at).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [progress?.started_at, progress?.completed_at]);

  // Auto-scroll to current checkpoint
  useEffect(() => {
    if (timelineRef.current) {
      const currentElement = timelineRef.current.querySelector(
        '[data-current="true"]',
      );
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progress?.checkpoint_index]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if there's a failure
  const hasFailed =
    progress?.completed_at &&
    (progress.validation_typescript === 'fail' ||
      progress.validation_eslint === 'fail' ||
      progress.validation_build === 'fail' ||
      progress.validation_tests === 'fail');

  const isComplete = progress?.completed_at && !hasFailed;

  // Calculate percentage - uses checkpoints_completed array length as primary,
  // falls back to checkpoint_index for cases where array append fails
  const checkpointsCompletedCount =
    progress?.checkpoints_completed?.length ?? 0;
  const checkpointIndex = progress?.checkpoint_index ?? 0;
  const checkpointTotal = progress?.checkpoint_total || 12;
  const effectiveProgress = Math.max(
    checkpointsCompletedCount,
    checkpointIndex > 0 ? checkpointIndex : 0,
  );
  const percentage = progress
    ? isComplete
      ? 100
      : Math.min(99, Math.round((effectiveProgress / checkpointTotal) * 100))
    : 0;

  // Build checkpoint list for display
  const displayCheckpoints = progress
    ? buildDisplayCheckpoints(
        progress.checkpoints_completed ?? [],
        progress.checkpoint_index ?? 0,
        progress.checkpoint_message ?? null,
      )
    : [];

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-status-title"
      aria-busy={!progress?.completed_at}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-navy shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {hasFailed ? (
              <XCircle className="h-6 w-6 text-red-400" />
            ) : isComplete ? (
              <CheckCircle className="h-6 w-6 text-green-400" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            )}
            <div>
              <h2
                id="execution-status-title"
                className="text-lg font-semibold text-white"
              >
                {hasFailed
                  ? 'Execution Failed'
                  : isComplete
                    ? 'Execution Complete'
                    : 'Mason at Work'}
              </h2>
              {itemTitle && (
                <p className="text-sm text-gray-400 truncate max-w-md">
                  {itemTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {progress?.started_at && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Connecting State */}
        {isConnecting && !connectionError && (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-gold mb-4" />
            <p className="text-gray-400">Connecting to execution...</p>
            <p className="text-xs text-gray-500 mt-2">
              Waiting for CLI to write progress data...
            </p>
          </div>
        )}

        {/* Connection Error State */}
        {connectionError && (
          <div className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-white font-medium mb-2">Connection Issue</p>
            <p className="text-gray-400 text-sm text-center max-w-md mb-4">
              {connectionError}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConnectionError(null);
                  setPollAttempts(0);
                  void pollProgress();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-md font-medium hover:bg-gold/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasFailed && progress && (
          <div className="p-6">
            <div className="rounded-lg bg-red-900/20 border border-red-900/50 p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-400">
                    Validation Failed
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {progress.current_task?.replace('Failed: ', '') ||
                      'One or more validation checks failed.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  What Happened
                </h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>
                    • Completed {progress.checkpoints_completed?.length ?? 0} of{' '}
                    {progress.checkpoint_total ?? 12} steps before failure
                  </li>
                  <li>• Files may have been written but validation failed</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Next Steps
                </h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• Check the branch for partial changes</li>
                  <li>• Fix the validation issue and re-run</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - In Progress */}
        {!isConnecting && !hasFailed && progress && (
          <>
            {/* Progress Bar */}
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>
                  {percentage}% ({progress.checkpoints_completed?.length ?? 0}/
                  {progress.checkpoint_total ?? 12} steps)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className={`h-full ${isComplete ? 'bg-green-500' : 'bg-gold'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Checkpoint Timeline */}
            <div
              ref={timelineRef}
              className="flex-1 overflow-y-auto px-6 py-4"
              style={{ maxHeight: '300px' }}
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Progress Timeline
              </h3>
              <div className="space-y-1">
                {displayCheckpoints.map((checkpoint, idx) => (
                  <CheckpointItem
                    key={checkpoint.id}
                    checkpoint={checkpoint}
                    isLast={idx === displayCheckpoints.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Current File Card */}
            {progress.current_file && !isComplete && (
              <div className="px-6 py-4 border-t border-gray-800">
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <FileCode className="h-3 w-3" />
                    <span>Current File</span>
                  </div>
                  <div className="font-mono text-sm text-gold truncate">
                    {progress.current_file}
                  </div>
                  {progress.lines_changed > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {progress.lines_changed} lines changed
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Validation Status */}
            <div className="px-6 py-4 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Validation
              </h3>
              <div className="grid grid-cols-5 gap-2">
                <ValidationStatusCard
                  label="TypeScript"
                  status={progress.validation_typescript}
                />
                <ValidationStatusCard
                  label="ESLint"
                  status={progress.validation_eslint}
                />
                <ValidationStatusCard
                  label="Build"
                  status={progress.validation_build}
                />
                <ValidationStatusCard
                  label="Tests"
                  status={progress.validation_tests}
                />
                <ValidationStatusCard
                  label="Smoke"
                  status={progress.validation_smoke_test}
                />
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-800 p-4">
          {progress?.completed_at ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          ) : (
            <span className="text-sm text-gray-400">
              Execution in progress...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface DisplayCheckpoint {
  id: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  completedAt: string | null;
}

function buildDisplayCheckpoints(
  completed: Checkpoint[],
  currentIndex: number,
  currentMessage: string | null,
): DisplayCheckpoint[] {
  const result: DisplayCheckpoint[] = [];

  // Add all completed checkpoints
  for (const cp of completed) {
    result.push({
      id: cp.id,
      name: cp.name,
      status: 'completed',
      completedAt: cp.completed_at,
    });
  }

  // Add current checkpoint if not already in completed
  if (
    currentMessage &&
    currentIndex > 0 &&
    !completed.some((c) => c.id === currentIndex)
  ) {
    result.push({
      id: currentIndex,
      name: currentMessage,
      status: 'current',
      completedAt: null,
    });
  }

  // Sort by ID to maintain order
  result.sort((a, b) => a.id - b.id);

  return result;
}

interface CheckpointItemProps {
  checkpoint: DisplayCheckpoint;
  isLast: boolean;
}

function CheckpointItem({ checkpoint, isLast }: CheckpointItemProps) {
  const { status, name, completedAt } = checkpoint;

  const formatTimestamp = (ts: string | null) => {
    if (!ts) {
      return '';
    }
    const date = new Date(ts);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex items-start gap-3" data-current={status === 'current'}>
      {/* Icon */}
      <div className="flex flex-col items-center">
        {status === 'completed' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-900/50">
            <Check className="h-3 w-3 text-green-400" />
          </div>
        )}
        {status === 'current' && (
          <motion.div
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold bg-gold/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Circle className="h-2 w-2 fill-gold text-gold" />
          </motion.div>
        )}
        {status === 'pending' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 bg-gray-800">
            <Circle className="h-2 w-2 text-gray-600" />
          </div>
        )}
        {/* Connecting line */}
        {!isLast && (
          <div
            className={`mt-1 h-4 w-0.5 ${
              status === 'completed' ? 'bg-green-700/50' : 'bg-gray-700'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-center justify-between">
          <div
            className={`text-sm ${
              status === 'completed'
                ? 'text-gray-300'
                : status === 'current'
                  ? 'font-medium text-white'
                  : 'text-gray-500'
            }`}
          >
            {name}
          </div>
          {status === 'completed' && completedAt && (
            <div className="text-xs text-gray-500 ml-2">
              {formatTimestamp(completedAt)}
            </div>
          )}
        </div>
        {status === 'current' && <div className="text-xs text-gold">NOW</div>}
      </div>
    </div>
  );
}

interface ValidationStatusCardProps {
  label: string;
  status: ValidationStatus;
}

function ValidationStatusCard({ label, status }: ValidationStatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pass':
        return {
          icon: <Check className="h-4 w-4" />,
          bgColor: 'bg-green-900/30',
          borderColor: 'border-green-900/50',
          textColor: 'text-green-400',
          statusText: 'Pass',
        };
      case 'fail':
        return {
          icon: <X className="h-4 w-4" />,
          bgColor: 'bg-red-900/30',
          borderColor: 'border-red-900/50',
          textColor: 'text-red-400',
          statusText: 'Fail',
        };
      case 'running':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          bgColor: 'bg-gold/10',
          borderColor: 'border-gold/30',
          textColor: 'text-gold',
          statusText: 'Running',
        };
      case 'skipped':
        return {
          icon: <Circle className="h-4 w-4" />,
          bgColor: 'bg-gray-800/50',
          borderColor: 'border-gray-700/50',
          textColor: 'text-gray-600',
          statusText: 'Skipped',
        };
      default:
        return {
          icon: <Circle className="h-4 w-4" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-gray-700',
          textColor: 'text-gray-500',
          statusText: 'Pending',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex flex-col items-center p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
    >
      <div className={`${config.textColor} mb-1`}>{config.icon}</div>
      <div className="text-xs font-medium text-white">{label}</div>
      <div className={`text-xs ${config.textColor}`}>{config.statusText}</div>
    </div>
  );
}

export default ExecutionStatusModal;
