/**
 * Supabase OAuth Utilities
 *
 * Handles OAuth 2.0 Authorization Code flow with PKCE for Supabase Management API.
 * Enables single-click database setup without manual credential entry.
 */

import { STORAGE_KEYS } from '@/lib/constants';

// OAuth Configuration
export const SUPABASE_OAUTH_CONFIG = {
  authorizationEndpoint: 'https://api.supabase.com/v1/oauth/authorize',
  tokenEndpoint: 'https://api.supabase.com/v1/oauth/token',
  scopes: ['database:write', 'api-keys:read', 'projects:read'],
} as const;

// Cookie names for OAuth state
export const OAUTH_COOKIES = {
  CODE_VERIFIER: 'supabase_oauth_code_verifier',
  STATE: 'supabase_oauth_state',
} as const;

/**
 * Supabase OAuth token response
 */
export interface SupabaseOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Stored OAuth session
 */
export interface SupabaseOAuthSession {
  tokens: SupabaseOAuthTokens;
  selectedProjectRef?: string;
  selectedProjectName?: string;
}

// =============================================================================
// PKCE Utilities
// =============================================================================

/**
 * Generate a cryptographically random code verifier for PKCE
 * @returns Base64 URL-encoded random string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns Base64 URL-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

/**
 * Generate a random state parameter for CSRF protection
 * @returns Base64 URL-encoded random string
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64 URL encode a Uint8Array (RFC 4648)
 */
function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(array)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// =============================================================================
// Token Storage (Browser-side)
// =============================================================================

/**
 * Save Supabase OAuth session to localStorage
 */
export function saveOAuthSession(session: SupabaseOAuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    STORAGE_KEYS.SUPABASE_OAUTH_SESSION,
    JSON.stringify(session),
  );
}

/**
 * Get Supabase OAuth session from localStorage
 */
export function getOAuthSession(): SupabaseOAuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SUPABASE_OAUTH_SESSION);
    if (!stored) return null;
    return JSON.parse(stored) as SupabaseOAuthSession;
  } catch {
    return null;
  }
}

/**
 * Clear Supabase OAuth session from localStorage
 */
export function clearOAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_OAUTH_SESSION);
}

/**
 * Check if we have a valid (non-expired) OAuth session
 */
export function hasValidOAuthSession(): boolean {
  const session = getOAuthSession();
  if (!session?.tokens) return false;

  // Check if token is expired (with 5 minute buffer)
  const bufferMs = 5 * 60 * 1000;
  return session.tokens.expiresAt > Date.now() + bufferMs;
}

/**
 * Get the current access token, or null if expired
 */
export function getAccessToken(): string | null {
  const session = getOAuthSession();
  if (!session?.tokens) return null;

  // Check if token is expired (with 1 minute buffer)
  const bufferMs = 60 * 1000;
  if (session.tokens.expiresAt <= Date.now() + bufferMs) {
    return null;
  }

  return session.tokens.accessToken;
}

/**
 * Get the current refresh token
 */
export function getRefreshToken(): string | null {
  const session = getOAuthSession();
  return session?.tokens?.refreshToken ?? null;
}

/**
 * Update tokens in the existing session
 */
export function updateTokens(tokens: SupabaseOAuthTokens): void {
  const session = getOAuthSession();
  if (session) {
    saveOAuthSession({ ...session, tokens });
  } else {
    saveOAuthSession({ tokens });
  }
}

/**
 * Set the selected project in the OAuth session
 */
export function setSelectedProject(
  projectRef: string,
  projectName: string,
): void {
  const session = getOAuthSession();
  if (session) {
    saveOAuthSession({
      ...session,
      selectedProjectRef: projectRef,
      selectedProjectName: projectName,
    });
  }
}

/**
 * Get the selected project from the OAuth session
 */
export function getSelectedProject(): { ref: string; name: string } | null {
  const session = getOAuthSession();
  if (!session?.selectedProjectRef || !session?.selectedProjectName) {
    return null;
  }
  return {
    ref: session.selectedProjectRef,
    name: session.selectedProjectName,
  };
}

// =============================================================================
// OAuth URL Construction
// =============================================================================

/**
 * Build the OAuth authorization URL
 * @param clientId Supabase OAuth Client ID
 * @param redirectUri Callback URL
 * @param codeChallenge PKCE code challenge
 * @param state CSRF state parameter
 * @returns Full authorization URL
 */
export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  const url = new URL(SUPABASE_OAUTH_CONFIG.authorizationEndpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SUPABASE_OAUTH_CONFIG.scopes.join(' '));
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url.toString();
}

// =============================================================================
// Token Exchange (Server-side use)
// =============================================================================

export interface TokenExchangeParams {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Exchange authorization code for tokens (call from server-side only)
 */
export async function exchangeCodeForTokens(
  params: TokenExchangeParams,
): Promise<SupabaseOAuthTokens> {
  const response = await fetch(SUPABASE_OAUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error_description ||
        errorData.error ||
        'Failed to exchange code for tokens',
    );
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // expires_in is in seconds, convert to absolute timestamp
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export interface RefreshTokenParams {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Refresh access token using refresh token (call from server-side only)
 */
export async function refreshAccessToken(
  params: RefreshTokenParams,
): Promise<SupabaseOAuthTokens> {
  const response = await fetch(SUPABASE_OAUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error_description ||
        errorData.error ||
        'Failed to refresh token',
    );
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
