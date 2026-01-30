import { NextResponse } from 'next/server';

import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
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
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      );
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get item ID from route params
    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing item ID in URL' },
        { status: 400 },
      );
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

    // First, verify the item exists, belongs to this user, and is in 'in_progress' status
    // SECURITY: Always filter by user_id to ensure data isolation
    const { data: existingItem, error: fetchError } = await supabase
      .from('mason_pm_backlog_items')
      .select('id, status, title, branch_name')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: 'Backlog item not found' },
        { status: 404 },
      );
    }

    // Validate status transition - can fail items that are in_progress
    if (existingItem.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: `Cannot fail item: status is '${existingItem.status}', must be 'in_progress'`,
          current_status: existingItem.status,
        },
        { status: 400 },
      );
    }

    // Update the item to failed status
    // Note: We use 'rejected' as the status since the schema doesn't have 'failed'
    // The error_message can be stored in a comment or we can use the solution field
    // For now, we'll keep it simple and just update the status
    const updateData: Record<string, unknown> = {
      status: 'rejected', // Maps to 'failed' conceptually
      updated_at: new Date().toISOString(),
    };

    // Store error message in solution field with prefix (hacky but works without migration)
    // A better approach would be to add an error_message column
    if (error_message) {
      // We'll prepend the error to the solution for now
      // TODO: Add proper error_message column in future migration
      updateData.solution = `[EXECUTION FAILED: ${error_message}]\n\n${existingItem.title}`;
    }

    // SECURITY: Include user_id in update filter
    const { data: updatedItem, error: updateError } = await supabase
      .from('mason_pm_backlog_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to mark backlog item as failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update backlog item' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
