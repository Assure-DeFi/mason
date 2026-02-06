import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';
import { refreshAccessToken } from '@/lib/supabase/oauth';

/**
 * POST /api/auth/supabase/refresh
 *
 * Refreshes Supabase OAuth access token using refresh token.
 * Called by client when access token is about to expire.
 *
 * Rate limited: 5 requests per hour per user (uses 'strict' strategy)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.warn('Unauthenticated token refresh attempt');
      return unauthorized();
    }

    // Rate limit token refresh to prevent abuse (5 per hour via 'strict' strategy)
    const identifier = getRateLimitIdentifier(
      'token-refresh',
      session.user.id,
    );
    const rateLimit = await checkRateLimit(identifier, 'strict');
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return badRequest('Missing refresh token');
    }

    const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return serverError('OAuth not configured on server');
    }

    const tokens = await refreshAccessToken({
      refreshToken,
      clientId,
      clientSecret,
    });

    return apiSuccess({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
  } catch (err) {
    console.error('Token refresh failed:', err);
    return unauthorized(
      err instanceof Error ? err.message : 'Token refresh failed',
    );
  }
}
