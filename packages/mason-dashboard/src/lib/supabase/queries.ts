import { supabase } from './client';
import type {
  BacklogItem,
  BacklogFilters,
  BacklogSort,
  BacklogStatus,
} from '@/types/backlog';
import type { ExecutionRun, ExecutionTask } from '@/types/execution';

/**
 * Fetch backlog items with optional filters and sorting
 */
export async function fetchBacklogItems(
  filters?: BacklogFilters,
  sort?: BacklogSort,
  page = 1,
  pageSize = 20,
): Promise<{ items: BacklogItem[]; total: number }> {
  let query = supabase.from('pm_backlog_items').select('*', { count: 'exact' });

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
    .from('pm_backlog_items')
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
    .from('pm_backlog_items')
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
    .from('pm_backlog_items')
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
    .from('pm_execution_runs')
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
    .from('pm_execution_tasks')
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
 * Get backlog statistics
 */
export async function getBacklogStats(): Promise<{
  total: number;
  byStatus: Record<BacklogStatus, number>;
  byArea: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('pm_backlog_items')
    .select('status, area');

  if (error) {
    throw new Error(`Failed to fetch backlog stats: ${error.message}`);
  }

  const stats = {
    total: data.length,
    byStatus: {} as Record<BacklogStatus, number>,
    byArea: {} as Record<string, number>,
  };

  for (const item of data) {
    stats.byStatus[item.status as BacklogStatus] =
      (stats.byStatus[item.status as BacklogStatus] ?? 0) + 1;
    stats.byArea[item.area] = (stats.byArea[item.area] ?? 0) + 1;
  }

  return stats;
}
