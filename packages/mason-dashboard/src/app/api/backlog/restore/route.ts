import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@supabase/supabase-js';

interface RestoreRequest {
  filteredItemId: string;
}

/**
 * POST /api/backlog/restore - Restore a filtered item to the backlog
 *
 * This endpoint:
 * 1. Fetches the filtered item from mason_pm_filtered_items
 * 2. Creates a new backlog item from it
 * 3. Marks the filtered item as 'restored'
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's database credentials
    const user = session.user as {
      id: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!user.supabaseUrl || !user.supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 400 },
      );
    }

    const body = (await request.json()) as RestoreRequest;
    const { filteredItemId } = body;

    if (!filteredItemId) {
      return NextResponse.json(
        { error: 'filteredItemId is required' },
        { status: 400 },
      );
    }

    // Create client for user's database
    const supabase = createClient(user.supabaseUrl, user.supabaseAnonKey);

    // Fetch the filtered item
    const { data: filteredItem, error: fetchError } = await supabase
      .from('mason_pm_filtered_items')
      .select('*')
      .eq('id', filteredItemId)
      .single();

    if (fetchError || !filteredItem) {
      return NextResponse.json(
        { error: 'Filtered item not found' },
        { status: 404 },
      );
    }

    // Check if already restored
    if (filteredItem.override_status === 'restored') {
      return NextResponse.json(
        { error: 'Item has already been restored' },
        { status: 400 },
      );
    }

    // Create backlog item from filtered item
    const backlogItem = {
      title: filteredItem.title,
      problem: filteredItem.problem,
      solution: filteredItem.solution,
      type: filteredItem.type,
      area: filteredItem.area,
      impact_score: filteredItem.impact_score,
      effort_score: filteredItem.effort_score,
      priority_score: filteredItem.impact_score * 2 - filteredItem.effort_score,
      complexity: filteredItem.complexity || 2,
      benefits: filteredItem.benefits || [],
      status: 'new',
      analysis_run_id: filteredItem.analysis_run_id,
    };

    const { data: newItem, error: insertError } = await supabase
      .from('mason_pm_backlog_items')
      .insert(backlogItem)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create backlog item:', insertError);
      return NextResponse.json(
        { error: 'Failed to create backlog item' },
        { status: 500 },
      );
    }

    // Mark filtered item as restored
    const { error: updateError } = await supabase
      .from('mason_pm_filtered_items')
      .update({ override_status: 'restored' })
      .eq('id', filteredItemId);

    if (updateError) {
      console.error('Failed to update filtered item status:', updateError);
      // Don't fail the request - the item was already restored
    }

    return NextResponse.json({
      message: 'Item restored successfully',
      backlogItem: newItem,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
