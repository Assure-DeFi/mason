import type { NextRequest } from 'next/server';

import { createApiLogger } from '@/lib/api/logger';
import {
  apiSuccess,
  unauthorized,
  badRequest,
  serverError,
} from '@/lib/api-response';
import { refreshAccessToken } from '@/lib/supabase/oauth';

/**
 * POST /api/auth/supabase/refresh
 *
 * Refreshes Supabase OAuth access token using refresh token.
 * Called by client when access token is about to expire.
 */
export async function POST(request: NextRequest) {
  const logger = createApiLogger('auth.supabase.refresh');
  try {
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
    logger.error('Token refresh failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return unauthorized(
      err instanceof Error ? err.message : 'Token refresh failed',
    );
  }
}
