/**
 * mason-autopilot start
 *
 * Start the autopilot daemon that polls Supabase for config and runs
 * scheduled PM reviews and executions.
 *
 * Supports multi-repository orchestration: a single daemon process can
 * manage multiple repositories via round-robin scheduling with per-repo
 * isolation for failures, cooldowns, and schedule tracking.
 *
 * Two-phase cycle per repository:
 *   Phase 1 (schedule-triggered, once daily): archive stale -> generate N items -> auto-approve all
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

import { hasClaudeCredentials, resetFailureCounter } from '../engine/agent-runner';
import { executeApprovedItems } from '../engine/execute-approved';
import { runPmReview } from '../engine/pm-review';

/**
 * Generate a SHA-256 hash of an API key
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Legacy single-repo config format (v1.0)
 * Kept for backward compatibility - auto-migrated to multi-repo format.
 */
interface AutopilotConfigV1 {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
}

/**
 * Multi-repo config format (v2.0)
 * Each repository entry has its own path and optional overrides.
 */
interface AutopilotConfigV2 {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositories: RepositoryEntry[];
  /** @deprecated Use repositories[] instead. Kept for backward compatibility. */
  repositoryPath?: string;
}

interface RepositoryEntry {
  path: string;
  /** Optional label for logging (defaults to directory name) */
  label?: string;
  /** Override the global polling interval for this repo (ms) */
  pollIntervalMs?: number;
}

/** Union type for config file parsing */
type AutopilotConfig = AutopilotConfigV1 | AutopilotConfigV2;

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
    requireHumanReviewComplexity?: number;
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

// ============================================================================
// Per-Repository Context (isolated state)
// ============================================================================

/**
 * Encapsulates per-repository state to prevent cross-repo interference.
 * Each repo has its own failure tracking, cooldown, and schedule state.
 */
interface RepoContext {
  entry: RepositoryEntry;
  label: string;
  /** Per-repo consecutive failure count */
  consecutiveFailures: number;
  /** Per-repo cooldown expiry */
  cooldownUntil: Date | null;
  /** Per-repo last schedule check */
  lastScheduleCheck: Date | null;
  /** Per-repo poll interval (for adaptive backoff) */
  currentPollInterval: number;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');
const BASE_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKOFF_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes max
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Hard-coded limit per execution run for context window safety.
 * This is separate from maxItemsPerDay (user-configurable daily cap).
 */
const ITEMS_PER_EXECUTION = 2;

// ============================================================================
// Global State (shared across repos)
// ============================================================================

let supabase: SupabaseClient;
let isRunning = false;
/** Per-repo contexts keyed by repository path */
let repoContexts: RepoContext[] = [];

// ============================================================================
// Config Parsing & Migration
// ============================================================================

/**
 * Parse the config file and normalize to multi-repo format.
 * Handles backward compatibility with v1.0 single-repo configs.
 */
function parseConfig(raw: AutopilotConfig): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositories: RepositoryEntry[];
} {
  // Check for v2.0 format (has repositories array)
  if ('repositories' in raw && Array.isArray(raw.repositories) && raw.repositories.length > 0) {
    return {
      supabaseUrl: raw.supabaseUrl,
      supabaseAnonKey: raw.supabaseAnonKey,
      repositories: raw.repositories,
    };
  }

  // Fall back to v1.0 format (single repositoryPath)
  if ('repositoryPath' in raw && raw.repositoryPath) {
    return {
      supabaseUrl: raw.supabaseUrl,
      supabaseAnonKey: raw.supabaseAnonKey,
      repositories: [{ path: raw.repositoryPath }],
    };
  }

  throw new Error(
    'Invalid autopilot config: must have either "repositories" array or "repositoryPath" field.',
  );
}

/**
 * Create a label for a repository (used in logging).
 */
function getRepoLabel(entry: RepositoryEntry): string {
  if (entry.label) {
    return entry.label;
  }
  // Use last path segment as label
  const parts = entry.path.replace(/\/+$/, '').split('/');
  return parts[parts.length - 1] || entry.path;
}

// ============================================================================
// Daily Execution Tracking
// ============================================================================

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

// ============================================================================
// Backlog Management
// ============================================================================

/**
 * Archive stale autopilot items from previous runs.
 * Sets status='archived' on items with source='autopilot' still in 'new' status.
 */
async function archiveStaleAutopilotItems(
  repositoryId: string,
  repoLabel: string,
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
    console.error(`[${repoLabel}] Failed to archive stale items:`, error.message);
    return;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(
      `  [${repoLabel}] Archived ${count} stale autopilot items from previous runs.`,
    );
  } else if (verbose) {
    console.log(`  [${repoLabel}] No stale autopilot items to archive.`);
  }
}

/**
 * Auto-approve ALL autopilot items with status='new'.
 * Simplified: no filtering by complexity, impact, or category.
 */
async function autoApproveAllAutopilotItems(
  config: AutopilotDbConfig,
  repoLabel: string,
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
    console.error(`[${repoLabel}] Failed to auto-approve items:`, error.message);
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`  [${repoLabel}] Auto-approved ${count} autopilot items.`);
    if (verbose && data) {
      for (const item of data) {
        console.log(`    - ${item.title}`);
      }
    }
  } else if (verbose) {
    console.log(`  [${repoLabel}] No new autopilot items to approve.`);
  }

  return count;
}

// ============================================================================
// Main Entrypoint
// ============================================================================

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

  const rawConfig = JSON.parse(
    readFileSync(CONFIG_FILE, 'utf-8'),
  ) as AutopilotConfig;

  const { supabaseUrl, supabaseAnonKey, repositories } = parseConfig(rawConfig);

  if (repositories.length === 0) {
    console.error('No repositories configured in autopilot config.');
    console.error('Add repositories to ~/.mason/autopilot.json or run: mason-autopilot init');
    process.exit(1);
  }

  console.log('\nMason Autopilot Daemon');
  console.log('='.repeat(40));
  console.log(`Repositories: ${repositories.length}`);
  for (const repo of repositories) {
    console.log(`  - ${getRepoLabel(repo)} (${repo.path})`);
  }
  console.log('Supabase:', supabaseUrl);
  console.log('Auth: Claude Agent SDK');
  console.log('');

  // Initialize Supabase client (shared across all repos)
  supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Initialize per-repo contexts
  repoContexts = repositories.map((entry) => ({
    entry,
    label: getRepoLabel(entry),
    consecutiveFailures: 0,
    cooldownUntil: null,
    lastScheduleCheck: null,
    currentPollInterval: entry.pollIntervalMs ?? BASE_POLL_INTERVAL_MS,
  }));

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
  console.log(`Managing ${repositories.length} repositor${repositories.length === 1 ? 'y' : 'ies'} in round-robin.`);
  console.log('Press Ctrl+C to stop.\n');

  // Initial run: cycle through all repos
  await runDaemonCycle(verbose);

  // Schedule recurring runs with dynamic interval
  const scheduleNextRun = () => {
    if (!isRunning) {
      return;
    }

    // Use the minimum poll interval across all repos
    const nextInterval = Math.min(
      ...repoContexts.map((ctx) => ctx.currentPollInterval),
    );

    setTimeout(() => {
      void (async () => {
        if (isRunning) {
          await runDaemonCycle(verbose);
          scheduleNextRun();
        }
      })();
    }, nextInterval);
  };

  scheduleNextRun();

  // Keep process alive
  await new Promise(() => {});
}

// ============================================================================
// Daemon Cycle (iterates all repos)
// ============================================================================

/**
 * Run a single daemon cycle across all registered repositories.
 * Each repo is processed sequentially (round-robin) with isolated error handling.
 */
async function runDaemonCycle(verbose: boolean): Promise<void> {
  const now = new Date();
  if (verbose) {
    console.log(`\n[${now.toISOString()}] Running daemon cycle across ${repoContexts.length} repo(s)...`);
  }

  for (const ctx of repoContexts) {
    if (!isRunning) {
      break;
    }

    await runRepoPhase(ctx, verbose);
  }
}

/**
 * Run the two-phase cycle for a single repository.
 * All state (failures, cooldowns, schedule checks) is isolated to the repo context.
 */
async function runRepoPhase(ctx: RepoContext, verbose: boolean): Promise<void> {
  const now = new Date();
  const prefix = `[${ctx.label}]`;

  if (verbose) {
    console.log(`\n${prefix} Processing repository: ${ctx.entry.path}`);
  }

  // Check if in cooldown period (per-repo)
  if (ctx.cooldownUntil && now < ctx.cooldownUntil) {
    const remainingMs = ctx.cooldownUntil.getTime() - now.getTime();
    const remainingMin = Math.ceil(remainingMs / 60000);
    console.log(
      `  ${prefix} In cooldown (${remainingMin}min remaining). Failures: ${ctx.consecutiveFailures}`,
    );
    return;
  }

  // Check if too many consecutive failures (per-repo)
  if (ctx.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const backoffMultiplier = Math.pow(2, ctx.consecutiveFailures - 2);
    const cooldownDuration = Math.min(
      BASE_POLL_INTERVAL_MS * backoffMultiplier,
      MAX_BACKOFF_INTERVAL_MS,
    );
    ctx.cooldownUntil = new Date(now.getTime() + cooldownDuration);

    console.log(
      `  ${prefix} Too many failures (${ctx.consecutiveFailures}). Entering cooldown for ${Math.ceil(cooldownDuration / 60000)} minutes.`,
    );
    return;
  }

  try {
    // 1. Fetch config from Supabase for this repo
    const config = await fetchAutopilotConfigForRepo(ctx.entry.path);

    if (!config) {
      if (verbose) {
        console.log(`  ${prefix} No autopilot config found.`);
      }
      return;
    }

    if (!config.enabled) {
      if (verbose) {
        console.log(`  ${prefix} Autopilot is disabled.`);
      }
      return;
    }

    // 2. Update heartbeat
    await updateHeartbeat(config.id);

    // === PHASE 1: Daily generation (schedule-triggered, per-repo) ===
    if (config.schedule_cron && shouldRunSchedule(config.schedule_cron, ctx)) {
      console.log(
        `${prefix} [${now.toISOString()}] Schedule triggered! Running daily review...`,
      );

      // Check if there are already enough approved items
      const maxItemsPerDay = config.guardian_rails.maxItemsPerDay;
      const { count: approvedCount } = await supabase
        .from('mason_pm_backlog_items')
        .select('*', { count: 'exact', head: true })
        .eq('repository_id', config.repository_id)
        .eq('status', 'approved');

      if (approvedCount && approvedCount >= maxItemsPerDay) {
        console.log(
          `  ${prefix} Skipping PM review: ${approvedCount} approved items already exist (daily max: ${maxItemsPerDay})`,
        );
      } else {
        // Archive stale autopilot items from previous runs
        await archiveStaleAutopilotItems(config.repository_id, ctx.label, verbose);

        // Run PM review with item limit
        await runPmReviewHandler(config, ctx, verbose);

        // Auto-approve all generated items
        await autoApproveAllAutopilotItems(config, ctx.label, verbose);
      }

      ctx.lastScheduleCheck = now;
    } else if (verbose) {
      console.log(`  ${prefix} Schedule not triggered yet.`);
    }

    // === PHASE 2: Continuous execution (every cycle) ===
    await executeApprovedItemsHandler(config, ctx, verbose);

    // Success! Reset per-repo backoff
    ctx.currentPollInterval = ctx.entry.pollIntervalMs ?? BASE_POLL_INTERVAL_MS;
    ctx.cooldownUntil = null;
    ctx.consecutiveFailures = 0;
    // Also reset the global failure counter used by agent-runner
    resetFailureCounter();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    ctx.consecutiveFailures++;
    console.error(`${prefix} Daemon cycle error (failure #${ctx.consecutiveFailures}):`, errorMessage);
    if (verbose && errorStack) {
      console.error('Stack trace:', errorStack.slice(0, 500));
    }

    // Log to Supabase for visibility
    try {
      await supabase.from('mason_autopilot_errors').insert({
        error_type: 'daemon_cycle',
        error_message: `[${ctx.label}] ${errorMessage}`,
        error_details: errorStack?.slice(0, 2000),
        consecutive_failures: ctx.consecutiveFailures,
        occurred_at: new Date().toISOString(),
      });
    } catch {
      // Silently fail if we can't log to Supabase
    }
  }
}

// ============================================================================
// Autopilot Config Fetching
// ============================================================================

/**
 * Fetch autopilot config from Supabase for a specific repository path.
 * Reads mason.config.json from the repo, validates API key, and queries
 * the autopilot_config table.
 */
async function fetchAutopilotConfigForRepo(
  repositoryPath: string,
): Promise<AutopilotDbConfig | null> {
  // Get repository info from mason.config.json in the repo
  const masonConfigPath = join(repositoryPath, 'mason.config.json');
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
      cwd: repositoryPath,
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

// ============================================================================
// Heartbeat & Schedule
// ============================================================================

async function updateHeartbeat(configId: string): Promise<void> {
  await supabase
    .from('mason_autopilot_config')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('id', configId);
}

/**
 * Check if a cron schedule should trigger for a specific repo context.
 * Uses per-repo lastScheduleCheck for isolation.
 */
function shouldRunSchedule(cronExpression: string, ctx: RepoContext): boolean {
  try {
    const interval = parseExpression(cronExpression);
    const nextRun = interval.prev().toDate();

    // If we haven't run since the last scheduled time, run now
    if (!ctx.lastScheduleCheck || nextRun > ctx.lastScheduleCheck) {
      return true;
    }

    return false;
  } catch {
    console.error(`[${ctx.label}] Invalid cron expression:`, cronExpression);
    return false;
  }
}

// ============================================================================
// Phase Handlers
// ============================================================================

async function runPmReviewHandler(
  config: AutopilotDbConfig,
  ctx: RepoContext,
  verbose: boolean,
): Promise<void> {
  const itemLimit = config.guardian_rails.maxItemsPerDay;

  // Use SDK-based PM review execution with item limit
  const result = await runPmReview(supabase, {
    userId: config.user_id,
    repositoryId: config.repository_id,
    repositoryPath: ctx.entry.path,
    verbose,
    itemLimit,
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
  ctx: RepoContext,
  verbose: boolean,
): Promise<void> {
  const maxItemsPerDay = config.guardian_rails.maxItemsPerDay;
  const prefix = `[${ctx.label}]`;

  // Check daily execution limit across all cycles
  const dailyStatus = await getDailyExecutedCount(
    config.repository_id,
    maxItemsPerDay,
  );

  if (verbose) {
    console.log(
      `  ${prefix} Daily execution progress: ${dailyStatus.dailyExecutedCount}/${dailyStatus.maxItemsPerDay} items (${dailyStatus.percentUsed}%)`,
    );
  }

  if (dailyStatus.limitReached) {
    if (verbose) {
      console.log(`  ${prefix} Daily limit reached. Skipping execution until tomorrow.`);
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
      console.log(`  ${prefix} No approved items to execute.`);
    }
    return;
  }

  // Calculate how many items we can execute this run
  const itemsToExecute = Math.min(ITEMS_PER_EXECUTION, dailyStatus.remaining);

  console.log(`  ${prefix} Remaining today: ${dailyStatus.remaining} items`);
  console.log(`  ${prefix} Executing up to ${itemsToExecute} approved items...`);

  // Use SDK-based execution
  const result = await executeApprovedItems(supabase, {
    userId: config.user_id,
    repositoryId: config.repository_id,
    repositoryPath: ctx.entry.path,
    maxItems: itemsToExecute,
    verbose,
    pauseOnFailure: config.guardian_rails.pauseOnFailure,
    autopilotConfigId: config.id,
  });

  if (!result.success && result.error) {
    throw new Error(result.error);
  }
}
