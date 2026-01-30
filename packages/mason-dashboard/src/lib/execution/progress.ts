/**
 * Execution Progress Utilities
 *
 * Handles creation and management of execution_progress records
 * for the BuildingTheater visualization.
 *
 * IMPORTANT: All functions in this module throw errors on failure.
 * This ensures the execution engine can detect and handle failures
 * rather than silently continuing with stale dashboard data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/constants';

/**
 * Custom error for execution progress failures.
 * Allows the engine to distinguish progress update failures from other errors.
 */
export class ExecutionProgressError extends Error {
  constructor(
    message: string,
    public readonly itemId: string,
    public readonly operation: 'create' | 'update' | 'delete',
  ) {
    super(message);
    this.name = 'ExecutionProgressError';
  }
}

export interface ExecutionProgressRecord {
  id: string;
  item_id: string;
  run_id: string | null;
  current_phase:
    | 'site_review'
    | 'foundation'
    | 'building'
    | 'inspection'
    | 'complete';
  current_wave: number;
  total_waves: number;
  wave_status: 'pending' | 'in_progress' | 'completed';
  current_task: string | null;
  tasks_completed: number;
  tasks_total: number;
  current_file: string | null;
  files_touched: string[];
  lines_changed: number;
  validation_typescript: 'pending' | 'running' | 'pass' | 'fail';
  validation_eslint: 'pending' | 'running' | 'pass' | 'fail';
  validation_build: 'pending' | 'running' | 'pass' | 'fail';
  validation_tests: 'pending' | 'running' | 'pass' | 'fail';
  inspector_findings: string[];
  fix_iteration: number;
  max_iterations: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Creates an execution_progress record for an item if one doesn't exist.
 * This triggers the BuildingTheater visualization in the dashboard.
 *
 * IMPORTANT: This function THROWS on failure to ensure the execution engine
 * can detect and handle failures rather than silently continuing.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param options - Optional configuration for the progress record
 * @returns The created or existing progress record
 * @throws ExecutionProgressError if creation fails
 */
export async function ensureExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  options?: {
    runId?: string;
    totalWaves?: number;
    initialTask?: string;
  },
): Promise<ExecutionProgressRecord> {
  // Check if a progress record already exists
  const { data: existing, error: checkError } = await client
    .from(TABLES.EXECUTION_PROGRESS)
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();

  if (checkError) {
    console.error(
      '[ExecutionProgress] Error checking existing record:',
      checkError,
    );
    throw new ExecutionProgressError(
      `Failed to check existing progress record: ${checkError.message}`,
      itemId,
      'create',
    );
  }

  // If record exists and is not complete, return it
  if (existing) {
    // If it's complete, we might want to reset it for a new execution
    if (existing.current_phase === 'complete') {
      // Delete the old completed record to start fresh
      const { error: deleteError } = await client
        .from(TABLES.EXECUTION_PROGRESS)
        .delete()
        .eq('item_id', itemId);

      if (deleteError) {
        console.error(
          '[ExecutionProgress] Error deleting completed record:',
          deleteError,
        );
        // Non-fatal: return existing and let caller decide
        return existing as ExecutionProgressRecord;
      }
      // Fall through to create a new record
    } else {
      // Record exists and is not complete, return it
      return existing as ExecutionProgressRecord;
    }
  }

  // Create new execution_progress record
  const newRecord = {
    item_id: itemId,
    run_id: options?.runId ?? null,
    current_phase: 'site_review' as const,
    current_wave: 0,
    total_waves: options?.totalWaves ?? 4,
    wave_status: 'pending' as const,
    current_task: options?.initialTask ?? 'Analyzing PRD and dependencies...',
    tasks_completed: 0,
    tasks_total: 0,
    current_file: null,
    files_touched: [],
    lines_changed: 0,
    validation_typescript: 'pending' as const,
    validation_eslint: 'pending' as const,
    validation_build: 'pending' as const,
    validation_tests: 'pending' as const,
    inspector_findings: [],
    fix_iteration: 0,
    max_iterations: 5,
  };

  const { data: created, error: insertError } = await client
    .from(TABLES.EXECUTION_PROGRESS)
    .insert(newRecord)
    .select()
    .single();

  if (insertError) {
    // Handle unique constraint violation (another process created it)
    if (insertError.code === '23505') {
      // Fetch the existing record
      const { data: refetched, error: refetchError } = await client
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .eq('item_id', itemId)
        .single();

      if (refetchError || !refetched) {
        throw new ExecutionProgressError(
          `Failed to fetch existing progress record after conflict: ${refetchError?.message ?? 'No data returned'}`,
          itemId,
          'create',
        );
      }

      return refetched as ExecutionProgressRecord;
    }

    console.error('[ExecutionProgress] Error creating record:', insertError);
    throw new ExecutionProgressError(
      `Failed to create progress record: ${insertError.message}`,
      itemId,
      'create',
    );
  }

  console.log(
    '[ExecutionProgress] Created new progress record for item:',
    itemId,
  );
  return created as ExecutionProgressRecord;
}

/**
 * Updates the execution progress for an item.
 *
 * IMPORTANT: This function THROWS on failure to ensure the execution engine
 * can detect and handle failures rather than silently continuing.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param updates - The fields to update
 * @returns The updated progress record
 * @throws ExecutionProgressError if update fails
 */
export async function updateExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  updates: Partial<
    Omit<ExecutionProgressRecord, 'id' | 'item_id' | 'started_at'>
  >,
): Promise<ExecutionProgressRecord> {
  const { data, error } = await client
    .from(TABLES.EXECUTION_PROGRESS)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('item_id', itemId)
    .select()
    .single();

  if (error) {
    console.error('[ExecutionProgress] Error updating record:', error);
    throw new ExecutionProgressError(
      `Failed to update progress record: ${error.message}`,
      itemId,
      'update',
    );
  }

  if (!data) {
    throw new ExecutionProgressError(
      'No progress record found to update',
      itemId,
      'update',
    );
  }

  return data as ExecutionProgressRecord;
}

/**
 * Marks execution as complete.
 *
 * IMPORTANT: This function THROWS on failure via updateExecutionProgress.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param task - Final task description
 * @returns The updated progress record
 * @throws ExecutionProgressError if update fails
 */
export async function completeExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  task: string = 'Occupancy Certificate Issued',
): Promise<ExecutionProgressRecord> {
  return updateExecutionProgress(client, itemId, {
    current_phase: 'complete',
    current_task: task,
    validation_typescript: 'pass',
    validation_eslint: 'pass',
    validation_build: 'pass',
    validation_tests: 'pass',
    completed_at: new Date().toISOString(),
  });
}

/**
 * Cleans up execution progress record for an item.
 * Called when execution is cancelled or item status changes away from in_progress.
 *
 * Note: This function logs errors but does NOT throw, as cleanup is best-effort.
 * The item status is the source of truth, progress records are just for visualization.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 */
export async function cleanupExecutionProgress(
  client: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await client
    .from(TABLES.EXECUTION_PROGRESS)
    .delete()
    .eq('item_id', itemId);

  if (error) {
    console.error('[ExecutionProgress] Error deleting record:', error);
    // Don't throw - cleanup is best-effort
  }
}

/**
 * Marks execution progress as failed for an item.
 * Sets phase to 'complete' with failed validation status to show failure in BuildingTheater.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param errorMessage - The error message to display
 */
export async function failExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  errorMessage: string,
): Promise<void> {
  try {
    // First ensure record exists
    await ensureExecutionProgress(client, itemId, {
      initialTask: `Failed: ${errorMessage}`,
    });

    // Then update it to failed state
    await updateExecutionProgress(client, itemId, {
      current_phase: 'complete',
      current_task: `Failed: ${errorMessage}`,
      validation_typescript: 'fail',
      validation_eslint: 'fail',
      validation_build: 'fail',
      validation_tests: 'fail',
      completed_at: new Date().toISOString(),
    });
  } catch (updateError) {
    // Best-effort - log but don't propagate
    console.error(
      '[ExecutionProgress] Failed to mark progress as failed:',
      updateError,
    );
  }
}

/**
 * Heartbeat configuration
 */
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
const STALL_WARNING_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Execution heartbeat manager.
 * Writes progress updates at regular intervals during long-running operations.
 * This keeps the BuildingTheater visualization active and helps users identify stalled executions.
 *
 * Usage:
 * ```
 * const heartbeat = createHeartbeat(client, itemId);
 * heartbeat.start('Generating code changes...');
 * try {
 *   const result = await longRunningOperation();
 *   heartbeat.stop();
 *   return result;
 * } catch (error) {
 *   heartbeat.stop();
 *   throw error;
 * }
 * ```
 */
export interface ExecutionHeartbeat {
  /** Start sending heartbeat updates */
  start: (message: string) => void;
  /** Stop the heartbeat interval */
  stop: () => void;
  /** Update the current status message */
  updateMessage: (message: string) => void;
  /** Get elapsed time in seconds since heartbeat started */
  getElapsedSeconds: () => number;
  /** Check if execution appears stalled (no activity for 5+ minutes) */
  isStalled: () => boolean;
}

/**
 * Creates a heartbeat manager for an execution item.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param options - Optional configuration
 * @returns Heartbeat manager object
 */
export function createHeartbeat(
  client: SupabaseClient,
  itemId: string,
  options?: {
    intervalMs?: number;
    onError?: (error: Error) => void;
  },
): ExecutionHeartbeat {
  let intervalId: NodeJS.Timeout | null = null;
  let currentMessage = '';
  let startTime: number | null = null;
  let lastUpdateTime: number | null = null;

  const intervalMs = options?.intervalMs ?? HEARTBEAT_INTERVAL_MS;

  const sendHeartbeat = async () => {
    if (!startTime) {
      return;
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    try {
      // Update progress with elapsed time indicator
      await client
        .from(TABLES.EXECUTION_PROGRESS)
        .update({
          current_task: `${currentMessage} (${timeStr})`,
          updated_at: new Date().toISOString(),
        })
        .eq('item_id', itemId);

      lastUpdateTime = Date.now();
    } catch (error) {
      // Log but don't throw - heartbeat is best-effort
      console.error('[Heartbeat] Failed to send heartbeat:', error);
      options?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  return {
    start(message: string) {
      currentMessage = message;
      startTime = Date.now();
      lastUpdateTime = Date.now();

      // Send initial heartbeat immediately
      void sendHeartbeat();

      // Set up interval
      intervalId = setInterval(() => {
        void sendHeartbeat();
      }, intervalMs);
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      startTime = null;
    },

    updateMessage(message: string) {
      currentMessage = message;
      // Send an immediate update when message changes
      void sendHeartbeat();
    },

    getElapsedSeconds() {
      return startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    },

    isStalled() {
      if (!lastUpdateTime) {
        return false;
      }
      return Date.now() - lastUpdateTime > STALL_WARNING_MS;
    },
  };
}

/**
 * Wraps a long-running operation with automatic heartbeat updates.
 * Convenience function that handles start/stop automatically.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param message - Status message to display
 * @param operation - The async operation to execute
 * @returns The result of the operation
 */
export async function withHeartbeat<T>(
  client: SupabaseClient,
  itemId: string,
  message: string,
  operation: () => Promise<T>,
): Promise<T> {
  const heartbeat = createHeartbeat(client, itemId);
  heartbeat.start(message);

  try {
    const result = await operation();
    heartbeat.stop();
    return result;
  } catch (error) {
    heartbeat.stop();
    throw error;
  }
}
