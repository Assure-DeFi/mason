'use client';

import useSWR from 'swr';

import { CACHE_KEYS } from '@/lib/swr/config';
import { fetcher } from '@/lib/swr/fetcher';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface UseApiKeysResult {
  keys: ApiKey[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  isValidating: boolean;
}

/**
 * Hook for fetching API keys with SWR caching
 *
 * Features:
 * - Cached data shown immediately
 * - Background revalidation
 * - Automatic retry on error
 */
export function useApiKeys(): UseApiKeysResult {
  const { data, error, isLoading, mutate, isValidating } = useSWR<{
    keys: ApiKey[];
  }>(CACHE_KEYS.API_KEYS, fetcher, {
    // API keys may be created/revoked - shorter cache
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: true,
  });

  return {
    keys: data?.keys ?? [],
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
    isValidating,
  };
}

/**
 * Invalidate API keys cache
 * Call this after creating/revoking an API key
 */
export async function invalidateApiKeys(): Promise<void> {
  const { mutate } = await import('swr');
  await mutate(CACHE_KEYS.API_KEYS);
}
