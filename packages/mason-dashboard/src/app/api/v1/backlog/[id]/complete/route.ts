import { withApiKeyAuth, type RouteParams } from '@/lib/api/middleware';
import { apiSuccess, badRequest, notFound, conflict } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';
import { addRateLimitHeaders } from '@/lib/rate-limit/middleware';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/v1/backlog/[id]/complete - Mark a backlog item as completed
 * Authorization: Bearer mason_xxxxx
 *
 * Request body:
 * - pr_url (required): The URL of the created pull request
 *
 * Validates:
 * - Item exists
 * - Item status is 'in_progress' (can only complete items that are in progress)
 *
 * Updates:
 * - status -> 'completed'
 * - pr_url -> provided value
 */
export async function POST(request: Request, { params }: RouteParams) {
  const handler = withApiKeyAuth(
    'backlog-complete',
    async ({ user, rateLimitResult }) => {
      // Get item ID from route params
      const { id: itemId } = await params;

      if (!itemId) {
        return badRequest('Missing item ID in URL');
      }

      // Parse request body
      let body: { pr_url?: string };
      try {
        body = await request.json();
      } catch {
        return badRequest('Invalid JSON in request body');
      }

      const { pr_url } = body;

      if (!pr_url || typeof pr_url !== 'string') {
        return badRequest('pr_url is required and must be a string');
      }

      // Basic URL validation
      try {
        new URL(pr_url);
      } catch {
        return badRequest('pr_url must be a valid URL');
      }

      const supabase = createServiceClient();

      // Atomic update: include status check in WHERE clause to prevent race conditions
      // SECURITY: Always filter by user_id to ensure data isolation
      const { data: updatedItem, error: updateError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({
          status: 'completed',
          pr_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .select()
        .single();

      // If no rows matched, either item doesn't exist or status changed
      if (updateError || !updatedItem) {
        const { data: currentItem } = await supabase
          .from(TABLES.PM_BACKLOG_ITEMS)
          .select('status')
          .eq('id', itemId)
          .eq('user_id', user.id)
          .single();

        if (!currentItem) {
          return notFound('Backlog item not found');
        }

        return conflict(
          `Cannot complete item: status is '${currentItem.status}', must be 'in_progress'`,
          { current_status: currentItem.status },
        );
      }

      const response = apiSuccess({
        item: {
          id: updatedItem.id,
          title: updatedItem.title,
          status: updatedItem.status,
          branch_name: updatedItem.branch_name,
          pr_url: updatedItem.pr_url,
        },
        message: `Item '${updatedItem.title}' completed successfully`,
      });
      return addRateLimitHeaders(response, rateLimitResult);
    },
  );

  return handler(request);
}
