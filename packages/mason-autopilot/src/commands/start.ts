/**
 * mason-autopilot start
 *
 * Start the autopilot daemon that polls Supabase for config and runs
 * scheduled PM reviews and executions.
 *
 * Two-phase cycle:
 *   Phase 1 (schedule-triggered, once daily): archive stale → generate N items → auto-approve all
 *   Phase 2 (every cycle, every 5 min): execute 2 approved items if any remain
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
import type { ProviderConfig, ProviderName } from '../engine/providers';
import {
  ENV_VAR_ALIASES,
  ENV_VAR_NAMES,
  getProviderConfig,
} from '../engine/providers';
import { NotificationDispatcher } from '../notifications/dispatcher';

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
  // Kept for schema backward compat but unused in simplified flow
  auto_approval_rules: {
    maxComplexity: number;
    minImpact: number;
    excludedCategories: string[];
  };
  guardian_rails: {
    maxItemsPerDay: number;
    pauseOnFailure: boolean;
    requireHumanReviewComplexity?: number;
  };
  // Kept for schema backward compat but unused in simplified flow
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

/**
 * Archive stale autopilot items from previous runs.
 * Sets status='archived' on items with source='autopilot' still in 'new' status.
 */
async function archiveStaleAutopilotItems(
  repositoryId: string,
  verbose: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from('mason_pm_backlog_items')
    .update({ status: 'archived' })
    .eq('repository_id', repositoryId)
    .eq('source', 'autopilot')
    .eq('status', 'new')
    .select('id');

  if (error) {
    console.error('Failed to archive stale items:', error.message);
    return;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(
      `  Archived ${count} stale autopilot items from previous runs.`,
    );
  } else if (verbose) {
    console.log('  No stale autopilot items to archive.');
  }
}

/**
 * Auto-approve ALL autopilot items with status='new'.
 * Simplified: no filtering by complexity, impact, or category.
 */
async function autoApproveAllAutopilotItems(
  config: AutopilotDbConfig,
  verbose: boolean,
): Promise<number> {
  const { data, error } = await supabase
    .from('mason_pm_backlog_items')
    .update({ status: 'approved' })
    .eq('repository_id', config.repository_id)
    .eq('source', 'autopilot')
    .eq('status', 'new')
    .select('id, title');

  if (error) {
    console.error('Failed to auto-approve items:', error.message);
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`  Auto-approved ${count} autopilot items.`);
    if (verbose && data) {
      for (const item of data) {
        console.log(`    - ${item.title}`);
      }
    }
  } else if (verbose) {
    console.log('  No new autopilot items to approve.');
  }

  return count;
}

/** Active provider config, resolved at startup */
let activeProviderConfig: ProviderConfig | undefined;

/**
 * Resolve which AI provider to use. Priority:
 *   1. Claude Code OAuth (Agent SDK path)
 *   2. Environment variable API keys
 *   3. Keys stored in user's Supabase DB
 */
async function resolveProvider(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<ProviderConfig | undefined> {
  // 1. Claude Code OAuth - use Agent SDK path (returns undefined = use SDK)
  if (hasClaudeCredentials()) {
    return undefined;
  }

  // 2. Environment variables (check primary + alias names)
  const envProviders: ProviderName[] = ['anthropic', 'openai', 'google'];
  for (const provider of envProviders) {
    const envVar = ENV_VAR_NAMES[provider];
    const key = process.env[envVar];
    if (key) {
      return getProviderConfig(provider, key, 'env_var');
    }
    // Check alias (e.g., GOOGLE_GENERATIVE_AI_API_KEY)
    const alias = ENV_VAR_ALIASES[provider];
    if (alias) {
      const aliasKey = process.env[alias];
      if (aliasKey) {
        return getProviderConfig(provider, aliasKey, 'env_var');
      }
    }
  }

  // 3. Database-stored keys (from user's own Supabase)
  try {
    const { data } = await supabaseClient
      .from('mason_ai_provider_keys')
      .select('provider, api_key, model, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const activeKey = data?.[0];
    if (activeKey?.api_key) {
      return getProviderConfig(
        activeKey.provider as ProviderName,
        activeKey.api_key,
        'database',
        activeKey.model || undefined,
      );
    }
  } catch {
    // Table might not exist yet, or no active keys - continue
  }

  return undefined;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const verbose = options.verbose ?? false;

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

  // Initialize Supabase client
  supabase = createClient(localConfig.supabaseUrl, localConfig.supabaseAnonKey);

  // Resolve AI provider - we need userId first, so do a preliminary check
  // Full resolution happens in the daemon cycle after we have userId from config
  if (hasClaudeCredentials()) {
    console.log('Runtime: Claude Agent SDK (OAuth)');
  } else {
    // Check environment variables for early display
    const envProviders: ProviderName[] = ['anthropic', 'openai', 'google'];
    let foundEnv = false;
    for (const provider of envProviders) {
      const envVar = ENV_VAR_NAMES[provider];
      const alias = ENV_VAR_ALIASES[provider];
      if (process.env[envVar] || (alias && process.env[alias])) {
        const detectedVar = process.env[envVar] ? envVar : alias;
        console.log(
          `Runtime: Multi-Provider (${provider} via env var ${detectedVar})`,
        );
        foundEnv = true;
        break;
      }
    }
    if (!foundEnv) {
      console.log('Runtime: Will resolve from database keys...');
    }
  }
  console.log('');

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

  let currentConfig: AutopilotDbConfig | null = null;

  try {
    // 1. Fetch config from Supabase
    const config = await fetchAutopilotConfig();
    currentConfig = config;

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

    // Resolve AI provider for this cycle
    activeProviderConfig = await resolveProvider(supabase, config.user_id);

    // Write active provider info to autopilot_config for dashboard visibility
    const providerInfo = activeProviderConfig
      ? {
          active_provider: activeProviderConfig.provider,
          active_model: activeProviderConfig.model,
          provider_source: activeProviderConfig.source,
        }
      : {
          active_provider: 'claude',
          active_model: 'claude-agent-sdk',
          provider_source: 'claude_oauth',
        };

    await supabase
      .from('mason_autopilot_config')
      .update(providerInfo)
      .eq('id', config.id);

    // === PHASE 1: Daily generation (schedule-triggered) ===
    if (config.schedule_cron && shouldRunSchedule(config.schedule_cron)) {
      console.log(
        `[${now.toISOString()}] Schedule triggered! Running daily review...`,
      );

      // HARD STOP: Do not generate new items if backlog already has enough for 1 day's workload
      const maxItemsPerDay = config.guardian_rails.maxItemsPerDay;
      const { count: activeCount, error: activeError } = await supabase
        .from('mason_pm_backlog_items')
        .select('*', { count: 'exact', head: true })
        .eq('repository_id', config.repository_id)
        .in('status', ['new', 'approved']);

      if (activeError) {
        console.error(
          '  Failed to check active items count:',
          activeError.message,
        );
        console.log(
          '  Skipping PM review due to query error (safety fallback).',
        );
      } else if (activeCount !== null && activeCount >= maxItemsPerDay) {
        console.log(
          `  Skipping PM review: ${activeCount}/${maxItemsPerDay} active items already satisfy daily workload.`,
        );
      } else {
        // Archive stale autopilot items from previous runs
        await archiveStaleAutopilotItems(config.repository_id, verbose);

        // Run PM review with item limit
        await runPmReviewHandler(config, verbose);

        // Auto-approve all generated items
        await autoApproveAllAutopilotItems(config, verbose);
      }

      lastScheduleCheck = now;
    } else if (verbose) {
      console.log('  Schedule not triggered yet.');
    }

    // === PHASE 2: Continuous execution (every cycle) ===
    await executeApprovedItemsHandler(config, verbose);

    // Success! Reset backoff
    currentPollInterval = BASE_POLL_INTERVAL_MS;
    cooldownUntil = null;
    resetFailureCounter();
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

    // Dispatch alert notification when consecutive failures exceed threshold
    if (getConsecutiveFailures() >= 3 && currentConfig) {
      try {
        const dispatcher = new NotificationDispatcher(supabase);
        await dispatcher.dispatch({
          type: 'execution_failed',
          userId: currentConfig.user_id,
          repositoryId: currentConfig.repository_id,
          timestamp: new Date().toISOString(),
          data: {
            runId: 'daemon-cycle',
            error: errorMessage.slice(0, 200),
            itemTitle: 'Autopilot daemon cycle',
            consecutiveFailures: getConsecutiveFailures(),
          },
        });
      } catch {
        // Don't let notification failures break the daemon
      }
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
  const itemLimit = config.guardian_rails.maxItemsPerDay;

  // Use SDK-based PM review execution with item limit
  const result = await runPmReview(supabase, {
    userId: config.user_id,
    repositoryId: config.repository_id,
    repositoryPath: localConfig.repositoryPath,
    verbose,
    itemLimit,
    providerConfig: activeProviderConfig,
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

  if (verbose) {
    console.log(
      `  Daily execution progress: ${dailyStatus.dailyExecutedCount}/${dailyStatus.maxItemsPerDay} items (${dailyStatus.percentUsed}%)`,
    );
  }

  if (dailyStatus.limitReached) {
    if (verbose) {
      console.log('  Daily limit reached. Skipping execution until tomorrow.');
    }

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

  // Check if there are any approved items to execute
  const { count } = await supabase
    .from('mason_pm_backlog_items')
    .select('*', { count: 'exact', head: true })
    .eq('repository_id', config.repository_id)
    .eq('status', 'approved');

  if (!count || count === 0) {
    if (verbose) {
      console.log('  No approved items to execute.');
    }
    return;
  }

  // Calculate how many items we can execute this run
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
    providerConfig: activeProviderConfig,
  });

  if (!result.success && result.error) {
    throw new Error(result.error);
  }
}
