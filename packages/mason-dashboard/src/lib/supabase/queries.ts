import { TABLES } from '@/lib/constants';
import type {
  BacklogItem,
  BacklogFilters,
  BacklogSort,
  BacklogStatus,
} from '@/types/backlog';
import type { ExecutionRun, ExecutionTask } from '@/types/execution';

import { supabase } from './client';

/**
 * Fetch backlog items with optional filters and sorting
 */
export async function fetchBacklogItems(
  filters?: BacklogFilters,
  sort?: BacklogSort,
  page = 1,
  pageSize = 20,
): Promise<{ items: BacklogItem[]; total: number }> {
  let query = supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters?.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters?.area?.length) {
    query = query.in('area', filters.area);
  }
  if (filters?.type?.length) {
    query = query.in('type', filters.type);
  }
  if (filters?.complexity?.length) {
    query = query.in('complexity', filters.complexity);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,problem.ilike.%${filters.search}%,solution.ilike.%${filters.search}%`,
    );
  }

  // Apply sorting
  const sortField = sort?.field ?? 'priority_score';
  const sortDirection = sort?.direction ?? 'desc';
  query = query.order(sortField, { ascending: sortDirection === 'asc' });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch backlog items: ${error.message}`);
  }

  return {
    items: data as BacklogItem[],
    total: count ?? 0,
  };
}

/**
 * Fetch a single backlog item by ID
 */
export async function fetchBacklogItem(
  id: string,
): Promise<BacklogItem | null> {
  const { data, error } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch backlog item: ${error.message}`);
  }

  return data as BacklogItem;
}

/**
 * Update a backlog item's status
 */
export async function updateBacklogItemStatus(
  id: string,
  status: BacklogStatus,
): Promise<BacklogItem> {
  const { data, error } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update backlog item: ${error.message}`);
  }

  return data as BacklogItem;
}

/**
 * Update a backlog item's PRD content
 */
export async function updateBacklogItemPrd(
  id: string,
  prdContent: string,
): Promise<BacklogItem> {
  const { data, error } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .update({
      prd_content: prdContent,
      prd_generated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update PRD content: ${error.message}`);
  }

  return data as BacklogItem;
}

/**
 * Fetch execution runs
 */
export async function fetchExecutionRuns(limit = 10): Promise<ExecutionRun[]> {
  const { data, error } = await supabase
    .from(TABLES.PM_EXECUTION_RUNS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch execution runs: ${error.message}`);
  }

  return data as ExecutionRun[];
}

/**
 * Fetch execution tasks for a run
 */
export async function fetchExecutionTasks(
  runId: string,
): Promise<ExecutionTask[]> {
  const { data, error } = await supabase
    .from(TABLES.PM_EXECUTION_TASKS)
    .select('*')
    .eq('run_id', runId)
    .order('wave_number', { ascending: true })
    .order('task_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch execution tasks: ${error.message}`);
  }

  return data as ExecutionTask[];
}

/**
 * Get backlog statistics using server-side aggregation
 *
 * Optimized to use PostgreSQL COUNT aggregation instead of fetching all rows.
 * Uses two efficient queries with COUNT instead of fetching entire table:
 * 1. Count by status
 * 2. Count by area
 *
 * Performance improvement: O(1) data transfer instead of O(n) rows
 */
export async function getBacklogStats(): Promise<{
  total: number;
  byStatus: Record<BacklogStatus, number>;
  byArea: Record<string, number>;
}> {
  // Query 1: Get counts by status using Supabase's count with grouping
  // Since Supabase doesn't support GROUP BY directly, we use individual count queries
  // which is still more efficient than fetching all rows
  const statusCounts = await Promise.all([
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deferred'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected'),
  ]);

  // Query 2: Get counts by area
  const areaCounts = await Promise.all([
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('area', 'frontend'),
    supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*', { count: 'exact', head: true })
      .eq('area', 'backend'),
  ]);

  // Check for errors
  const allResults = [...statusCounts, ...areaCounts];
  const errorResult = allResults.find((r) => r.error);
  if (errorResult?.error) {
    throw new Error(
      `Failed to fetch backlog stats: ${errorResult.error.message}`,
    );
  }

  // Build stats object from counts
  const byStatus: Record<BacklogStatus, number> = {
    new: statusCounts[0].count ?? 0,
    approved: statusCounts[1].count ?? 0,
    in_progress: statusCounts[2].count ?? 0,
    completed: statusCounts[3].count ?? 0,
    deferred: statusCounts[4].count ?? 0,
    rejected: statusCounts[5].count ?? 0,
  };

  const byArea: Record<string, number> = {
    frontend: areaCounts[0].count ?? 0,
    backend: areaCounts[1].count ?? 0,
  };

  // Calculate total from status counts
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return { total, byStatus, byArea };
}
