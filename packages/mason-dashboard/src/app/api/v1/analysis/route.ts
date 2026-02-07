import { withApiKeyAuth } from '@/lib/api/middleware';
import { apiSuccess } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';
import { addRateLimitHeaders } from '@/lib/rate-limit/middleware';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/v1/analysis/validate - Validate API key and return user info
 * Authorization: Bearer mason_xxxxx
 *
 * PRIVACY ARCHITECTURE:
 * - This endpoint ONLY validates the API key
 * - It does NOT receive or store any analysis data
 * - The CLI writes data directly to the user's Supabase using their credentials
 * - Central server never sees the user's backlog items
 */
export const POST = withApiKeyAuth(
  'api-validate',
  async ({ user, rateLimitResult }) => {
    // Fetch user's connected repositories for multi-repo support
    const supabase = createServiceClient();
    const { data: repositories } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .select('id, github_full_name, github_clone_url, github_html_url')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Construct dashboard URL
    const dashboardUrl =
      process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://mason.assuredefi.com';

    // Return validation success with user info and connected repositories
    // The CLI will use this to confirm identity before writing to their own Supabase
    // Repositories are included so CLI can match current git remote to get repository_id
    const response = apiSuccess({
      valid: true,
      user_id: user.id,
      github_username: user.github_username,
      dashboard_url: `${dashboardUrl}/admin/backlog`,
      repositories: repositories || [],
    });

    return addRateLimitHeaders(response, rateLimitResult);
  },
);
