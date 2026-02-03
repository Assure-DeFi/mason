/**
 * Execute Approved Items via Claude Agent SDK
 *
 * Runs the /execute-approved command with limit and auto flags.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { runCommandWithArgs, type AgentConfig } from './agent-runner';

interface ExecuteConfig {
  userId: string;
  repositoryId: string;
  repositoryPath: string;
  maxItems: number;
  verbose: boolean;
  pauseOnFailure: boolean;
  autopilotConfigId: string;
}

interface ExecuteResult {
  success: boolean;
  itemsExecuted: number;
  error?: string;
}

/**
 * Execute approved backlog items
 */
export async function executeApprovedItems(
  supabase: SupabaseClient,
  config: ExecuteConfig,
): Promise<ExecuteResult> {
  // Check for approved items first
  const { data: approvedItems, error } = await supabase
    .from('mason_pm_backlog_items')
    .select('id, title, impact_score')
    .eq('repository_id', config.repositoryId)
    .eq('status', 'approved')
    .order('impact_score', { ascending: false })
    .limit(config.maxItems);

  if (error || !approvedItems || approvedItems.length === 0) {
    if (config.verbose) {
      console.log('No approved items to execute.');
    }
    return { success: true, itemsExecuted: 0 };
  }

  console.log(
    `Executing ${approvedItems.length} approved items (by highest impact)...`,
  );
  for (const item of approvedItems) {
    console.log(`  - ${item.title} (impact: ${item.impact_score})`);
  }

  // Record execution run
  const { data: run } = await supabase
    .from('mason_autopilot_runs')
    .insert({
      user_id: config.userId,
      repository_id: config.repositoryId,
      run_type: 'execution',
      status: 'running',
      items_executed: 0,
      started_at: new Date().toISOString(),
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
    // Run execute-approved with limit and auto flags
    const args = `--limit ${config.maxItems} --auto`;
    const result = await runCommandWithArgs(
      'execute-approved',
      args,
      agentConfig,
    );

    // Update run status
    await supabase
      .from('mason_autopilot_runs')
      .update({
        status: result.success ? 'completed' : 'failed',
        error_message: result.error,
        items_executed: approvedItems.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    if (result.success) {
      console.log('Execution completed successfully.');
      return { success: true, itemsExecuted: approvedItems.length };
    } else {
      console.error('Execution failed:', result.error);

      // Check guardian rail: pause on failure
      if (config.pauseOnFailure) {
        console.log('Pausing autopilot due to failure (guardian rail)...');
        await supabase
          .from('mason_autopilot_config')
          .update({ enabled: false })
          .eq('id', config.autopilotConfigId);
      }

      return {
        success: false,
        itemsExecuted: 0,
        error: result.error,
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

    if (config.pauseOnFailure) {
      console.log('Pausing autopilot due to failure (guardian rail)...');
      await supabase
        .from('mason_autopilot_config')
        .update({ enabled: false })
        .eq('id', config.autopilotConfigId);
    }

    return { success: false, itemsExecuted: 0, error: errorMessage };
  }
}
