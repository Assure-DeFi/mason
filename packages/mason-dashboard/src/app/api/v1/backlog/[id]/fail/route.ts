import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  conflict,
  serverError,
} from '@/lib/api-response';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import { TABLES } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * - status → 'rejected' (used as 'failed' status)
 *
 * Note: The database uses 'rejected' status for failed items.
 * The error_message is stored in a separate field if available,
 * or we could add it to the item's metadata.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Extract and validate API key
    const authHeader = request.headers.get('Authorization');
    const apiKey = extractApiKeyFromHeader(authHeader);

    if (!apiKey) {
      return unauthorized('Missing or invalid Authorization header');
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return unauthorized('Invalid API key');
    }

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
      status: 'rejected', // Maps to 'failed' conceptually
      updated_at: new Date().toISOString(),
    };

    // Store error message in solution field with prefix (hacky but works without migration)
    // A better approach would be to add an error_message column
    if (error_message) {
      // We'll prepend the error to the solution for now
      // TODO: Add proper error_message column in future migration
      updateData.solution = `[EXECUTION FAILED: ${error_message}]`;
    }

    // Atomic update: include status check in WHERE clause to prevent race conditions
    // SECURITY: Always filter by user_id to ensure data isolation
    const { data: updatedItem, error: updateError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update(updateData)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress') // Only update if status is still 'in_progress'
      .select()
      .single();

    // If no rows matched, either item doesn't exist or status changed
    if (updateError || !updatedItem) {
      // Fetch current status to provide helpful error
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

    return apiSuccess({
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        status: 'failed', // Return 'failed' to the client even though DB stores 'rejected'
        branch_name: updatedItem.branch_name,
        error_message: error_message || null,
      },
      message: error_message
        ? `Item '${updatedItem.title}' marked as failed: ${error_message}`
        : `Item '${updatedItem.title}' marked as failed`,
    });
  } catch (error) {
    console.error('Error failing backlog item:', error);
    return serverError();
  }
}
