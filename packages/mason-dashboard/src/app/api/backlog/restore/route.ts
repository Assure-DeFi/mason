import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { backlogRestoreSchema, validateRequest } from '@/lib/schemas';

/**
 * POST /api/backlog/restore - Restore a filtered item to the backlog
 *
 * This endpoint atomically:
 * 1. Creates a new backlog item from the filtered item
 * 2. Marks the filtered item as 'restored'
 * 3. Tracks restore feedback for confidence decay
 *
 * If step 2 fails, step 1 is rolled back (the created item is deleted).
 * Step 3 (feedback tracking) is non-critical and logged on failure.
 *
 * Note: priority_score is a GENERATED ALWAYS column computed by PostgreSQL
 * as (impact_score * 2) - effort_score, so it must NOT be included in inserts.
 *
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    // Get user's database credentials from headers (client passes from localStorage)
    const supabaseUrl = request.headers.get('x-supabase-url');
    const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest(
        'Database credentials required. Please complete setup.',
      );
    }

    // Validate request body with Zod schema
    const validation = await validateRequest(request, backlogRestoreSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { filteredItemId } = validation.data;

    // Create client for user's database
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch the filtered item
    const { data: filteredItem, error: fetchError } = await supabase
      .from(TABLES.PM_FILTERED_ITEMS)
      .select('*')
      .eq('id', filteredItemId)
      .single();

    if (fetchError || !filteredItem) {
      return notFound('Filtered item not found');
    }

    // Check if already restored
    if (filteredItem.override_status === 'restored') {
      return badRequest('Item has already been restored');
    }

    // Create backlog item from filtered item
    // Note: priority_score is omitted because it is a GENERATED ALWAYS column
    // that PostgreSQL computes automatically as (impact_score * 2) - effort_score
    const backlogItem = {
      title: filteredItem.title,
      problem: filteredItem.problem,
      solution: filteredItem.solution,
      type: filteredItem.type,
      area: filteredItem.area,
      impact_score: filteredItem.impact_score,
      effort_score: filteredItem.effort_score,
      complexity: filteredItem.complexity || 2,
      benefits: filteredItem.benefits || [],
      status: 'new' as const,
      analysis_run_id: filteredItem.analysis_run_id,
    };

    // Step 1: Create the backlog item
    const { data: newItem, error: insertError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .insert(backlogItem)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create backlog item:', insertError);
      return serverError('Failed to create backlog item');
    }

    // Step 2: Mark filtered item as restored
    const { error: updateError } = await supabase
      .from(TABLES.PM_FILTERED_ITEMS)
      .update({ override_status: 'restored' })
      .eq('id', filteredItemId);

    if (updateError) {
      console.error('Failed to update filtered item status:', updateError);

      // Rollback Step 1: Delete the created backlog item to maintain consistency
      const { error: rollbackError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .delete()
        .eq('id', newItem.id);

      if (rollbackError) {
        console.error(
          'Rollback failed - orphaned backlog item:',
          newItem.id,
          rollbackError,
        );
      }

      return serverError(
        'Failed to complete restore operation. Changes have been rolled back.',
      );
    }

    // Step 3: Track restore feedback for confidence decay system
    // This helps the pm-validator learn which filter patterns are too aggressive
    // Non-critical: failure is logged but does not roll back the restore
    const { error: trackError } = await supabase
      .from(TABLES.PM_RESTORE_FEEDBACK)
      .insert({
        filtered_item_id: filteredItemId,
        filter_tier: filteredItem.filter_tier,
        filter_reason: filteredItem.filter_reason,
        restored_at: new Date().toISOString(),
      });

    if (trackError) {
      console.warn('Failed to track restore feedback:', trackError);
    }

    return apiSuccess({
      message: 'Item restored successfully',
      backlogItem: newItem,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return serverError();
  }
}
