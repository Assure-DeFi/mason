/**
 * Pagination utilities for API routes
 */

// Default and max limits for different resource types
export const PAGINATION_LIMITS = {
  DEFAULT: 50,
  MAX: 100,
  API_KEYS: 20,
  AI_KEYS: 10, // Users typically have 2-3 AI provider keys
  REPOSITORIES: 50,
  BACKLOG_ITEMS: 100,
} as const;

export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Parse and validate pagination parameters from URL search params
 * @param searchParams - URL search params object
 * @param defaultLimit - Default limit if not specified
 * @param maxLimit - Maximum allowed limit
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = PAGINATION_LIMITS.DEFAULT,
  maxLimit: number = PAGINATION_LIMITS.MAX,
): PaginationParams {
  // Parse limit
  const limitParam = searchParams.get('limit');
  let limit = defaultLimit;

  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, maxLimit);
    }
  }

  // Parse offset
  const offsetParam = searchParams.get('offset');
  let offset = 0;

  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}

/**
 * Pagination metadata to include in responses
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total?: number;
  hasMore?: boolean;
}

/**
 * Create pagination metadata for response
 */
export function createPaginationMeta(
  limit: number,
  offset: number,
  resultCount: number,
  total?: number,
): PaginationMeta {
  const meta: PaginationMeta = {
    limit,
    offset,
  };

  if (total !== undefined) {
    meta.total = total;
    meta.hasMore = offset + resultCount < total;
  } else {
    // If total not provided, check if we got more results than limit
    meta.hasMore = resultCount === limit;
  }

  return meta;
}
