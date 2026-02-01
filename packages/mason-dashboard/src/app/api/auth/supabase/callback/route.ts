import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { exchangeCodeForTokens, OAUTH_COOKIES } from '@/lib/supabase/oauth';

/**
 * Allowed paths for post-OAuth redirect.
 * Only internal paths are permitted to prevent open redirect attacks.
 */
const ALLOWED_RETURN_PATHS = [
  '/setup',
  '/settings',
  '/admin',
  '/admin/backlog',
  '/admin/analytics',
];

/**
 * Validates and sanitizes the return_to parameter to prevent open redirect attacks.
 * Defense-in-depth: even if the cookie was somehow tampered, we validate here too.
 */
function validateReturnTo(returnTo: string | null | undefined): string {
  // Default to /setup if not provided
  if (!returnTo) {
    return '/setup';
  }

  // Reject if it contains protocol prefix (http://, https://, //, etc.)
  if (
    returnTo.includes('://') ||
    returnTo.startsWith('//') ||
    returnTo.startsWith('\\')
  ) {
    return '/setup';
  }

  // Must start with /
  if (!returnTo.startsWith('/')) {
    return '/setup';
  }

  // Check if it matches an allowed path (or starts with one for nested routes)
  const isAllowed = ALLOWED_RETURN_PATHS.some(
    (allowedPath) =>
      returnTo === allowedPath || returnTo.startsWith(allowedPath + '/'),
  );

  if (!isAllowed) {
    return '/setup';
  }

  return returnTo;
}

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
  const cookieStore = cookies();
  const storedState = cookieStore.get(OAUTH_COOKIES.STATE)?.value;
  const codeVerifier = cookieStore.get(OAUTH_COOKIES.CODE_VERIFIER)?.value;
  // Validate returnTo from cookie - defense in depth against cookie tampering
  const returnTo = validateReturnTo(
    cookieStore.get('supabase_oauth_return_to')?.value,
  );

  // Helper to build redirect URL based on returnTo
  const buildRedirectUrl = (path: string, params: Record<string, string>) => {
    const url = new URL(path, request.nextUrl.origin);
    // Only add step=2 for setup wizard
    if (path === '/setup') {
      url.searchParams.set('step', '2');
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url;
  };

  // Validate state for CSRF protection
  if (!state || state !== storedState) {
    const errorUrl = buildRedirectUrl(returnTo, {
      oauth_error: 'Invalid state parameter - possible CSRF attack',
    });
    return NextResponse.redirect(errorUrl);
  }

  // Validate code verifier exists
  if (!codeVerifier) {
    const errorUrl = buildRedirectUrl(returnTo, {
      oauth_error: 'Session expired - please try again',
    });
    return NextResponse.redirect(errorUrl);
  }

  // Get OAuth credentials
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const errorUrl = buildRedirectUrl(returnTo, {
      oauth_error: 'OAuth not configured on server',
    });
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

    // Clear the PKCE cookies and return_to
    cookieStore.delete(OAUTH_COOKIES.CODE_VERIFIER);
    cookieStore.delete(OAUTH_COOKIES.STATE);
    cookieStore.delete('supabase_oauth_return_to');

    // Redirect to the return URL with success flag
    // Tokens are passed via cookie for security (not in URL)
    const successUrl = buildRedirectUrl(returnTo, { oauth_success: 'true' });

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

    const errorUrl = buildRedirectUrl(returnTo, {
      oauth_error: err instanceof Error ? err.message : 'Token exchange failed',
    });
    return NextResponse.redirect(errorUrl);
  }
}
