'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import useSWR from 'swr';

import { TABLES } from '@/lib/constants';
import { CACHE_KEYS } from '@/lib/swr/config';
import type { BacklogItem } from '@/types/backlog';

// Backlog items select columns (excludes prd_content for performance)
const BACKLOG_SELECT_COLUMNS =
  'id,title,problem,solution,type,status,area,complexity,' +
  'impact_score,effort_score,priority_score,' +
  'is_new_feature,is_banger_idea,tags,source,' +
  'updated_at,created_at,repository_id,' +
  'prd_generated_at,branch_name,pr_url,' +
  'risk_score,has_breaking_changes,files_affected_count,test_coverage_gaps,' +
  'user_id,analysis_run_id,' +
  'benefits';

interface UseBacklogItemsOptions {
  /** Supabase client for database queries */
  client: SupabaseClient | null;
  /** User ID to filter items by */
  userId: string | null;
  /** Optional repository ID to filter by */
  repositoryId?: string | null;
  /** Array of repository IDs the user has access to */
  userRepositoryIds?: string[];
  /** Whether the database is configured */
  isConfigured?: boolean;
}

interface UseBacklogItemsResult {
  items: BacklogItem[];
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

/**
 * Custom fetcher for backlog items that uses Supabase client
 * This allows us to leverage SWR's caching while using the Supabase client
 */
function createBacklogFetcher(
  client: SupabaseClient,
  userId: string,
  repositoryId: string | null | undefined,
  userRepositoryIds: string[] | undefined
) {
  return async (): Promise<BacklogItem[]> => {
    let query = client
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select(BACKLOG_SELECT_COLUMNS)
      .eq('user_id', userId);

    // Filter by selected repository at database level
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    } else if (userRepositoryIds && userRepositoryIds.length > 0) {
      // If no repo selected, only show items from user's connected repos
      query = query.in('repository_id', userRepositoryIds);
    }

    const { data, error } = await query.order('priority_score', {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return (data as unknown as BacklogItem[]) || [];
  };
}

/**
 * Hook for fetching backlog items with SWR caching
 *
 * Features:
 * - Cached data shown immediately on navigation (stale-while-revalidate)
 * - Background revalidation on focus
 * - Automatic retry on error
 * - Optimistic updates support via mutate
 * - Repository-aware caching (different cache per repo selection)
 *
 * @example
 * ```tsx
 * const { items, isLoading, error, mutate } = useBacklogItems({
 *   client: supabase,
 *   userId: user.id,
 *   repositoryId: selectedRepoId,
 *   userRepositoryIds: repos.map(r => r.id),
 * });
 * ```
 */
export function useBacklogItems({
  client,
  userId,
  repositoryId,
  userRepositoryIds,
  isConfigured = true,
}: UseBacklogItemsOptions): UseBacklogItemsResult {
  // Create a stable cache key that includes repository context
  // This ensures different repos have separate caches
  const cacheKey = useMemo(() => {
    if (!client || !userId || !isConfigured) {
      return null; // Null key prevents fetching
    }
    const repoKey = repositoryId || 'all';
    return `${CACHE_KEYS.BACKLOG_ITEMS}?userId=${userId}&repoId=${repoKey}`;
  }, [client, userId, repositoryId, isConfigured]);

  // Create fetcher with current parameters
  const fetcher = useMemo(() => {
    if (!client || !userId) {
      return null;
    }
    return createBacklogFetcher(client, userId, repositoryId, userRepositoryIds);
  }, [client, userId, repositoryId, userRepositoryIds]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<BacklogItem[]>(
    cacheKey,
    fetcher ? fetcher : null,
    {
      // Cache for 30 seconds before allowing new request
      dedupingInterval: 30 * 1000,
      // Revalidate when user returns to tab
      revalidateOnFocus: true,
      // Revalidate when network reconnects
      revalidateOnReconnect: true,
      // Keep showing previous data while revalidating
      keepPreviousData: true,
      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    items: data ?? [],
    isLoading,
    isValidating,
    error: error ?? null,
    mutate: async () => {
      await mutate();
    },
  };
}

/**
 * Invalidate backlog items cache for a specific user/repository combination
 * Call this after mutations (status changes, bulk actions, etc.)
 */
export async function invalidateBacklogItems(
  userId?: string,
  repositoryId?: string
): Promise<void> {
  const { mutate } = await import('swr');

  if (userId && repositoryId) {
    // Invalidate specific repository cache
    await mutate(`${CACHE_KEYS.BACKLOG_ITEMS}?userId=${userId}&repoId=${repositoryId}`);
  } else if (userId) {
    // Invalidate all caches for this user (matches pattern)
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(`${CACHE_KEYS.BACKLOG_ITEMS}?userId=${userId}`),
      undefined,
      { revalidate: true }
    );
  } else {
    // Invalidate all backlog caches
    await mutate(
      (key) => typeof key === 'string' && key.startsWith(CACHE_KEYS.BACKLOG_ITEMS),
      undefined,
      { revalidate: true }
    );
  }
}
