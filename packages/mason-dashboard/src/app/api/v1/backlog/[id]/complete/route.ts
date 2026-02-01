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
 * - status → 'completed'
 * - pr_url → provided value
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
        `Cannot complete item: status is '${currentItem.status}', must be 'in_progress'`,
        { current_status: currentItem.status },
      );
    }

    return apiSuccess({
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        status: updatedItem.status,
        branch_name: updatedItem.branch_name,
        pr_url: updatedItem.pr_url,
      },
      message: `Item '${updatedItem.title}' completed successfully`,
    });
  } catch (error) {
    console.error('Error completing backlog item:', error);
    return serverError();
  }
}
