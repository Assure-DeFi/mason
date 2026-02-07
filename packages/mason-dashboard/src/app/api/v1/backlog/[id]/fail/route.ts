import { withApiKeyAuth, type RouteParams } from '@/lib/api/middleware';
import { apiSuccess, badRequest, notFound, conflict } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';
import { addRateLimitHeaders } from '@/lib/rate-limit/middleware';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/v1/backlog/[id]/fail - Mark a backlog item as failed
 * Authorization: Bearer mason_xxxxx
 *
 * Request body:
 * - error_message (optional): Description of what went wrong
 *
 * Validates:
 * - Item exists
 * - Item status is 'in_progress' (can only fail items that are in progress)
 *
 * Updates:
 * - status -> 'rejected' (used as 'failed' status)
 *
 * Note: The database uses 'rejected' status for failed items.
 * The error_message is stored in a separate field if available,
 * or we could add it to the item's metadata.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const handler = withApiKeyAuth(
    'backlog-fail',
    async ({ user, rateLimitResult }) => {
      // Get item ID from route params
      const { id: itemId } = await params;

      if (!itemId) {
        return badRequest('Missing item ID in URL');
      }

      // Parse request body (optional)
      let body: { error_message?: string } = {};
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch {
        // Body is optional, ignore parse errors
      }

      const { error_message } = body;

      const supabase = createServiceClient();

      // Build update data
      // Note: We use 'rejected' as the status since the schema doesn't have 'failed'
      const updateData: Record<string, unknown> = {
        status: 'rejected',
        updated_at: new Date().toISOString(),
      };

      // Store error message in solution field with prefix (hacky but works without migration)
      if (error_message) {
        updateData.solution = `[EXECUTION FAILED: ${error_message}]`;
      }

      // Atomic update: include status check in WHERE clause to prevent race conditions
      // SECURITY: Always filter by user_id to ensure data isolation
      const { data: updatedItem, error: updateError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update(updateData)
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
          `Cannot fail item: status is '${currentItem.status}', must be 'in_progress'`,
          { current_status: currentItem.status },
        );
      }

      const response = apiSuccess({
        item: {
          id: updatedItem.id,
          title: updatedItem.title,
          status: 'failed',
          branch_name: updatedItem.branch_name,
          error_message: error_message || null,
        },
        message: error_message
          ? `Item '${updatedItem.title}' marked as failed: ${error_message}`
          : `Item '${updatedItem.title}' marked as failed`,
      });
      return addRateLimitHeaders(response, rateLimitResult);
    },
  );

  return handler(request);
}
