import { cookies } from 'next/headers';

import { apiSuccess, badRequest } from '@/lib/api-response';

/**
 * GET /api/auth/supabase/session
 *
 * Reads the httpOnly OAuth token cookie server-side and returns the tokens
 * in the JSON response body. This eliminates client-side document.cookie access
 * to sensitive tokens while still allowing the client to store them for
 * subsequent API proxy calls.
 *
 * The cookie is cleared after reading (one-time use).
 */
export async function GET() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('supabase_oauth_tokens');

  if (!tokenCookie?.value) {
    return badRequest('No OAuth session available');
  }

  try {
    const tokenData = JSON.parse(tokenCookie.value);

    // Clear the cookie immediately (one-time use)
    cookieStore.delete('supabase_oauth_tokens');

    return apiSuccess({ tokens: tokenData });
  } catch {
    // Clear malformed cookie
    cookieStore.delete('supabase_oauth_tokens');
    return badRequest('Invalid OAuth session data');
  }
}
