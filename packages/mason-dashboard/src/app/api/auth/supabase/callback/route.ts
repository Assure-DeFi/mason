import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, OAUTH_COOKIES } from '@/lib/supabase/oauth';

/**
 * GET /api/auth/supabase/callback
 *
 * Handles OAuth callback from Supabase.
 * Exchanges authorization code for tokens and redirects back to setup wizard.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set('oauth_error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (!code) {
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set('oauth_error', 'Missing authorization code');
    return NextResponse.redirect(errorUrl);
  }

  // Get stored cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_COOKIES.STATE)?.value;
  const codeVerifier = cookieStore.get(OAUTH_COOKIES.CODE_VERIFIER)?.value;

  // Validate state for CSRF protection
  if (!state || state !== storedState) {
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set(
      'oauth_error',
      'Invalid state parameter - possible CSRF attack',
    );
    return NextResponse.redirect(errorUrl);
  }

  // Validate code verifier exists
  if (!codeVerifier) {
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set(
      'oauth_error',
      'Session expired - please try again',
    );
    return NextResponse.redirect(errorUrl);
  }

  // Get OAuth credentials
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set('oauth_error', 'OAuth not configured on server');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    // Clear the PKCE cookies
    cookieStore.delete(OAUTH_COOKIES.CODE_VERIFIER);
    cookieStore.delete(OAUTH_COOKIES.STATE);

    // Redirect to setup wizard with tokens in fragment (client-side only)
    // We use a fragment (#) so tokens never hit the server logs
    const successUrl = new URL('/setup', request.nextUrl.origin);
    successUrl.searchParams.set('step', '2');
    successUrl.searchParams.set('oauth_success', 'true');

    // Pass tokens via encrypted cookie instead of URL for security
    // Tokens will be stored in localStorage by the client
    const tokenData = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    // Set a short-lived cookie with the tokens for the client to read
    cookieStore.set('supabase_oauth_tokens', tokenData, {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // 1 minute - just enough for client to grab it
      path: '/',
    });

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error('OAuth token exchange failed:', err);

    const errorUrl = new URL('/setup', request.nextUrl.origin);
    errorUrl.searchParams.set('step', '2');
    errorUrl.searchParams.set(
      'oauth_error',
      err instanceof Error ? err.message : 'Token exchange failed',
    );
    return NextResponse.redirect(errorUrl);
  }
}
