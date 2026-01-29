import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  OAUTH_COOKIES,
} from '@/lib/supabase/oauth';

/**
 * GET /api/auth/supabase/login
 *
 * Initiates Supabase OAuth flow with PKCE.
 * Generates code verifier/challenge, stores verifier in cookie,
 * and redirects to Supabase authorization endpoint.
 *
 * Optional query parameters:
 * - return_to: URL path to redirect to after OAuth callback (default: /setup)
 */
export async function GET(request: Request) {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI;

  // Get optional return_to parameter (defaults to /setup)
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/setup';

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'Supabase OAuth not configured',
        message:
          'Please set SUPABASE_OAUTH_CLIENT_ID and NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI environment variables',
      },
      { status: 500 },
    );
  }

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store code verifier and state in secure httpOnly cookies
  const cookieStore = cookies();

  // Code verifier cookie - needed for token exchange
  cookieStore.set(OAUTH_COOKIES.CODE_VERIFIER, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  // State cookie - for CSRF protection
  cookieStore.set(OAUTH_COOKIES.STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  // Store return_to path for callback redirect
  cookieStore.set('supabase_oauth_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  // Build authorization URL
  const authUrl = buildAuthorizationUrl(
    clientId,
    redirectUri,
    codeChallenge,
    state,
  );

  // Redirect to Supabase OAuth consent screen
  return NextResponse.redirect(authUrl);
}
