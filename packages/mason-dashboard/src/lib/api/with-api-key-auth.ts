import { NextResponse } from 'next/server';

import { unauthorized, serverError } from '@/lib/api-response';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import {
  checkRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';
import type { RateLimitStrategy } from '@/lib/rate-limit/config';
import type { User } from '@/types/auth';

/**
 * Authenticated context passed to route handlers after API key validation.
 */
export interface AuthenticatedContext {
  /** The validated user associated with the API key */
  user: User;
  /** The rate limit result for adding headers to response */
  rateLimitResult: { limit: number; remaining: number; reset: number };
}

/**
 * Extract client IP from request headers (for rate limiting fallback)
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Higher-order function that wraps a Next.js API route handler with
 * API key authentication and rate limiting.
 *
 * Eliminates the 20-30 lines of auth/rate-limit boilerplate from each route.
 *
 * @param operationName - Unique name for rate limiting (e.g., 'backlog-fail')
 * @param handler - The route handler function that receives authenticated context
 * @param options - Optional configuration
 * @returns A Next.js-compatible route handler function
 *
 * @example
 * ```ts
 * export const POST = withApiKeyAuth('backlog-fail', async (request, context) => {
 *   const { user, rateLimitResult } = context;
 *   // Business logic here - auth is already validated
 *   const response = apiSuccess({ message: 'Done' });
 *   return addRateLimitHeaders(response, rateLimitResult);
 * });
 * ```
 */
export function withApiKeyAuth(
  operationName: string,
  handler: (
    request: Request,
    context: AuthenticatedContext,
    routeContext?: { params: Promise<Record<string, string>> },
  ) => Promise<NextResponse>,
  options?: {
    /** Rate limit strategy to apply. Defaults to 'standard'. */
    rateLimitStrategy?: RateLimitStrategy;
  },
) {
  const rateLimitStrategy = options?.rateLimitStrategy ?? 'standard';

  return async (
    request: Request,
    routeContext?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      // 1. Extract and validate API key
      const authHeader = request.headers.get('Authorization');
      const apiKey = extractApiKeyFromHeader(authHeader);

      if (!apiKey) {
        return unauthorized(
          'Missing or invalid Authorization header',
        ) as NextResponse;
      }

      const user = await validateApiKey(apiKey);

      if (!user) {
        return unauthorized('Invalid API key') as NextResponse;
      }

      // 2. Rate limit check using validated user ID
      const rateLimitId = getRateLimitIdentifier(
        operationName,
        user.github_id,
        getClientIp(request),
      );
      const rateLimitResult = await checkRateLimit(
        rateLimitId,
        rateLimitStrategy,
      );

      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult) as NextResponse;
      }

      // 3. Call the actual handler with authenticated context
      return await handler(
        request,
        { user, rateLimitResult },
        routeContext,
      );
    } catch (error) {
      console.error(`Error in ${operationName}:`, error);
      return serverError() as NextResponse;
    }
  };
}
