import type { SWRConfiguration } from 'swr';

/**
 * Default SWR configuration for Mason dashboard
 *
 * Uses stale-while-revalidate pattern for optimal UX:
 * - Shows cached data immediately
 * - Revalidates in background
 * - Revalidates on focus and reconnect
 */
export const swrConfig: SWRConfiguration = {
  // Revalidation settings
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,

  // Retry on error
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,

  // Keep previous data while revalidating
  keepPreviousData: true,
};

/**
 * Cache keys for different data types
 * Use these as key prefixes to enable targeted cache invalidation
 */
export const CACHE_KEYS = {
  REPOSITORIES: '/api/github/repositories',
  API_KEYS: '/api/keys',
  SUPABASE_PROJECTS: '/api/supabase/projects',
} as const;

/**
 * Stale times for different data types (in milliseconds)
 * Data older than this will trigger background revalidation
 */
export const STALE_TIMES = {
  // Repositories rarely change - 5 minutes
  REPOSITORIES: 5 * 60 * 1000,

  // API keys may be created/deleted - 1 minute
  API_KEYS: 60 * 1000,

  // Supabase projects rarely change - 10 minutes
  SUPABASE_PROJECTS: 10 * 60 * 1000,
} as const;
