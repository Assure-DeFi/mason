/**
 * API Key Authentication Middleware
 *
 * Centralizes authentication logic for V1 API endpoints.
 * Handles: Bearer token extraction, API key validation, rate limiting, and error responses.
 */

import type { NextResponse } from 'next/server';

import { unauthorized, serverError } from '@/lib/api-response';
import type { RateLimitStrategy } from '@/lib/rate-limit/config';
import {
  checkRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
  getRateLimitIdentifier,
  type RateLimitResult,
} from '@/lib/rate-limit/middleware';
import type { User } from '@/types/auth';

import { extractApiKeyFromHeader, validateApiKey } from './api-key';

/**
 * Context passed to authenticated route handlers
 */
export interface AuthenticatedContext {
  /** Route params (e.g., { id: string } for dynamic routes) */
  params: Promise<Record<string, string>>;
}

/**
 * Additional auth context provided to the handler
 */
export interface ApiKeyAuthContext {
  /** The validated user from the API key */
  user: User;
  /** Rate limit result for adding headers to response */
  rateLimitResult: RateLimitResult;
  /** Client IP address extracted from request headers */
  clientIp: string;
}

/**
 * Options for configuring the API key auth middleware
 */
export interface WithApiKeyAuthOptions {
  /**
   * Rate limit strategy to apply
   * @default 'standard'
   */
  rateLimitStrategy?: RateLimitStrategy;

  /**
   * Operation name for rate limit identifier
   * Used to create unique rate limit keys per endpoint
   */
  rateLimitOperation: string;
}

/**
 * Type for route handlers wrapped with API key auth
 */
export type AuthenticatedHandler<TParams = Record<string, string>> = (
  request: Request,
  context: { params: Promise<TParams> },
  auth: ApiKeyAuthContext,
) => Promise<NextResponse>;

/**
 * Helper to extract client IP from request headers
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Higher-order function that wraps route handlers with API key authentication.
 *
 * Handles:
 * - Bearer token extraction from Authorization header
 * - API key validation via validateApiKey()
 * - Rate limiting with user context
 * - 401 error responses for auth failures
 * - Rate limit headers on successful responses
 *
 * @param handler - The route handler to wrap
 * @param options - Configuration options for auth and rate limiting
 * @returns Wrapped handler with authentication applied
 *
 * @example
 * ```typescript
 * export const POST = withApiKeyAuth(
 *   async (request, context, { user, rateLimitResult }) => {
 *     const { id } = await context.params;
 *     // Handler receives validated user, rate limit already applied
 *     const response = apiSuccess({ userId: user.id });
 *     return addRateLimitHeaders(response, rateLimitResult);
 *   },
 *   { rateLimitOperation: 'backlog-start' }
 * );
 * ```
 */
export function withApiKeyAuth<TParams = Record<string, string>>(
  handler: AuthenticatedHandler<TParams>,
  options: WithApiKeyAuthOptions,
): (
  request: Request,
  context: { params: Promise<TParams> },
) => Promise<NextResponse> {
  const { rateLimitStrategy = 'standard', rateLimitOperation } = options;

  return async (
    request: Request,
    context: { params: Promise<TParams> },
  ): Promise<NextResponse> => {
    try {
      // Extract and validate API key from Authorization header
      const authHeader = request.headers.get('Authorization');
      const apiKey = extractApiKeyFromHeader(authHeader);

      if (!apiKey) {
        return unauthorized('Missing or invalid Authorization header');
      }

      const user = await validateApiKey(apiKey);

      if (!user) {
        return unauthorized('Invalid API key');
      }

      // Extract client IP for rate limiting fallback
      const clientIp = getClientIp(request);

      // Rate limit check using validated user ID
      const rateLimitId = getRateLimitIdentifier(
        rateLimitOperation,
        user.github_id,
        clientIp,
      );
      const rateLimitResult = await checkRateLimit(rateLimitId, rateLimitStrategy);

      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult);
      }

      // Create auth context for handler
      const auth: ApiKeyAuthContext = {
        user,
        rateLimitResult,
        clientIp,
      };

      // Call the wrapped handler with auth context
      const response = await handler(request, context, auth);

      // Add rate limit headers to successful responses
      return addRateLimitHeaders(response, rateLimitResult);
    } catch (error) {
      console.error('API key auth middleware error:', error);
      return serverError();
    }
  };
}

/**
 * Convenience wrapper that uses 'standard' rate limiting strategy.
 * Equivalent to withApiKeyAuth(handler, { rateLimitOperation, rateLimitStrategy: 'standard' })
 */
export function withApiKeyAuthStandard<TParams = Record<string, string>>(
  handler: AuthenticatedHandler<TParams>,
  rateLimitOperation: string,
): (
  request: Request,
  context: { params: Promise<TParams> },
) => Promise<NextResponse> {
  return withApiKeyAuth(handler, {
    rateLimitOperation,
    rateLimitStrategy: 'standard',
  });
}

/**
 * Convenience wrapper that uses 'aiHeavy' rate limiting strategy.
 * Use for AI-intensive operations like PRD generation or code execution.
 */
export function withApiKeyAuthAiHeavy<TParams = Record<string, string>>(
  handler: AuthenticatedHandler<TParams>,
  rateLimitOperation: string,
): (
  request: Request,
  context: { params: Promise<TParams> },
) => Promise<NextResponse> {
  return withApiKeyAuth(handler, {
    rateLimitOperation,
    rateLimitStrategy: 'aiHeavy',
  });
}
