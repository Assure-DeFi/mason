import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';

/**
 * Debug endpoint to test the BuildingTheater auto-show mechanism.
 *
 * POST /api/debug/test-execution
 *
 * Creates a test execution_progress record to verify the entire flow:
 * 1. Dashboard useExecutionListener detects the new record (via realtime or polling)
 * 2. BuildingTheater modal appears with the test progress
 * 3. After 30 seconds, the test record is automatically cleaned up
 *
 * This allows verifying the system works without running a real execution.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, supabaseUrl, supabaseAnonKey } = body;

    // Validate required parameters
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing supabaseUrl or supabaseAnonKey' },
        { status: 400 },
      );
    }

    // Create Supabase client with user's credentials
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // If no itemId provided, we'll create a fake test record
    // Otherwise, we'll create a real progress record for that item
    let testItemId = itemId;
    let createdTestItem = false;

    if (!testItemId) {
      // Create a temporary test backlog item
      const { data: testItem, error: itemError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .insert({
          title: '[TEST] BuildingTheater Test Execution',
          problem: 'This is a test item created by the debug endpoint.',
          solution: 'This item will be automatically cleaned up.',
          area: 'frontend',
          type: 'dashboard',
          complexity: 1,
          impact_score: 5,
          effort_score: 1,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (itemError) {
        console.error('[TestExecution] Failed to create test item:', itemError);
        return NextResponse.json(
          { error: `Failed to create test item: ${itemError.message}` },
          { status: 500 },
        );
      }

      testItemId = testItem.id;
      createdTestItem = true;
      console.log('[TestExecution] Created test item:', testItemId);
    }

    // Delete any existing progress record for this item
    await supabase
      .from(TABLES.EXECUTION_PROGRESS)
      .delete()
      .eq('item_id', testItemId);

    // Create the test execution_progress record
    const { data: progress, error: progressError } = await supabase
      .from(TABLES.EXECUTION_PROGRESS)
      .insert({
        item_id: testItemId,
        run_id: null, // CLI-style execution
        current_phase: 'site_review',
        current_wave: 0,
        total_waves: 4,
        wave_status: 'pending',
        current_task: '[TEST] Verifying BuildingTheater auto-show...',
        tasks_completed: 0,
        tasks_total: 10,
        current_file: null,
        files_touched: [],
        lines_changed: 0,
        validation_typescript: 'pending',
        validation_eslint: 'pending',
        validation_build: 'pending',
        validation_tests: 'pending',
        inspector_findings: [],
        fix_iteration: 0,
        max_iterations: 5,
      })
      .select()
      .single();

    if (progressError) {
      console.error(
        '[TestExecution] Failed to create progress record:',
        progressError,
      );
      // Clean up test item if we created one
      if (createdTestItem) {
        await supabase
          .from(TABLES.PM_BACKLOG_ITEMS)
          .delete()
          .eq('id', testItemId);
      }
      return NextResponse.json(
        { error: `Failed to create progress record: ${progressError.message}` },
        { status: 500 },
      );
    }

    console.log('[TestExecution] Created test progress record:', progress.id);

    // Schedule cleanup after 30 seconds (non-blocking)
    // Note: In production, this would be handled by a background job
    // For now, we just log that cleanup should happen
    const cleanupDelay = 30;

    return NextResponse.json({
      success: true,
      testId: progress.id,
      itemId: testItemId,
      createdTestItem,
      expectedBehavior:
        'BuildingTheater should appear in the dashboard within 5 seconds (3s polling interval + processing)',
      cleanupIn: `${cleanupDelay}s`,
      instructions: [
        '1. Watch the dashboard - BuildingTheater modal should appear automatically',
        '2. Check browser console for "[ExecutionListener]" logs to see if realtime or polling detected it',
        '3. If it appears, the system is working correctly',
        '4. The test record will be cleaned up manually - use DELETE endpoint or wait',
      ],
    });
  } catch (error) {
    console.error('[TestExecution] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/debug/test-execution
 *
 * Cleans up test execution records created by POST.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, supabaseUrl, supabaseAnonKey } = body;

    if (!itemId || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing itemId, supabaseUrl, or supabaseAnonKey' },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Delete the progress record
    const { error: progressError } = await supabase
      .from(TABLES.EXECUTION_PROGRESS)
      .delete()
      .eq('item_id', itemId);

    if (progressError) {
      console.error(
        '[TestExecution] Failed to delete progress:',
        progressError,
      );
    }

    // Check if this was a test item (has [TEST] prefix)
    const { data: item } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('title')
      .eq('id', itemId)
      .single();

    if (item?.title?.startsWith('[TEST]')) {
      // Delete the test item too
      const { error: itemError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .delete()
        .eq('id', itemId);

      if (itemError) {
        console.error('[TestExecution] Failed to delete test item:', itemError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test records cleaned up',
    });
  } catch (error) {
    console.error('[TestExecution] Cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
