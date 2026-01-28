/**
 * User Database Helper
 *
 * Creates Supabase clients for user's own database using credentials stored in mason_users.
 * This implements the BYOD (Bring Your Own Database) architecture where:
 * - User's backlog data is stored in THEIR Supabase, not the platform's
 * - Platform owner has no access to user's data
 * - CLI submissions go directly to user's database
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from './client';

interface UserSupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

/**
 * Get a user's Supabase configuration from the central database
 * @param userId - The user's UUID from mason_users table
 */
export async function getUserSupabaseConfig(
  userId: string,
): Promise<UserSupabaseConfig | null> {
  const centralDb = createServiceClient();

  const { data: user, error } = await centralDb
    .from('mason_users')
    .select('supabase_url, supabase_anon_key, supabase_service_role_key')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Failed to get user Supabase config:', error);
    return null;
  }

  if (!user.supabase_url || !user.supabase_service_role_key) {
    return null;
  }

  return {
    url: user.supabase_url,
    anonKey: user.supabase_anon_key ?? '',
    serviceRoleKey: user.supabase_service_role_key,
  };
}

/**
 * Create a Supabase client for the user's database using their service role key
 * Bypasses RLS - use for API operations that need full access
 *
 * @param userId - The user's UUID
 * @returns Supabase client or null if not configured
 */
export async function createUserDatabaseClient(
  userId: string,
): Promise<SupabaseClient | null> {
  const config = await getUserSupabaseConfig(userId);

  if (!config) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client for the user's database using their anon key
 * Uses RLS - for operations that should respect row-level security
 *
 * @param userId - The user's UUID
 * @returns Supabase client or null if not configured
 */
export async function createUserDatabaseAnonClient(
  userId: string,
): Promise<SupabaseClient | null> {
  const config = await getUserSupabaseConfig(userId);

  if (!config || !config.anonKey) {
    return null;
  }

  return createClient(config.url, config.anonKey);
}

/**
 * Check if a user has configured their own Supabase database
 *
 * @param userId - The user's UUID
 * @returns true if configured, false otherwise
 */
export async function hasUserDatabase(userId: string): Promise<boolean> {
  const config = await getUserSupabaseConfig(userId);
  return config !== null;
}

/**
 * Test connection to user's Supabase database
 *
 * @param url - Supabase URL
 * @param serviceRoleKey - Service role key
 * @returns Connection test result
 */
export async function testUserDatabaseConnection(
  url: string,
  serviceRoleKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try to query the mason_users table
    const { error } = await client.from('mason_users').select('count').limit(1);

    if (error) {
      // 42P01 means table doesn't exist - connection works but tables not created
      if (error.code === '42P01') {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
