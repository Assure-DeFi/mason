/**
 * User Supabase Client
 *
 * Creates Supabase clients from user-provided credentials stored in localStorage.
 * This enables the fully private architecture where users bring their own database.
 *
 * Privacy Model:
 * - Mason UI is hosted by Assure DeFi
 * - All user data stays in the user's own Supabase database
 * - Assure DeFi has zero access to user data
 *
 * Supports both:
 * 1. OAuth flow (new) - credentials obtained automatically via Supabase OAuth
 * 2. Manual entry (legacy) - credentials entered manually by user
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_KEYS, TABLES } from '@/lib/constants';
import { clearOAuthSession } from './oauth';

export interface MasonConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  setupComplete: boolean;
}

let _userClient: SupabaseClient | null = null;
let _userServiceClient: SupabaseClient | null = null;
let _cachedConfig: MasonConfig | null = null;

/**
 * Get the Mason config from localStorage
 */
export function getMasonConfig(): MasonConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (_cachedConfig) {
    return _cachedConfig;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!stored) {
      return null;
    }
    _cachedConfig = JSON.parse(stored) as MasonConfig;
    return _cachedConfig;
  } catch {
    return null;
  }
}

/**
 * Save the Mason config to localStorage
 */
export function saveMasonConfig(config: MasonConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  _cachedConfig = config;
  _userClient = null;
  _userServiceClient = null;
}

/**
 * Clear the Mason config from localStorage
 * Also clears OAuth session for complete cleanup
 */
export function clearMasonConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  clearOAuthSession();
  _cachedConfig = null;
  _userClient = null;
  _userServiceClient = null;
}

/**
 * Check if the user has configured their Supabase connection
 */
export function hasUserDatabase(): boolean {
  const config = getMasonConfig();
  return Boolean(config?.supabaseUrl && config?.supabaseAnonKey);
}

/**
 * Check if setup is complete
 */
export function isSetupComplete(): boolean {
  const config = getMasonConfig();
  return Boolean(config?.setupComplete);
}

/**
 * Get a Supabase client configured with the user's credentials.
 * Uses the anon key (RLS-enforced).
 */
export function getUserSupabase(): SupabaseClient {
  const config = getMasonConfig();

  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error(
      'User Supabase not configured. Please complete the setup wizard.',
    );
  }

  if (!_userClient) {
    _userClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  return _userClient;
}

/**
 * Get a service role Supabase client for the user's database.
 * Bypasses RLS - use only for migrations and admin operations during setup.
 */
export function getUserServiceSupabase(): SupabaseClient {
  const config = getMasonConfig();

  if (!config?.supabaseUrl) {
    throw new Error(
      'User Supabase URL not configured. Please complete the setup wizard.',
    );
  }

  if (!config?.supabaseServiceKey) {
    throw new Error(
      'User Supabase service key not configured. Required for migrations.',
    );
  }

  if (!_userServiceClient) {
    _userServiceClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return _userServiceClient;
}

/**
 * Test connection to user's Supabase database
 * This validates that the URL and key are correct, regardless of whether tables exist
 */
export async function testUserConnection(
  url: string,
  anonKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, anonKey);

    // Try to query any table - we don't care if it exists or not
    // We just want to verify the credentials are valid
    const { error } = await client.from(TABLES.USERS).select('count').limit(1);

    if (error) {
      // Table doesn't exist - that's fine, connection still works
      // PostgREST returns different error codes/messages for missing tables:
      // - '42P01' (PostgreSQL error code)
      // - 'PGRST200' (PostgREST schema cache error)
      // - Message containing "Could not find the table"
      const isTableMissing =
        error.code === '42P01' ||
        error.code === 'PGRST200' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist');

      if (isTableMissing) {
        return { success: true }; // Connection works, tables just need to be created
      }

      // Check for auth errors which indicate bad credentials
      if (
        error.message?.includes('Invalid API key') ||
        error.message?.includes('JWT') ||
        error.code === 'PGRST301'
      ) {
        return { success: false, error: 'Invalid API key' };
      }

      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';

    // Network errors or invalid URL
    if (message.includes('fetch') || message.includes('network')) {
      return {
        success: false,
        error: 'Could not connect to Supabase. Check your URL.',
      };
    }

    return { success: false, error: message };
  }
}

/**
 * Check if the required tables exist in the user's database
 */
export async function checkTablesExist(
  url: string,
  serviceKey: string,
): Promise<{ exists: boolean; missing: string[] }> {
  const requiredTables = [
    TABLES.USERS,
    TABLES.API_KEYS,
    TABLES.GITHUB_REPOSITORIES,
    TABLES.PM_BACKLOG_ITEMS,
    TABLES.PM_ANALYSIS_RUNS,
    TABLES.REMOTE_EXECUTION_RUNS,
    TABLES.EXECUTION_LOGS,
  ];

  const missing: string[] = [];

  try {
    const client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    for (const table of requiredTables) {
      const { error } = await client.from(table).select('*').limit(1);

      if (error) {
        // Check for various "table not found" error patterns
        const isTableMissing =
          error.code === '42P01' ||
          error.code === 'PGRST200' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist');

        if (isTableMissing) {
          missing.push(table);
        }
      }
    }

    return { exists: missing.length === 0, missing };
  } catch (err) {
    return {
      exists: false,
      missing: requiredTables,
    };
  }
}

/**
 * Clear cached clients (useful when credentials change)
 */
export function clearUserClients(): void {
  _userClient = null;
  _userServiceClient = null;
  _cachedConfig = null;
}

// =============================================================================
// GitHub Token Management (Browser-Only Storage)
// =============================================================================

/**
 * Get the GitHub access token from localStorage
 * Privacy: This token is NEVER sent to or stored on the central server
 */
export function getGitHubToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Save the GitHub access token to localStorage
 * Privacy: This token stays in the browser only
 */
export function saveGitHubToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token);
}

/**
 * Clear the GitHub access token from localStorage
 */
export function clearGitHubToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
}

/**
 * Check if a GitHub token is stored
 */
export function hasGitHubToken(): boolean {
  return Boolean(getGitHubToken());
}
