/**
 * mason-autopilot start
 *
 * Start the autopilot daemon that polls Supabase for config and runs
 * scheduled PM reviews and executions.
 *
 * Uses Claude Agent SDK for direct API execution instead of subprocess spawning.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { parseExpression } from 'cron-parser';

import {
  getConsecutiveFailures,
  hasClaudeCredentials,
  resetFailureCounter,
  shouldSkipDueToFailures,
} from '../engine/agent-runner';
import { executeApprovedItems } from '../engine/execute-approved';
import { runPmReview } from '../engine/pm-review';

/**
 * Generate a SHA-256 hash of an API key
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

interface AutopilotConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
}

interface AutopilotDbConfig {
  id: string;
  user_id: string;
  repository_id: string;
  enabled: boolean;
  schedule_cron: string | null;
  auto_approval_rules: {
    maxComplexity: number;
    minImpact: number;
    excludedCategories: string[];
  };
  guardian_rails: {
    maxItemsPerDay: number;
    pauseOnFailure: boolean;
    requireHumanReviewComplexity: number;
  };
  execution_window: {
    startHour: number;
    endHour: number;
  };
  last_heartbeat: string | null;
}

interface StartOptions {
  daemon?: boolean;
  verbose?: boolean;
}

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');
const BASE_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKOFF_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes max

/**
 * Hard-coded limit per execution run for context window safety.
 * This is separate from maxItemsPerDay (user-configurable daily cap).
 */
const ITEMS_PER_EXECUTION = 2;

let supabase: SupabaseClient;
let localConfig: AutopilotConfig;
let isRunning = false;
let lastScheduleCheck: Date | null = null;
let currentPollInterval = BASE_POLL_INTERVAL_MS;
let cooldownUntil: Date | null = null;

interface BacklogThresholdResult {
  count: number;
  threshold: number;
  isFull: boolean;
  percentFull: number;
}

/**
 * Check if the backlog has reached capacity threshold.
 * Threshold is dynamically calculated as 5x maxItemsPerDay (~1 week buffer).
 */
async function checkBacklogThreshold(
  repositoryId: string,
  maxItemsPerDay: number,
): Promise<BacklogThresholdResult> {
  // Dynamic threshold: 5x daily limit = ~1 week of work buffer
  const threshold = maxItemsPerDay * 5;

  // Count pending items (new + approved = unprocessed work)
  const { count, error } = await supabase
    .from('mason_pm_backlog_items')
    .select('*', { count: 'exact', head: true })
    .eq('repository_id', repositoryId)
    .in('status', ['new', 'approved']);

  if (error) {
    console.error('Failed to check backlog threshold:', error.message);
    // On error, assume not full to allow processing
    return { count: 0, threshold, isFull: false, percentFull: 0 };
  }

  const actualCount = count ?? 0;
  const percentFull = Math.round((actualCount / threshold) * 100);
  const isFull = actualCount >= threshold;

  return { count: actualCount, threshold, isFull, percentFull };
}

interface DailyExecutionResult {
  dailyExecutedCount: number;
  maxItemsPerDay: number;
  remaining: number;
  percentUsed: number;
  limitReached: boolean;
}

/**
 * Get the count of items executed in the last 24 hours for a repository.
 * Used to enforce the daily execution cap across all daemon cycles.
 */
async function getDailyExecutedCount(
  repositoryId: string,
  maxItemsPerDay: number,
): Promise<DailyExecutionResult> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('mason_autopilot_runs')
    .select('items_executed')
    .eq('repository_id', repositoryId)
    .eq('run_type', 'execution')
    .eq('status', 'completed')
    .gte('started_at', twentyFourHoursAgo);

  if (error) {
    console.error('Failed to check daily execution count:', error.message);
    // On error, be conservative and assume we haven't executed anything
    return {
      dailyExecutedCount: 0,
      maxItemsPerDay,
      remaining: maxItemsPerDay,
      percentUsed: 0,
      limitReached: false,
    };
  }

  const dailyExecutedCount =
    data?.reduce((sum, run) => sum + (run.items_executed || 0), 0) ?? 0;
  const remaining = Math.max(0, maxItemsPerDay - dailyExecutedCount);
  const percentUsed = Math.round((dailyExecutedCount / maxItemsPerDay) * 100);
  const limitReached = remaining <= 0;

  return {
    dailyExecutedCount,
    maxItemsPerDay,
    remaining,
    percentUsed,
    limitReached,
  };
}

export async function startCommand(options: StartOptions): Promise<void> {
  const verbose = options.verbose ?? false;

  // Check for Claude credentials (required for SDK)
  if (!hasClaudeCredentials()) {
    console.error('Claude credentials not found.');
    console.error('');
    console.error('Run this command to authenticate:');
    console.error('  claude setup-token');
    console.error('');
    console.error('This uses your Claude Pro Max subscription for API access.');
    process.exit(1);
  }

  // Load local configuration
  if (!existsSync(CONFIG_FILE)) {
    console.error('Autopilot not configured. Run: mason-autopilot init');
    process.exit(1);
  }

  localConfig = JSON.parse(
    readFileSync(CONFIG_FILE, 'utf-8'),
  ) as AutopilotConfig;

  console.log('\nMason Autopilot Daemon');
  console.log('='.repeat(40));
  console.log('Repository:', localConfig.repositoryPath);
  console.log('Supabase:', localConfig.supabaseUrl);
  console.log('Auth: Claude Agent SDK');
  console.log('');

  // Initialize Supabase client
  supabase = createClient(localConfig.supabaseUrl, localConfig.supabaseAnonKey);

  // Start the main loop
  isRunning = true;

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down autopilot daemon...');
    isRunning = false;
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    isRunning = false;
    process.exit(0);
  });

  console.log('Starting daemon loop (polling every 5 minutes)...');
  console.log('Press Ctrl+C to stop.\n');

  // Initial run
  await runDaemonCycle(verbose);

  // Schedule recurring runs with dynamic interval
  const scheduleNextRun = () => {
    if (!isRunning) {
      return;
    }

    setTimeout(() => {
      void (async () => {
        if (isRunning) {
          await runDaemonCycle(verbose);
          scheduleNextRun();
        }
      })();
    }, currentPollInterval);
  };

  scheduleNextRun();

  // Keep process alive
  await new Promise(() => {});
}

async function runDaemonCycle(verbose: boolean): Promise<void> {
  const now = new Date();
  if (verbose) {
    console.log(`[${now.toISOString()}] Running daemon cycle...`);
  }

  // Check if in cooldown period
  if (cooldownUntil && now < cooldownUntil) {
    const remainingMs = cooldownUntil.getTime() - now.getTime();
    const remainingMin = Math.ceil(remainingMs / 60000);
    console.log(
      `  In cooldown (${remainingMin}min remaining). Failures: ${getConsecutiveFailures()}`,
    );
    return;
  }

  // Check if too many consecutive failures
  if (shouldSkipDueToFailures()) {
    // Enter cooldown mode with exponential backoff
    const backoffMultiplier = Math.pow(2, getConsecutiveFailures() - 2);
    const cooldownDuration = Math.min(
      BASE_POLL_INTERVAL_MS * backoffMultiplier,
      MAX_BACKOFF_INTERVAL_MS,
    );
    cooldownUntil = new Date(now.getTime() + cooldownDuration);

    console.log(
      `  Too many failures (${getConsecutiveFailures()}). Entering cooldown for ${Math.ceil(cooldownDuration / 60000)} minutes.`,
    );
    console.log('  Check credentials with: claude setup-token');
    console.log('  Or check API status at: https://status.anthropic.com');
    return;
  }

  try {
    // 1. Fetch config from Supabase
    const config = await fetchAutopilotConfig();

    if (!config) {
      if (verbose) {
        console.log('  No autopilot config found for this repository.');
      }
      return;
    }

    if (!config.enabled) {
      if (verbose) {
        console.log('  Autopilot is disabled for this repository.');
      }
      return;
    }

    // 2. Update heartbeat
    await updateHeartbeat(config.id);

    // 3. Check if within execution window
    if (!isWithinExecutionWindow(config.execution_window)) {
      if (verbose) {
        console.log('  Outside execution window. Skipping.');
      }
      return;
    }

    // 4. Check if schedule triggers
    if (config.schedule_cron && shouldRunSchedule(config.schedule_cron)) {
      console.log(
        `[${now.toISOString()}] Schedule triggered! Running autopilot...`,
      );

      // 5. Pre-flight check: Is backlog at capacity?
      const backlogStatus = await checkBacklogThreshold(
        config.repository_id,
        config.guardian_rails.maxItemsPerDay,
      );

      console.log(
        `  Backlog: ${backlogStatus.count}/${backlogStatus.threshold} (${backlogStatus.percentFull}% full)`,
      );

      if (backlogStatus.isFull) {
        // Skip PM review but continue with auto-approve and execution
        console.log(
          '  Skipping PM review - backlog at capacity. Continuing with execution...',
        );

        // Record skipped analysis run for visibility
        await supabase.from('mason_autopilot_runs').insert({
          user_id: config.user_id,
          repository_id: config.repository_id,
          run_type: 'analysis',
          status: 'skipped',
          items_analyzed: 0,
          skip_reason: `Backlog at capacity: ${backlogStatus.count}/${backlogStatus.threshold} pending items (${backlogStatus.percentFull}%)`,
          started_at: now.toISOString(),
          completed_at: now.toISOString(),
        });
      } else {
        // 6. Run PM review (backlog has capacity)
        await runPmReviewHandler(config, verbose);
      }

      // 7. Auto-approve items matching rules (always run - processes existing items)
      await autoApproveItems(config, verbose);

      // 8. Execute approved items (always run - drains the backlog)
      await executeApprovedItemsHandler(config, verbose);

      lastScheduleCheck = now;

      // Success! Reset backoff
      currentPollInterval = BASE_POLL_INTERVAL_MS;
      cooldownUntil = null;
      resetFailureCounter();
    } else if (verbose) {
      console.log('  Schedule not triggered yet.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Daemon cycle error:', errorMessage);
    if (verbose && errorStack) {
      console.error('Stack trace:', errorStack.slice(0, 500));
    }

    // Log to Supabase for visibility
    try {
      await supabase.from('mason_autopilot_errors').insert({
        error_type: 'daemon_cycle',
        error_message: errorMessage,
        error_details: errorStack?.slice(0, 2000),
        consecutive_failures: getConsecutiveFailures(),
        occurred_at: new Date().toISOString(),
      });
    } catch {
      // Silently fail if we can't log to Supabase
    }
  }
}

async function fetchAutopilotConfig(): Promise<AutopilotDbConfig | null> {
  // Get repository info from mason.config.json in the repo
  const masonConfigPath = join(localConfig.repositoryPath, 'mason.config.json');
  if (!existsSync(masonConfigPath)) {
    console.error('  mason.config.json not found at:', masonConfigPath);
    console.error('  Run mason-autopilot init from your repository directory.');
    return null;
  }

  const masonConfig = JSON.parse(readFileSync(masonConfigPath, 'utf-8'));
  const apiKey = masonConfig.apiKey;

  if (!apiKey) {
    console.error('  mason.config.json is missing apiKey field.');
    return null;
  }

  // Validate API key and get user_id
  const keyHash = hashApiKey(apiKey);
  const { data: apiKeyData, error: apiKeyError } = await supabase
    .from('mason_api_keys')
    .select('user_id')
    .eq('key_hash', keyHash)
    .single();

  if (apiKeyError || !apiKeyData) {
    console.error(
      '  API key validation failed. Key may be invalid or expired.',
    );
    console.error('  Error:', apiKeyError?.message || 'No matching key found');
    return null;
  }

  // Get repository full name from git remote
  let repoFullName = '';
  try {
    const { execSync } = await import('node:child_process');
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: localConfig.repositoryPath,
      encoding: 'utf-8',
    }).trim();
    const match = remoteUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) {
      repoFullName = match[1];
    }
  } catch {
    console.error('  Could not determine repository from git remote.');
    return null;
  }

  if (!repoFullName) {
    console.error('  Could not parse repository name from git remote.');
    return null;
  }

  // Look up repository by full name and user
  const { data: repoData, error: repoError } = await supabase
    .from('mason_github_repositories')
    .select('id')
    .eq('github_full_name', repoFullName)
    .eq('user_id', apiKeyData.user_id)
    .single();

  if (repoError || !repoData) {
    console.error('  Repository not found:', repoFullName);
    console.error('  Run mason-autopilot init to register this repository.');
    return null;
  }

  console.log('  Repository:', repoFullName);

  // Query autopilot config for this specific repository
  const { data, error } = await supabase
    .from('mason_autopilot_config')
    .select('*')
    .eq('repository_id', repoData.id)
    .single();

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      console.error(
        '  No autopilot config found for repository:',
        repoFullName,
      );
      console.error('  Run mason-autopilot init to create default config.');
    } else {
      console.error('  Failed to fetch autopilot config:', error?.message);
    }
    return null;
  }

  return data as AutopilotDbConfig;
}

async function updateHeartbeat(configId: string): Promise<void> {
  await supabase
    .from('mason_autopilot_config')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('id', configId);
}

function isWithinExecutionWindow(window: {
  startHour: number;
  endHour: number;
}): boolean {
  const now = new Date();
  const hour = now.getHours();

  // Handle overnight windows (e.g., 22:00 to 06:00)
  if (window.startHour > window.endHour) {
    return hour >= window.startHour || hour < window.endHour;
  }

  return hour >= window.startHour && hour < window.endHour;
}

function shouldRunSchedule(cronExpression: string): boolean {
  try {
    const interval = parseExpression(cronExpression);
    const nextRun = interval.prev().toDate();

    // If we haven't run since the last scheduled time, run now
    if (!lastScheduleCheck || nextRun > lastScheduleCheck) {
      return true;
    }

    return false;
  } catch {
    console.error('Invalid cron expression:', cronExpression);
    return false;
  }
}

async function runPmReviewHandler(
  config: AutopilotDbConfig,
  verbose: boolean,
): Promise<void> {
  // Use SDK-based PM review execution
  const result = await runPmReview(supabase, {
    userId: config.user_id,
    repositoryId: config.repository_id,
    repositoryPath: localConfig.repositoryPath,
    verbose,
  });

  if (!result.success) {
    // Build detailed error message
    let errorMsg = result.error || 'PM review failed';
    if (result.errorCode) {
      errorMsg = `[${result.errorCode}] ${errorMsg}`;
    }
    if (verbose && result.errorDetails) {
      console.error('Error details:', result.errorDetails);
    }
    throw new Error(errorMsg);
  }
}

async function autoApproveItems(
  config: AutopilotDbConfig,
  verbose: boolean,
): Promise<number> {
  const rules = config.auto_approval_rules;
  const rails = config.guardian_rails;

  // Fetch new items from this repository
  const { data: items, error } = await supabase
    .from('mason_pm_backlog_items')
    .select('*')
    .eq('repository_id', config.repository_id)
    .eq('status', 'new');

  if (error || !items) {
    console.error('Failed to fetch backlog items:', error?.message);
    return 0;
  }

  let approvedCount = 0;

  for (const item of items) {
    // Check if item matches auto-approval rules
    const shouldApprove =
      item.complexity <= rules.maxComplexity &&
      item.impact_score >= rules.minImpact &&
      !rules.excludedCategories.includes(item.type);

    // Check guardian rails
    if (item.complexity > rails.requireHumanReviewComplexity) {
      if (verbose) {
        console.log(
          `  Skipping "${item.title}" - complexity ${item.complexity} requires human review`,
        );
      }
      continue;
    }

    if (approvedCount >= rails.maxItemsPerDay) {
      if (verbose) {
        console.log(`  Reached daily limit of ${rails.maxItemsPerDay} items`);
      }
      break;
    }

    if (shouldApprove) {
      // Auto-approve the item
      await supabase
        .from('mason_pm_backlog_items')
        .update({ status: 'approved' })
        .eq('id', item.id);

      approvedCount++;
      console.log(
        `  Auto-approved: "${item.title}" (complexity: ${item.complexity}, impact: ${item.impact_score})`,
      );
    }
  }

  console.log(`Auto-approved ${approvedCount} items.`);

  // Return the count so it can be recorded
  return approvedCount;
}

async function executeApprovedItemsHandler(
  config: AutopilotDbConfig,
  verbose: boolean,
): Promise<void> {
  const maxItemsPerDay = config.guardian_rails.maxItemsPerDay;

  // Check daily execution limit across all cycles
  const dailyStatus = await getDailyExecutedCount(
    config.repository_id,
    maxItemsPerDay,
  );

  console.log(
    `  Daily execution progress: ${dailyStatus.dailyExecutedCount}/${dailyStatus.maxItemsPerDay} items (${dailyStatus.percentUsed}%)`,
  );

  if (dailyStatus.limitReached) {
    console.log('  Daily limit reached. Skipping execution until tomorrow.');

    // Record skipped execution for visibility
    await supabase.from('mason_autopilot_runs').insert({
      user_id: config.user_id,
      repository_id: config.repository_id,
      run_type: 'execution',
      status: 'skipped',
      items_executed: 0,
      skip_reason: `Daily limit reached: ${dailyStatus.dailyExecutedCount}/${dailyStatus.maxItemsPerDay} items executed in last 24 hours`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    return;
  }

  // Calculate how many items we can execute this run
  // Respect both: hard-coded per-execution limit AND remaining daily budget
  const itemsToExecute = Math.min(ITEMS_PER_EXECUTION, dailyStatus.remaining);

  console.log(`  Remaining today: ${dailyStatus.remaining} items`);
  console.log(`  Executing up to ${itemsToExecute} approved items...`);

  // Use SDK-based execution
  const result = await executeApprovedItems(supabase, {
    userId: config.user_id,
    repositoryId: config.repository_id,
    repositoryPath: localConfig.repositoryPath,
    maxItems: itemsToExecute,
    verbose,
    pauseOnFailure: config.guardian_rails.pauseOnFailure,
    autopilotConfigId: config.id,
  });

  if (!result.success && result.error) {
    throw new Error(result.error);
  }
}
