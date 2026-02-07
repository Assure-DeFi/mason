/**
 * Shared API Route Middleware
 *
 * Eliminates boilerplate across API routes by providing composable wrappers
 * for common patterns: API key auth, session auth, Supabase credential
 * extraction, and error handling.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { getClientIp } from '@/lib/api/audit';
import { unauthorized, badRequest, serverError } from '@/lib/api-response';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import { authOptions } from '@/lib/auth/auth-options';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
  type RateLimitResult,
} from '@/lib/rate-limit/middleware';
import type { User } from '@/types/auth';

/**
 * Shared route params type for dynamic routes with [id] segment.
 * Use this instead of defining per-file.
 */
export interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Context provided to API key-authenticated route handlers
 */
export interface ApiKeyContext {
  user: User;
  rateLimitResult: RateLimitResult;
  request: Request;
}

/**
 * Context provided to session-authenticated route handlers
 */
export interface SessionContext {
  userId: string;
  request: Request;
}

/**
 * Context provided to session-authenticated routes that need user's Supabase
 */
export interface SessionWithSupabaseContext extends SessionContext {
  userSupabase: SupabaseClient;
}

/**
 * Validates that a URL is a legitimate Supabase URL (SSRF prevention)
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.supabase.co') && parsed.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

/**
 * Wraps an API route handler with API key authentication, rate limiting,
 * and error handling.
 *
 * Replaces ~25 lines of boilerplate per route:
 * - API key extraction from Authorization header
 * - API key validation
 * - Rate limiting with client IP
 * - Try/catch error handling
 *
 * @example
 * export const GET = withApiKeyAuth('backlog-next', async ({ user, rateLimitResult, request }) => {
 *   // handler code - user is already validated
 *   return addRateLimitHeaders(apiSuccess(data), rateLimitResult);
 * });
 */
export function withApiKeyAuth(
  rateLimitOperation: string,
  handler: (ctx: ApiKeyContext) => Promise<NextResponse>,
): (request: Request, routeCtx?: RouteParams) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      const authHeader = request.headers.get('Authorization');
      const apiKey = extractApiKeyFromHeader(authHeader);

      if (!apiKey) {
        return unauthorized('Missing or invalid Authorization header');
      }

      const user = await validateApiKey(apiKey);

      if (!user) {
        return unauthorized('Invalid API key');
      }

      const rateLimitId = getRateLimitIdentifier(
        rateLimitOperation,
        user.github_id,
        getClientIp(request) || 'unknown',
      );
      const rateLimitResult = await checkRateLimit(rateLimitId, 'standard');

      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult);
      }

      return await handler({ user, rateLimitResult, request });
    } catch (error) {
      console.error(`Error in ${rateLimitOperation}:`, error);
      return serverError();
    }
  };
}

/**
 * Wraps an API route handler with session authentication and error handling.
 *
 * Replaces ~8 lines of boilerplate per route:
 * - getServerSession call
 * - Session/user ID null check
 * - Try/catch error handling
 *
 * @example
 * export const GET = withSessionAuth(async ({ userId, request }) => {
 *   // handler code - userId is guaranteed non-null
 *   return apiSuccess(data);
 * });
 */
export function withSessionAuth(
  handler: (ctx: SessionContext) => Promise<NextResponse>,
): (request: Request, routeCtx?: RouteParams) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return unauthorized('Authentication required');
      }

      return await handler({ userId: session.user.id, request });
    } catch (error) {
      console.error('Session auth route error:', error);
      return serverError(
        error instanceof Error ? error.message : 'Internal server error',
      );
    }
  };
}

/**
 * Wraps an API route handler with session authentication AND user Supabase
 * credential extraction from headers.
 *
 * Replaces ~15 lines of boilerplate per route:
 * - getServerSession call
 * - Session/user ID null check
 * - x-supabase-url / x-supabase-anon-key header extraction
 * - Supabase URL validation (SSRF prevention)
 * - createClient with user credentials
 * - Try/catch error handling
 *
 * @example
 * export const GET = withSessionAndSupabase(async ({ userId, userSupabase, request }) => {
 *   const { data } = await userSupabase.from(TABLES.PM_BACKLOG_ITEMS).select('*');
 *   return apiSuccess(data);
 * });
 */
export function withSessionAndSupabase(
  handler: (ctx: SessionWithSupabaseContext) => Promise<NextResponse>,
): (request: Request, routeCtx?: RouteParams) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return unauthorized('Authentication required');
      }

      const supabaseUrl = request.headers.get('x-supabase-url');
      const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

      if (!supabaseUrl || !supabaseAnonKey) {
        return badRequest(
          'Database credentials required. Please complete setup.',
        );
      }

      if (!isValidSupabaseUrl(supabaseUrl)) {
        return badRequest('Invalid Supabase URL');
      }

      const userSupabase = createClient(supabaseUrl, supabaseAnonKey);

      return await handler({
        userId: session.user.id,
        userSupabase,
        request,
      });
    } catch (error) {
      console.error('Session+Supabase route error:', error);
      return serverError(
        error instanceof Error ? error.message : 'Internal server error',
      );
    }
  };
}
