import { getServerSession } from 'next-auth';

import { apiSuccess, unauthorized, serverError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { isAdmin } from '@/lib/feature-flags';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/admin/stats - Lifetime platform stats (admin only)
 *
 * Returns active + deleted counts so admin can see total lifetime usage.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !isAdmin(session.user.github_email)) {
      return unauthorized();
    }

    const supabase = createServiceClient();

    const [usersResult, reposResult, statsResult] = await Promise.all([
      supabase
        .from(TABLES.USERS)
        .select('*', { count: 'exact', head: true }),
      supabase
        .from(TABLES.GITHUB_REPOSITORIES)
        .select('*', { count: 'exact', head: true }),
      supabase
        .from(TABLES.STATS)
        .select('deleted_users_count, deleted_repos_count, last_deletion_at')
        .eq('id', 'global')
        .single(),
    ]);

    const activeUsers = usersResult.count ?? 0;
    const activeRepos = reposResult.count ?? 0;
    const deletedUsers = statsResult.data?.deleted_users_count ?? 0;
    const deletedRepos = statsResult.data?.deleted_repos_count ?? 0;

    return apiSuccess({
      active_users: activeUsers,
      active_repos: activeRepos,
      deleted_users: deletedUsers,
      deleted_repos: deletedRepos,
      total_users_ever: activeUsers + deletedUsers,
      total_repos_ever: activeRepos + deletedRepos,
      last_deletion_at: statsResult.data?.last_deletion_at ?? null,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return serverError();
  }
}
