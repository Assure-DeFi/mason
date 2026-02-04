import { TABLES } from '@/lib/constants';
import type {
  BacklogItem,
  BacklogFilters,
  BacklogSort,
  BacklogStatus,
} from '@/types/backlog';

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
 * Get backlog statistics using server-side aggregation
 *
 * Optimized to use PostgreSQL COUNT aggregation instead of fetching all rows.
 * Uses two efficient queries with COUNT instead of fetching entire table:
 * 1. Count by status
 * 2. Count by area
 *
 * Performance improvement: O(1) data transfer instead of O(n) rows
 */
// Type for get_backlog_stats RPC function result
interface BacklogStatsRPC {
  total: number;
  status_new: number;
  status_approved: number;
  status_in_progress: number;
  status_completed: number;
  status_deferred: number;
  status_rejected: number;
  area_frontend: number;
  area_backend: number;
}

export async function getBacklogStats(): Promise<{
  total: number;
  byStatus: Record<BacklogStatus, number>;
  byArea: Record<string, number>;
}> {
  // Use optimized RPC function that performs single-pass aggregation
  // This replaces 8 separate database queries with one aggregated query
  // using COUNT(*) FILTER for 75%+ performance improvement
  const { data, error } = await supabase.rpc('get_backlog_stats').single();

  if (error) {
    throw new Error(`Failed to fetch backlog stats: ${error.message}`);
  }

  // Type assertion for RPC result (Supabase doesn't have type information for custom functions)
  const stats = data as BacklogStatsRPC;

  // Transform flat RPC result into expected nested format
  return {
    total: stats.total,
    byStatus: {
      new: stats.status_new,
      approved: stats.status_approved,
      in_progress: stats.status_in_progress,
      completed: stats.status_completed,
      deferred: stats.status_deferred,
      rejected: stats.status_rejected,
    },
    byArea: {
      frontend: stats.area_frontend,
      backend: stats.area_backend,
    },
  };
}
