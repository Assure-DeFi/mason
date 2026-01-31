/**
 * Execution Progress Utilities
 *
 * Handles creation and management of execution_progress records
 * for the ExecutionStatusModal visualization and CheckpointPanel.
 *
 * Uses checkpoint-based updates instead of log streaming for reliability.
 * Each checkpoint is an atomic UPDATE to a single row, avoiding the
 * brittleness of individual log INSERTs.
 *
 * IMPORTANT: All functions in this module throw errors on failure.
 * This ensures the execution engine can detect and handle failures
 * rather than silently continuing with stale dashboard data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/constants';

/**
 * Checkpoint interface for progress tracking
 */
export interface Checkpoint {
  id: number;
  name: string;
  completed_at: string | null;
}

/**
 * Standard checkpoint catalog for execution flow.
 * Static checkpoints are always present; dynamic ones are added for file writes.
 */
export const CHECKPOINT_CATALOG = {
  // Initialization checkpoints (1-2)
  INITIALIZED: { id: 1, name: 'Initialized execution' },
  LOADED_PRD: { id: 2, name: 'Loaded PRD' },

  // Analysis checkpoints (3-5)
  ANALYZING_CODEBASE: { id: 3, name: 'Analyzing codebase' },
  GENERATED_PLAN: { id: 4, name: 'Generated implementation plan' },
  CREATED_BRANCH: { id: 5, name: 'Created branch' },

  // Dynamic file checkpoints start at 6
  // Pattern: { id: 6+n, name: `Writing ${filename}` }

  // Validation checkpoints (100+, after all files)
  TYPESCRIPT_CHECK: { id: 100, name: 'Running TypeScript check' },
  ESLINT_CHECK: { id: 101, name: 'Running ESLint' },
  BUILD_CHECK: { id: 102, name: 'Running build' },
  TESTS_CHECK: { id: 103, name: 'Running tests' },

  // Final checkpoints
  COMMITTING: { id: 110, name: 'Committing changes' },
  CREATING_PR: { id: 111, name: 'Creating pull request' },
  COMPLETE: { id: 120, name: 'Complete' },
} as const;

/**
 * Calculate total checkpoints based on file count.
 * @param fileCount - Number of files to be written
 * @returns Total checkpoint count
 */
export function calculateTotalCheckpoints(fileCount: number): number {
  // 5 initial + fileCount files + 4 validation + 2 final + 1 complete
  return 5 + fileCount + 4 + 2 + 1;
}

/**
 * Generate file write checkpoint.
 * File checkpoints start at ID 6 and increment.
 */
export function createFileCheckpoint(
  fileIndex: number,
  fileName: string,
): { id: number; name: string } {
  return {
    id: 6 + fileIndex,
    name: `Writing ${fileName}`,
  };
}

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
  // Legacy phase tracking (kept for backward compatibility)
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
  // Checkpoint-based progress (new)
  checkpoint_index: number;
  checkpoint_total: number;
  checkpoint_message: string | null;
  checkpoints_completed: Checkpoint[];
  // File-level progress
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
 * This triggers the ExecutionStatusModal visualization in the dashboard.
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
    totalCheckpoints?: number;
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
  const totalCheckpoints = options?.totalCheckpoints ?? 12; // Default estimate
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
    // Checkpoint-based progress
    checkpoint_index: 0,
    checkpoint_total: totalCheckpoints,
    checkpoint_message: CHECKPOINT_CATALOG.INITIALIZED.name,
    checkpoints_completed: [],
    // File-level progress
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
 * Sets phase to 'complete' with failed validation status to show failure state.
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
 * Update checkpoint progress for an item.
 * This is the primary method for updating progress in the new checkpoint system.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param checkpoint - The checkpoint to set (id and name)
 * @param options - Additional options for the update
 */
export async function updateCheckpoint(
  client: SupabaseClient,
  itemId: string,
  checkpoint: { id: number; name: string },
  options?: {
    currentFile?: string;
    linesChanged?: number;
    phase?: ExecutionProgressRecord['current_phase'];
    wave?: number;
  },
): Promise<void> {
  try {
    // First get current progress to append to checkpoints_completed
    const { data: current } = await client
      .from(TABLES.EXECUTION_PROGRESS)
      .select('checkpoints_completed, checkpoint_index')
      .eq('item_id', itemId)
      .single();

    const previousCheckpoints = (current?.checkpoints_completed ??
      []) as Checkpoint[];

    // Create completed checkpoint entry
    const completedCheckpoint: Checkpoint = {
      id: checkpoint.id,
      name: checkpoint.name,
      completed_at: new Date().toISOString(),
    };

    // Don't duplicate checkpoints
    const alreadyCompleted = previousCheckpoints.some(
      (c) => c.id === checkpoint.id,
    );
    const updatedCompleted = alreadyCompleted
      ? previousCheckpoints
      : [...previousCheckpoints, completedCheckpoint];

    const updateData: Record<string, unknown> = {
      checkpoint_index: checkpoint.id,
      checkpoint_message: checkpoint.name,
      checkpoints_completed: updatedCompleted,
      current_task: checkpoint.name, // Also update legacy field
      updated_at: new Date().toISOString(),
    };

    if (options?.currentFile) {
      updateData.current_file = options.currentFile;
    }
    if (options?.linesChanged !== undefined) {
      updateData.lines_changed = options.linesChanged;
    }
    if (options?.phase) {
      updateData.current_phase = options.phase;
    }
    if (options?.wave !== undefined) {
      updateData.current_wave = options.wave;
    }

    const { error } = await client
      .from(TABLES.EXECUTION_PROGRESS)
      .update(updateData)
      .eq('item_id', itemId);

    if (error) {
      console.error('[ExecutionProgress] Error updating checkpoint:', error);
      // Non-fatal - log but continue
    }
  } catch (err) {
    console.error('[ExecutionProgress] Error in updateCheckpoint:', err);
    // Non-fatal - checkpoint updates shouldn't block execution
  }
}

/**
 * Set the total number of checkpoints for an item.
 * Call this after determining how many files will be written.
 */
export async function setTotalCheckpoints(
  client: SupabaseClient,
  itemId: string,
  totalCheckpoints: number,
): Promise<void> {
  try {
    await client
      .from(TABLES.EXECUTION_PROGRESS)
      .update({
        checkpoint_total: totalCheckpoints,
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', itemId);
  } catch (err) {
    console.error('[ExecutionProgress] Error setting total checkpoints:', err);
  }
}

/**
 * Format elapsed time between two timestamps.
 * @param startedAt - ISO timestamp when execution started
 * @param completedAt - ISO timestamp when execution completed (optional)
 * @returns Formatted time string (e.g., "2:45")
 */
export function formatElapsedTime(
  startedAt: string,
  completedAt?: string | null,
): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Summary data for execution completion display.
 */
export interface ExecutionSummary {
  itemTitle: string;
  itemDescription: string;
  accomplishments: string[];
  benefits: string[];
  filesChanged: { path: string; linesAdded: number }[];
  totalLinesChanged: number;
  elapsedTime: string;
  prUrl?: string;
}

/**
 * Generate a summary of the execution for the completion modal.
 * Pulls data from the backlog item and execution progress.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param progress - The execution progress record
 * @returns ExecutionSummary with accomplishments, benefits, and files changed
 */
export async function generateExecutionSummary(
  client: SupabaseClient,
  itemId: string,
  progress: ExecutionProgressRecord,
): Promise<ExecutionSummary> {
  // Fetch item with PRD
  const { data: item } = await client
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('title, description, prd_document, pr_url')
    .eq('id', itemId)
    .single();

  // PRD document may have key_features and expected_outcomes
  const prd = (item?.prd_document as Record<string, unknown>) ?? {};

  // Extract accomplishments from PRD key_features or fallback to description
  const keyFeatures = prd.key_features as string[] | undefined;
  const accomplishments: string[] = keyFeatures?.length
    ? keyFeatures
    : [item?.description ?? 'Completed task'];

  // Extract benefits from PRD expected_outcomes or provide generic fallback
  const expectedOutcomes = prd.expected_outcomes as string[] | undefined;
  const benefits: string[] = expectedOutcomes?.length
    ? expectedOutcomes
    : ['Improved your codebase'];

  // Build files changed list
  const filesTouched = progress.files_touched ?? [];
  const totalLines = progress.lines_changed ?? 0;
  const filesChanged = filesTouched.map((path) => ({
    path,
    // Distribute lines evenly if we don't have per-file data
    linesAdded: filesTouched.length > 0
      ? Math.round(totalLines / filesTouched.length)
      : 0,
  }));

  return {
    itemTitle: item?.title ?? 'Unknown Item',
    itemDescription: item?.description ?? '',
    accomplishments,
    benefits,
    filesChanged,
    totalLinesChanged: totalLines,
    elapsedTime: formatElapsedTime(progress.started_at, progress.completed_at),
    prUrl: (item?.pr_url as string) ?? undefined,
  };
}
