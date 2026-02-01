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
 * POST /api/v1/backlog/[id]/start - Mark a backlog item as in_progress
 * Authorization: Bearer mason_xxxxx
 *
 * Request body:
 * - branch_name (required): The git branch name for this work
 *
 * Validates:
 * - Item exists
 * - Item status is 'approved' (can only start approved items)
 *
 * Updates:
 * - status → 'in_progress'
 * - branch_name → provided value
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
    let body: { branch_name?: string };
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const { branch_name } = body;

    if (!branch_name || typeof branch_name !== 'string') {
      return badRequest('branch_name is required and must be a string');
    }

    const supabase = createServiceClient();

    // Atomic update: include status check in WHERE clause to prevent race conditions
    // SECURITY: Always filter by user_id to ensure data isolation
    const { data: updatedItem, error: updateError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({
        status: 'in_progress',
        branch_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', user.id)
      .eq('status', 'approved') // Only update if status is still 'approved'
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
        `Cannot start item: status is '${currentItem.status}', must be 'approved'`,
        { current_status: currentItem.status },
      );
    }

    return apiSuccess({
      item: {
        id: updatedItem.id,
        title: updatedItem.title,
        status: updatedItem.status,
        branch_name: updatedItem.branch_name,
      },
      message: `Item '${updatedItem.title}' is now in progress`,
    });
  } catch (error) {
    console.error('Error starting backlog item:', error);
    return serverError();
  }
}
