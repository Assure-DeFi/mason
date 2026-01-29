import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
 */
export async function GET() {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI;

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
  const cookieStore = await cookies();

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
