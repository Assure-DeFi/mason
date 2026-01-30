/**
 * Execution Progress Utilities
 *
 * Handles creation and management of execution_progress records
 * for the BuildingTheater visualization.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/constants';

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
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param options - Optional configuration for the progress record
 * @returns The created or existing progress record, or null on error
 */
export async function ensureExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  options?: {
    runId?: string;
    totalWaves?: number;
    initialTask?: string;
  },
): Promise<ExecutionProgressRecord | null> {
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
    return null;
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
      const { data: refetched } = await client
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .eq('item_id', itemId)
        .single();

      return refetched as ExecutionProgressRecord | null;
    }

    console.error('[ExecutionProgress] Error creating record:', insertError);
    return null;
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
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param updates - The fields to update
 * @returns The updated progress record, or null on error
 */
export async function updateExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  updates: Partial<
    Omit<ExecutionProgressRecord, 'id' | 'item_id' | 'started_at'>
  >,
): Promise<ExecutionProgressRecord | null> {
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
    return null;
  }

  return data as ExecutionProgressRecord;
}

/**
 * Marks execution as complete.
 *
 * @param client - Supabase client
 * @param itemId - The backlog item ID
 * @param task - Final task description
 * @returns The updated progress record, or null on error
 */
export async function completeExecutionProgress(
  client: SupabaseClient,
  itemId: string,
  task: string = 'Occupancy Certificate Issued',
): Promise<ExecutionProgressRecord | null> {
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
  }
}
