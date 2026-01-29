import { NextResponse } from 'next/server';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
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
    let body: { pr_url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    const { pr_url } = body;

    if (!pr_url || typeof pr_url !== 'string') {
      return NextResponse.json(
        { error: 'pr_url is required and must be a string' },
        { status: 400 },
      );
    }

    // Basic URL validation
    try {
      new URL(pr_url);
    } catch {
      return NextResponse.json(
        { error: 'pr_url must be a valid URL' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // First, verify the item exists and is in 'in_progress' status
    const { data: existingItem, error: fetchError } = await supabase
      .from('mason_pm_backlog_items')
      .select('id, status, title, branch_name')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: 'Backlog item not found' },
        { status: 404 },
      );
    }

    // Validate status transition
    if (existingItem.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: `Cannot complete item: status is '${existingItem.status}', must be 'in_progress'`,
          current_status: existingItem.status,
        },
        { status: 400 },
      );
    }

    // Update the item to completed
    const { data: updatedItem, error: updateError } = await supabase
      .from('mason_pm_backlog_items')
      .update({
        status: 'completed',
        pr_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to complete backlog item:', updateError);
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
        status: updatedItem.status,
        branch_name: updatedItem.branch_name,
        pr_url: updatedItem.pr_url,
      },
      message: `Item '${updatedItem.title}' completed successfully`,
    });
  } catch (error) {
    console.error('Error completing backlog item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
