'use client';

import useSWR from 'swr';

import { CACHE_KEYS } from '@/lib/swr/config';
import { fetcher } from '@/lib/swr/fetcher';
import type { GitHubRepository } from '@/types/auth';

interface UseRepositoriesResult {
  repositories: GitHubRepository[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  isValidating: boolean;
}

/**
 * Hook for fetching GitHub repositories with SWR caching
 *
 * Features:
 * - Cached data shown immediately on navigation
 * - Background revalidation on focus
 * - Automatic retry on error
 * - Optimistic updates support via mutate
 */
export function useRepositories(): UseRepositoriesResult {
  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    repositories: GitHubRepository[];
  }>(CACHE_KEYS.REPOSITORIES, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  return {
    repositories: data?.repositories ?? [],
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
    isValidating,
  };
}

/**
 * Invalidate repositories cache
 * Call this after connecting/disconnecting a repository
 */
export async function invalidateRepositories(): Promise<void> {
  const { mutate } = await import('swr');
  await mutate(CACHE_KEYS.REPOSITORIES);
}
