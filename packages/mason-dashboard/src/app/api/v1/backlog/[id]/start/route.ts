import { NextResponse } from 'next/server';

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

    // Parse request body
    let body: { branch_name?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    const { branch_name } = body;

    if (!branch_name || typeof branch_name !== 'string') {
      return NextResponse.json(
        { error: 'branch_name is required and must be a string' },
        { status: 400 },
      );
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
        return NextResponse.json(
          { error: 'Backlog item not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: `Cannot start item: status is '${currentItem.status}', must be 'approved'`,
          current_status: currentItem.status,
        },
        { status: 409 }, // 409 Conflict - status changed between request
      );
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
