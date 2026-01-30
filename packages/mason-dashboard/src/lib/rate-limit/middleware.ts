import { NextResponse } from 'next/server';

import {
  rateLimitStrategies,
  isRateLimitingEnabled,
  type RateLimitStrategy,
} from './config';

export interface RateLimitResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/**
 * Check rate limit for a given identifier and strategy
 *
 * @param identifier - Unique identifier (user ID, IP address, API key)
 * @param strategy - Rate limit strategy to use
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  strategy: RateLimitStrategy,
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!isRateLimitingEnabled()) {
    return { success: true };
  }

  const limiter = rateLimitStrategies[strategy];
  if (!limiter) {
    return { success: true };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Create a rate-limited response with appropriate headers
 *
 * @param result - Rate limit check result
 * @returns 429 Too Many Requests response with Retry-After header
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = result.reset
    ? Math.ceil((result.reset - Date.now()) / 1000)
    : 3600;

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message:
        'Rate limit exceeded. Please wait before making another request.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit ?? 0),
        'X-RateLimit-Remaining': String(result.remaining ?? 0),
        'X-RateLimit-Reset': String(result.reset ?? 0),
      },
    },
  );
}

/**
 * Add rate limit headers to a successful response
 *
 * @param response - Original NextResponse
 * @param result - Rate limit check result
 * @returns Response with rate limit headers added
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  if (result.limit !== undefined) {
    response.headers.set('X-RateLimit-Limit', String(result.limit));
  }
  if (result.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  }
  if (result.reset !== undefined) {
    response.headers.set('X-RateLimit-Reset', String(result.reset));
  }
  return response;
}

/**
 * Get a rate limit identifier for a user.
 * Uses user ID for authenticated requests, falls back to IP for unauthenticated.
 *
 * @param operation - The operation being rate-limited (e.g., 'prd', 'execute')
 * @param userId - The authenticated user's ID (e.g., github_id)
 * @param fallbackIp - Fallback IP address if user is not authenticated
 * @returns A unique identifier for rate limiting
 *
 * @example
 * // For authenticated users
 * const identifier = getRateLimitIdentifier('prd', session.user.github_id);
 * // Returns: 'prd:user:123456'
 *
 * @example
 * // For unauthenticated requests (falls back to IP)
 * const identifier = getRateLimitIdentifier('validate', undefined, clientIp);
 * // Returns: 'validate:ip:192.168.1.1'
 */
export function getRateLimitIdentifier(
  operation: string,
  userId?: string,
  fallbackIp?: string,
): string {
  if (userId) {
    return `${operation}:user:${userId}`;
  }
  return `${operation}:ip:${fallbackIp ?? 'unknown'}`;
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: Request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     strategy: 'aiHeavy',
 *     getIdentifier: async (request) => {
 *       const session = await getServerSession(authOptions);
 *       return getRateLimitIdentifier('prd', session?.user?.github_id);
 *     },
 *   }
 * );
 * ```
 */
export function withRateLimit<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<NextResponse>,
  options: {
    strategy: RateLimitStrategy;
    getIdentifier: (request: Request) => Promise<string>;
  },
): (request: Request, ...args: T) => Promise<NextResponse> {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    const identifier = await options.getIdentifier(request);
    const result = await checkRateLimit(identifier, options.strategy);

    if (!result.success) {
      return createRateLimitResponse(result);
    }

    const response = await handler(request, ...args);
    return addRateLimitHeaders(response, result);
  };
}
