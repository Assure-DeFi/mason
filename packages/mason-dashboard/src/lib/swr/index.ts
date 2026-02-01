/**
 * SWR utilities for client-side caching
 *
 * Usage:
 * - Import hooks from @/hooks/useRepositories, @/hooks/useApiKeys
 * - Use CACHE_KEYS for manual cache invalidation
 * - Use invalidateRepositories() after mutations
 */

export { CACHE_KEYS, STALE_TIMES, swrConfig } from './config';
export { fetcher, postFetcher } from './fetcher';
export { SWRProvider } from './provider';
