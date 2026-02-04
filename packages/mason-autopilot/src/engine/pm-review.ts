/**
 * PM Review Execution via Claude Agent SDK
 *
 * Runs the /pm-review command and tracks results in Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { runCommand, type AgentConfig } from './agent-runner';

interface PmReviewConfig {
  userId: string;
  repositoryId: string;
  repositoryPath: string;
  verbose: boolean;
}

interface PmReviewResult {
  success: boolean;
  itemsCreated: number;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
}

/**
 * Run PM review and track results
 */
export async function runPmReview(
  supabase: SupabaseClient,
  config: PmReviewConfig,
): Promise<PmReviewResult> {
  const startedAt = new Date().toISOString();

  console.log('Running PM review via SDK...');

  // Record run start
  const { data: run } = await supabase
    .from('mason_autopilot_runs')
    .insert({
      user_id: config.userId,
      repository_id: config.repositoryId,
      run_type: 'analysis',
      status: 'running',
      started_at: startedAt,
    })
    .select()
    .single();

  const agentConfig: AgentConfig = {
    repositoryPath: config.repositoryPath,
    verbose: config.verbose,
    supabase,
    userId: config.userId,
    repositoryId: config.repositoryId,
    runId: run?.id,
  };

  try {
    const result = await runCommand('pm-review', agentConfig);

    if (result.success && run?.id) {
      // Find items created during this run
      const { data: recentItems } = await supabase
        .from('mason_pm_backlog_items')
        .select('id')
        .eq('repository_id', config.repositoryId)
        .is('autopilot_run_id', null)
        .gte('created_at', startedAt);

      const itemCount = recentItems?.length ?? 0;

      if (recentItems && recentItems.length > 0) {
        // Link items to this autopilot run
        await supabase
          .from('mason_pm_backlog_items')
          .update({
            source: 'autopilot',
            autopilot_run_id: run.id,
          })
          .in(
            'id',
            recentItems.map((i) => i.id),
          );

        console.log(`  Linked ${itemCount} items to autopilot run.`);
      }

      // Mark run as completed
      await supabase
        .from('mason_autopilot_runs')
        .update({
          status: 'completed',
          items_analyzed: itemCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      console.log('PM review completed successfully.');

      return { success: true, itemsCreated: itemCount };
    } else {
      // Build detailed error message for logging
      const errorMessage = result.errorCode
        ? `[${result.errorCode}] ${result.error}`
        : result.error;

      // Mark run as failed with full details
      await supabase
        .from('mason_autopilot_runs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          error_details: result.errorDetails?.slice(0, 4000),
          completed_at: new Date().toISOString(),
        })
        .eq('id', run?.id);

      console.error('PM review failed:', result.error);
      if (result.errorCode) {
        console.error('  Error code:', result.errorCode);
      }

      return {
        success: false,
        itemsCreated: 0,
        error: result.error,
        errorCode: result.errorCode,
        errorDetails: result.errorDetails,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await supabase
      .from('mason_autopilot_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    return { success: false, itemsCreated: 0, error: errorMessage };
  }
}
