import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  apiError,
  unauthorized,
  serverError,
  ErrorCodes,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { accountDeleteSchema, validateRequest } from '@/lib/schemas';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/account/delete - Delete user account from central database
 *
 * Requires explicit confirmation to prevent accidental deletion.
 * Body must contain: { confirmation: "DELETE MY ACCOUNT" }
 *
 * Before deleting, increments lifetime counters on mason_stats so the admin
 * can always answer "how many users/repos have ever used Mason" even after
 * all PII is wiped. Formula:
 *   total_users_ever  = SELECT count(*) FROM mason_users + stats.deleted_users_count
 *   total_repos_ever  = SELECT count(*) FROM mason_github_repositories + stats.deleted_repos_count
 *
 * This deletes the user from the central Mason database.
 * Cascading deletes handle mason_github_repositories.
 *
 * Note: API keys and all user data live in the user's own Supabase database
 * (per privacy architecture) and must be deleted separately by the client
 * before calling this endpoint, as we don't store their credentials server-side.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    // Require explicit confirmation to proceed
    const validation = await validateRequest(request, accountDeleteSchema);
    if (!validation.success) {
      return validation.error;
    }

    const supabase = createServiceClient();

    // Log deletion attempt for audit trail
    console.log(
      `Account deletion initiated for user ${session.user.id} at ${new Date().toISOString()}`,
    );

    // Increment lifetime stats BEFORE cascade delete wipes the repos
    // Best-effort: don't block deletion if stats table doesn't exist yet
    try {
      const { count: repoCount } = await supabase
        .from(TABLES.GITHUB_REPOSITORIES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { data: currentStats } = await supabase
        .from(TABLES.STATS)
        .select('deleted_users_count, deleted_repos_count')
        .eq('id', 'global')
        .single();

      await supabase.from(TABLES.STATS).upsert({
        id: 'global',
        deleted_users_count: (currentStats?.deleted_users_count ?? 0) + 1,
        deleted_repos_count:
          (currentStats?.deleted_repos_count ?? 0) + (repoCount ?? 0),
        last_deletion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (statsError) {
      // Stats tracking is best-effort - never block account deletion
      console.warn('Failed to update lifetime stats:', statsError);
    }

    // Delete user from central database
    // Foreign key constraints with ON DELETE CASCADE will handle:
    // - mason_github_repositories
    // Note: API keys live in user's own Supabase (not central DB)
    const { error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq('id', session.user.id);

    if (error) {
      console.error('Failed to delete user from central DB:', error);
      return serverError('Failed to delete account from central database');
    }

    console.log(
      `Account deleted successfully for user ${session.user.id} at ${new Date().toISOString()}`,
    );
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return serverError();
  }
}

/**
 * DELETE /api/account/delete - Legacy endpoint (deprecated)
 *
 * Returns 405 Method Not Allowed with instructions to use POST.
 * Kept for backward compatibility guidance.
 */
export async function DELETE() {
  return apiError(
    ErrorCodes.BAD_REQUEST,
    'Account deletion now requires explicit confirmation. Use POST with body: { "confirmation": "DELETE MY ACCOUNT" }',
    405,
  );
}
