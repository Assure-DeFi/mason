/**
 * User Record Utilities
 *
 * Shared utility for creating/updating user records in the mason_users table.
 * Used by SupabaseConnectStep (after DB setup) and RepoStep (as fallback).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/constants';

export interface GitHubUserInfo {
  github_id: string;
  github_username: string;
  github_email?: string | null;
  github_avatar_url?: string | null;
}

/**
 * Create or update a user record in the mason_users table.
 * Uses upsert to handle both new users and returning users.
 *
 * @param client - Supabase client configured for the user's database
 * @param githubUser - GitHub user information from the session
 * @returns Success status and optional error message
 */
export async function createMasonUserRecord(
  client: SupabaseClient,
  githubUser: GitHubUserInfo,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await client.from(TABLES.USERS).upsert(
      {
        github_id: githubUser.github_id,
        github_username: githubUser.github_username,
        github_email: githubUser.github_email ?? null,
        github_avatar_url: githubUser.github_avatar_url ?? null,
        is_active: true,
      },
      { onConflict: 'github_id' },
    );

    if (error) {
      console.error('Error creating user record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating user record:', err);
    return { success: false, error: message };
  }
}

/**
 * Check if a user record exists in the mason_users table.
 *
 * @param client - Supabase client configured for the user's database
 * @param githubId - GitHub user ID to check
 * @returns Whether the user record exists
 */
export async function checkUserRecordExists(
  client: SupabaseClient,
  githubId: string,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from(TABLES.USERS)
      .select('id')
      .eq('github_id', githubId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
