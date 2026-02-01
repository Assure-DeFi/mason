import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { serverError } from '@/lib/api-response';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  OAUTH_COOKIES,
} from '@/lib/supabase/oauth';

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
 * Only allows known internal paths; rejects absolute URLs or protocol prefixes.
 */
function validateReturnTo(returnTo: string | null): string {
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
 * GET /api/auth/supabase/login
 *
 * Initiates Supabase OAuth flow with PKCE.
 * Generates code verifier/challenge, stores verifier in cookie,
 * and redirects to Supabase authorization endpoint.
 *
 * Optional query parameters:
 * - return_to: URL path to redirect to after OAuth callback (default: /setup)
 *              Only internal paths are allowed to prevent open redirect attacks.
 */
export async function GET(request: Request) {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI;

  // Get and validate return_to parameter (defaults to /setup, rejects external URLs)
  const url = new URL(request.url);
  const returnTo = validateReturnTo(url.searchParams.get('return_to'));

  if (!clientId || !redirectUri) {
    return serverError(
      'Supabase OAuth not configured. Please set SUPABASE_OAUTH_CLIENT_ID and NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT_URI environment variables',
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
