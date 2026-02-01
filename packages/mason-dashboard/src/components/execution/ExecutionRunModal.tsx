'use client';

/**
 * ExecutionRunModal - Real-time execution progress for an entire run
 *
 * Shows ALL items being executed in a checklist format:
 * - Master progress bar for overall run
 * - Each item shows as a collapsible card with its progress
 * - Checkpoints turn green as they complete
 * - Validation status grid per item
 * - Modal stays open until ALL items complete
 *
 * Uses polling (500ms) + realtime subscription for reliability.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Check,
  Circle,
  XCircle,
  FileCode,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ListChecks,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { TABLES } from '@/lib/constants';
import type { ExecutionProgressRecord } from '@/lib/execution/progress';

type ValidationStatus = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';
type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface ExecutionItem {
  itemId: string;
  title: string;
  status: ItemStatus;
  progress: ExecutionProgressRecord | null;
}

interface ExecutionRunModalProps {
  runId: string;
  initialItemId: string;
  initialItemTitle?: string;
  client: SupabaseClient;
  onComplete: () => void;
  onClose: () => void;
}

export function ExecutionRunModal({
  runId,
  initialItemId,
  initialItemTitle,
  client,
  onComplete,
  onClose,
}: ExecutionRunModalProps) {
  const [items, setItems] = useState<ExecutionItem[]>([
    {
      itemId: initialItemId,
      title: initialItemTitle ?? 'Loading...',
      status: 'in_progress',
      progress: null,
    },
  ]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    initialItemId,
  );
  const [isConnecting, setIsConnecting] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [runStartTime, setRunStartTime] = useState<Date | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Poll for all execution progress records in this run
  const pollProgress = useCallback(async () => {
    try {
      // Fetch all progress records for this run OR with matching item_id (for runs without run_id)
      const { data, error: fetchError } = await client
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .or(`run_id.eq.${runId},item_id.eq.${initialItemId}`)
        .order('started_at', { ascending: true });

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[ExecutionRunModal] Poll error:', fetchError);
        return;
      }

      if (data && data.length > 0) {
        setIsConnecting(false);

        // Update items with progress data
        const progressMap = new Map<string, ExecutionProgressRecord>();
        for (const record of data) {
          progressMap.set(record.item_id, record as ExecutionProgressRecord);
        }

        // Fetch item titles for any new items we haven't seen
        const existingItemIds = new Set(items.map((i) => i.itemId));
        const newItemIds = Array.from(progressMap.keys()).filter(
          (id) => !existingItemIds.has(id),
        );

        const itemTitles: Map<string, string> = new Map();
        if (newItemIds.length > 0) {
          const { data: itemData } = await client
            .from(TABLES.PM_BACKLOG_ITEMS)
            .select('id, title')
            .in('id', newItemIds);

          if (itemData) {
            for (const item of itemData) {
              itemTitles.set(item.id, item.title);
            }
          }
        }

        // Update items state
        setItems((prevItems) => {
          const updatedItems: ExecutionItem[] = [];
          const seenIds = new Set<string>();

          // Update existing items
          for (const item of prevItems) {
            const progress = progressMap.get(item.itemId);
            seenIds.add(item.itemId);
            updatedItems.push({
              ...item,
              progress: progress ?? item.progress,
              status: getItemStatus(progress),
            });
          }

          // Add new items
          Array.from(progressMap.entries()).forEach(([itemId, progress]) => {
            if (!seenIds.has(itemId)) {
              updatedItems.push({
                itemId,
                title: itemTitles.get(itemId) ?? `Item ${itemId.slice(0, 8)}`,
                status: getItemStatus(progress),
                progress,
              });
            }
          });

          return updatedItems;
        });

        // Set run start time from earliest started_at
        const earliestStart = data.reduce(
          (earliest, record) => {
            const started = new Date(record.started_at);
            return !earliest || started < earliest ? started : earliest;
          },
          null as Date | null,
        );
        if (earliestStart && !runStartTime) {
          setRunStartTime(earliestStart);
        }

        // Check if ALL items are complete
        const allComplete = data.every(
          (record) => record.completed_at !== null,
        );
        if (allComplete && data.length > 0) {
          // Small delay before calling onComplete to let user see final state
          setTimeout(() => {
            onComplete();
          }, 2000);
        }
      }
    } catch (err) {
      console.error('[ExecutionRunModal] Poll exception:', err);
    }
  }, [client, runId, initialItemId, items, runStartTime, onComplete]);

  // Start polling when component mounts
  useEffect(() => {
    // Initial fetch
    void pollProgress();

    // Poll every 500ms for responsive updates
    const pollInterval = setInterval(() => {
      void pollProgress();
    }, 500);

    return () => clearInterval(pollInterval);
  }, [pollProgress]);

  // Also set up realtime subscription as backup
  useEffect(() => {
    const channel = client
      .channel(`execution-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.EXECUTION_PROGRESS,
        },
        () => {
          // Trigger a poll on any change
          void pollProgress();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, runId, pollProgress]);

  // Elapsed time counter
  useEffect(() => {
    if (!runStartTime) {
      return;
    }

    const allComplete = items.every((item) => item.status === 'completed');
    if (allComplete) {
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - runStartTime.getTime()) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [runStartTime, items]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate overall progress
  const completedItems = items.filter((i) => i.status === 'completed').length;
  const failedItems = items.filter((i) => i.status === 'failed').length;
  const totalItems = items.length;
  const overallPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const hasFailed = failedItems > 0;
  const isAllComplete = completedItems === totalItems && totalItems > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-run-title"
      aria-busy={!isAllComplete}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-navy shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {hasFailed ? (
              <XCircle className="h-6 w-6 text-red-400" />
            ) : isAllComplete ? (
              <CheckCircle className="h-6 w-6 text-green-400" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            )}
            <div>
              <h2
                id="execution-run-title"
                className="text-lg font-semibold text-white"
              >
                {hasFailed
                  ? 'Execution Failed'
                  : isAllComplete
                    ? 'Execution Complete'
                    : 'Mason at Work'}
              </h2>
              <p className="text-sm text-gray-400">
                {completedItems}/{totalItems} items completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {runStartTime && (
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
        {isConnecting && (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-gold mb-4" />
            <p className="text-gray-400">Connecting to execution...</p>
          </div>
        )}

        {/* Main Content */}
        {!isConnecting && (
          <>
            {/* Overall Progress Bar */}
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  <span>Overall Progress</span>
                </div>
                <span>
                  {overallPercentage}% ({completedItems}/{totalItems} items)
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className={`h-full ${
                    hasFailed
                      ? 'bg-red-500'
                      : isAllComplete
                        ? 'bg-green-500'
                        : 'bg-gold'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPercentage}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Items Checklist */}
            <div
              ref={timelineRef}
              className="flex-1 overflow-y-auto px-6 py-4"
              style={{ maxHeight: '500px' }}
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Execution Checklist
              </h3>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <ExecutionItemCard
                      key={item.itemId}
                      item={item}
                      isExpanded={expandedItemId === item.itemId}
                      onToggle={() =>
                        setExpandedItemId(
                          expandedItemId === item.itemId ? null : item.itemId,
                        )
                      }
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 p-4">
          <div className="text-sm text-gray-400">
            {isAllComplete
              ? 'All tasks completed successfully'
              : hasFailed
                ? 'Some tasks failed - check details above'
                : 'Execution in progress...'}
          </div>
          {(isAllComplete || hasFailed) && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getItemStatus(
  progress: ExecutionProgressRecord | null | undefined,
): ItemStatus {
  if (!progress) {
    return 'pending';
  }
  if (progress.completed_at) {
    const hasFailed =
      progress.validation_typescript === 'fail' ||
      progress.validation_eslint === 'fail' ||
      progress.validation_build === 'fail' ||
      progress.validation_tests === 'fail';
    return hasFailed ? 'failed' : 'completed';
  }
  return 'in_progress';
}

interface ExecutionItemCardProps {
  item: ExecutionItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function ExecutionItemCard({
  item,
  isExpanded,
  onToggle,
}: ExecutionItemCardProps) {
  const { status, title, progress } = item;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-4 w-4 text-green-400" />
          </div>
        );
      case 'failed':
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
            <X className="h-4 w-4 text-red-400" />
          </div>
        );
      case 'in_progress':
        return (
          <motion.div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gold bg-gold/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Loader2 className="h-4 w-4 text-gold animate-spin" />
          </motion.div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-600 bg-gray-800">
            <Circle className="h-3 w-3 text-gray-600" />
          </div>
        );
    }
  };

  const getStatusBorder = () => {
    switch (status) {
      case 'completed':
        return 'border-green-500/30';
      case 'failed':
        return 'border-red-500/30';
      case 'in_progress':
        return 'border-gold/50';
      default:
        return 'border-gray-700';
    }
  };

  // Calculate item progress percentage
  const checkpointsCompleted = progress?.checkpoints_completed?.length ?? 0;
  const checkpointTotal = progress?.checkpoint_total ?? 12;
  const itemPercentage = Math.round(
    (checkpointsCompleted / checkpointTotal) * 100,
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border-2 ${getStatusBorder()} bg-gray-900/50 overflow-hidden`}
    >
      {/* Item Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors text-left"
      >
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`font-medium truncate ${
                status === 'completed'
                  ? 'text-green-400'
                  : status === 'failed'
                    ? 'text-red-400'
                    : status === 'in_progress'
                      ? 'text-white'
                      : 'text-gray-400'
              }`}
            >
              {title}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              {itemPercentage}%
            </span>
          </div>
          {status === 'in_progress' && progress?.checkpoint_message && (
            <p className="text-xs text-gold truncate mt-1">
              {progress.checkpoint_message}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && progress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-800 pt-4">
              {/* Mini Progress Bar */}
              <div className="mb-4">
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <motion.div
                    className={`h-full ${
                      status === 'completed'
                        ? 'bg-green-500'
                        : status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gold'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${itemPercentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{checkpointsCompleted} checkpoints done</span>
                  <span>{checkpointTotal} total</span>
                </div>
              </div>

              {/* Validation Status Grid */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Validation
                </h4>
                <div className="grid grid-cols-5 gap-1.5">
                  <MiniValidationCard
                    label="TS"
                    status={progress.validation_typescript}
                  />
                  <MiniValidationCard
                    label="Lint"
                    status={progress.validation_eslint}
                  />
                  <MiniValidationCard
                    label="Build"
                    status={progress.validation_build}
                  />
                  <MiniValidationCard
                    label="Tests"
                    status={progress.validation_tests}
                  />
                  <MiniValidationCard
                    label="E2E"
                    status={progress.validation_smoke_test}
                  />
                </div>
              </div>

              {/* Current File */}
              {progress.current_file && status === 'in_progress' && (
                <div className="rounded border border-gold/20 bg-gold/5 p-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FileCode className="h-3 w-3" />
                    <span className="truncate font-mono text-gold">
                      {progress.current_file}
                    </span>
                  </div>
                </div>
              )}

              {/* Checkpoints Timeline (Collapsed) */}
              {progress.checkpoints_completed &&
                progress.checkpoints_completed.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Recent Checkpoints
                    </h4>
                    <div className="space-y-1">
                      {progress.checkpoints_completed.slice(-3).map((cp) => (
                        <div
                          key={cp.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Check className="h-3 w-3 text-green-400" />
                          <span className="text-gray-400 truncate">
                            {cp.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MiniValidationCardProps {
  label: string;
  status: ValidationStatus;
}

function MiniValidationCard({ label, status }: MiniValidationCardProps) {
  const getConfig = () => {
    switch (status) {
      case 'pass':
        return {
          icon: <Check className="h-3 w-3" />,
          bg: 'bg-green-500/20',
          border: 'border-green-500/50',
          text: 'text-green-400',
        };
      case 'fail':
        return {
          icon: <X className="h-3 w-3" />,
          bg: 'bg-red-500/20',
          border: 'border-red-500/50',
          text: 'text-red-400',
        };
      case 'running':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          bg: 'bg-gold/20',
          border: 'border-gold',
          text: 'text-gold',
        };
      case 'skipped':
        return {
          icon: <Circle className="h-3 w-3" />,
          bg: 'bg-gray-800/50',
          border: 'border-gray-700',
          text: 'text-gray-600',
        };
      default:
        return {
          icon: <Circle className="h-3 w-3" />,
          bg: 'bg-gray-800',
          border: 'border-gray-700',
          text: 'text-gray-500',
        };
    }
  };

  const config = getConfig();

  return (
    <motion.div
      className={`flex flex-col items-center p-2 rounded border ${config.bg} ${config.border}`}
      animate={
        status === 'running'
          ? {
              boxShadow: [
                '0 0 0 0 rgba(226, 210, 67, 0)',
                '0 0 0 2px rgba(226, 210, 67, 0.3)',
                '0 0 0 0 rgba(226, 210, 67, 0)',
              ],
            }
          : {}
      }
      transition={
        status === 'running' ? { duration: 1.5, repeat: Infinity } : {}
      }
    >
      <div className={config.text}>{config.icon}</div>
      <span className={`text-[10px] font-medium mt-0.5 ${config.text}`}>
        {label}
      </span>
    </motion.div>
  );
}

export default ExecutionRunModal;
