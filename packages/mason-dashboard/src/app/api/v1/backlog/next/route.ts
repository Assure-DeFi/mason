import { withApiKeyAuth } from '@/lib/api/middleware';
import { apiSuccess, serverError } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';
import { addRateLimitHeaders } from '@/lib/rate-limit/middleware';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/v1/backlog/next - Get the highest-priority approved backlog items
 * Authorization: Bearer mason_xxxxx
 *
 * Query params:
 * - repository_id (optional): Filter by specific repository
 * - limit (optional): Maximum number of items to return (no limit if omitted)
 *
 * Returns the approved item(s) with highest priority score, ready for execution.
 */
export const GET = withApiKeyAuth(
  'backlog-next',
  async ({ user, rateLimitResult, request }) => {
    // Parse query parameters
    const url = new URL(request.url);
    const repositoryId = url.searchParams.get('repository_id');
    const limitParam = url.searchParams.get('limit');
    // If no limit specified, fetch all approved items (no cap)
    const limit = limitParam
      ? Math.max(parseInt(limitParam, 10), 1)
      : undefined;

    const supabase = createServiceClient();

    // Build query for approved items ordered by priority
    // SECURITY: Always filter by user_id to ensure data isolation
    let query = supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select(
        `
        id,
        title,
        problem,
        solution,
        area,
        type,
        complexity,
        impact_score,
        effort_score,
        priority_score,
        benefits_json,
        status,
        branch_name,
        pr_url,
        prd_content,
        analysis_run_id,
        repository_id,
        created_at,
        updated_at
      `,
      )
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('priority_score', { ascending: false });

    // Apply limit only if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Filter by repository if specified
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch next backlog item:', error);
      return serverError('Failed to fetch backlog items');
    }

    // No approved items found
    if (!data || data.length === 0) {
      return apiSuccess({
        items: [],
        message: 'No approved items available for execution',
      });
    }

    // Transform benefits_json to benefits array for consistency
    const items = data.map((item) => ({
      ...item,
      benefits: item.benefits_json || [],
    }));

    // Return single item or array based on limit
    if (limit === 1) {
      const response = apiSuccess({
        item: items[0],
        total_approved: data.length,
      });
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const response = apiSuccess({
      items,
      count: items.length,
    });
    return addRateLimitHeaders(response, rateLimitResult);
  },
);
