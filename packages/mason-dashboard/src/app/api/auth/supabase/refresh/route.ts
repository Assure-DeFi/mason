import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/supabase/oauth';

/**
 * POST /api/auth/supabase/refresh
 *
 * Refreshes Supabase OAuth access token using refresh token.
 * Called by client when access token is about to expire.
 */
export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Missing refresh token' },
        { status: 400 },
      );
    }

    const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'OAuth not configured on server' },
        { status: 500 },
      );
    }

    const tokens = await refreshAccessToken({
      refreshToken,
      clientId,
      clientSecret,
    });

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
  } catch (err) {
    console.error('Token refresh failed:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Token refresh failed',
      },
      { status: 401 },
    );
  }
}
