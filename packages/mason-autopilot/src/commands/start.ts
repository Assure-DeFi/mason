/**
 * mason-autopilot start
 *
 * Start the autopilot daemon that polls Supabase for config and runs
 * scheduled PM reviews and executions.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { parseExpression } from 'cron-parser';

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
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let supabase: SupabaseClient;
let localConfig: AutopilotConfig;
let isRunning = false;
let lastScheduleCheck: Date | null = null;

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

  // Schedule recurring runs
  const interval = setInterval(async () => {
    if (isRunning) {
      await runDaemonCycle(verbose);
    } else {
      clearInterval(interval);
    }
  }, POLL_INTERVAL_MS);

  // Keep process alive
  await new Promise(() => {});
}

async function runDaemonCycle(verbose: boolean): Promise<void> {
  const now = new Date();
  if (verbose) {
    console.log(`[${now.toISOString()}] Running daemon cycle...`);
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
        await runPmReview(config, verbose);
      }

      // 7. Auto-approve items matching rules (always run - processes existing items)
      await autoApproveItems(config, verbose);

      // 8. Execute approved items (always run - drains the backlog)
      await executeApprovedItems(
        config,
        verbose,
        config.guardian_rails.maxItemsPerDay,
      );

      lastScheduleCheck = now;
    } else if (verbose) {
      console.log('  Schedule not triggered yet.');
    }
  } catch (error) {
    console.error('Daemon cycle error:', error);
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

async function runPmReview(
  config: AutopilotDbConfig,
  verbose: boolean,
): Promise<void> {
  console.log('Running PM review...');

  const startedAt = new Date().toISOString();

  // Record run start
  const { data: run } = await supabase
    .from('mason_autopilot_runs')
    .insert({
      user_id: config.user_id,
      repository_id: config.repository_id,
      run_type: 'analysis',
      status: 'running',
      started_at: startedAt,
    })
    .select()
    .single();

  try {
    // Execute claude with pm-review command
    const result = await executeClaudeCommand('/pm-review', verbose);

    if (result.success && run?.id) {
      // Link newly created items to this autopilot run
      // Find items created during this run (no autopilot_run_id set yet)
      const { data: recentItems } = await supabase
        .from('mason_pm_backlog_items')
        .select('id')
        .eq('repository_id', config.repository_id)
        .is('autopilot_run_id', null)
        .gte('created_at', startedAt);

      if (recentItems && recentItems.length > 0) {
        // Update items with source='autopilot' and link to this run
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

        console.log(`  Linked ${recentItems.length} items to autopilot run.`);
      }

      // Update run with item count and mark completed
      await supabase
        .from('mason_autopilot_runs')
        .update({
          status: 'completed',
          items_analyzed: recentItems?.length || 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      console.log('PM review completed successfully.');
    } else {
      // Update run status on failure
      await supabase
        .from('mason_autopilot_runs')
        .update({
          status: 'failed',
          error_message: result.error,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run?.id);

      console.error('PM review failed:', result.error);
    }
  } catch (error) {
    await supabase
      .from('mason_autopilot_runs')
      .update({
        status: 'failed',
        error_message: String(error),
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);
    throw error;
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

async function executeApprovedItems(
  config: AutopilotDbConfig,
  verbose: boolean,
  maxItems: number,
): Promise<void> {
  // Check if there are approved items to execute (ordered by impact for priority)
  const { data: allItems, error } = await supabase
    .from('mason_pm_backlog_items')
    .select('id, title, impact_score')
    .eq('repository_id', config.repository_id)
    .eq('status', 'approved')
    .order('impact_score', { ascending: false });

  if (error || !allItems || allItems.length === 0) {
    if (verbose) {
      console.log('No approved items to execute.');
    }
    return;
  }

  // Limit to maxItemsPerDay
  const items = allItems.slice(0, maxItems);

  if (items.length < allItems.length) {
    console.log(
      `Found ${allItems.length} approved items, limiting to top ${maxItems} (maxItemsPerDay).`,
    );
  }

  console.log(
    `Executing ${items.length} approved items (by highest impact)...`,
  );
  for (const item of items) {
    console.log(`  - ${item.title} (impact: ${item.impact_score})`);
  }

  // Record execution run
  const { data: run } = await supabase
    .from('mason_autopilot_runs')
    .insert({
      user_id: config.user_id,
      repository_id: config.repository_id,
      run_type: 'execution',
      status: 'running',
      items_executed: 0,
    })
    .select()
    .single();

  try {
    // Execute claude with execute-approved command (with limit and auto mode)
    const result = await executeClaudeCommand(
      `/execute-approved --limit ${maxItems} --auto`,
      verbose,
    );

    // Update run status
    await supabase
      .from('mason_autopilot_runs')
      .update({
        status: result.success ? 'completed' : 'failed',
        error_message: result.error,
        items_executed: items.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    if (result.success) {
      console.log('Execution completed successfully.');
    } else {
      console.error('Execution failed:', result.error);

      // Check guardian rail: pause on failure
      if (config.guardian_rails.pauseOnFailure) {
        console.log('Pausing autopilot due to failure (guardian rail)...');
        await supabase
          .from('mason_autopilot_config')
          .update({ enabled: false })
          .eq('id', config.id);
      }
    }
  } catch (error) {
    await supabase
      .from('mason_autopilot_runs')
      .update({
        status: 'failed',
        error_message: String(error),
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);
    throw error;
  }
}

interface ClaudeResult {
  success: boolean;
  error?: string;
}

async function executeClaudeCommand(
  command: string,
  verbose: boolean,
): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    // Find claude binary - check common locations
    const { execSync } = require('node:child_process');
    let claudePath = 'claude';

    try {
      // Try to find claude using 'which' with user's shell environment
      claudePath = execSync('bash -l -c "which claude"', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      if (verbose) {
        console.log(`Found claude at: ${claudePath}`);
      }
    } catch {
      // Fallback to common locations
      const fs = require('node:fs');
      const homedir = require('node:os').homedir();
      const commonPaths = [
        `${homedir}/.local/bin/claude`,
        '/usr/local/bin/claude',
        '/usr/bin/claude',
      ];
      for (const p of commonPaths) {
        if (fs.existsSync(p)) {
          claudePath = p;
          if (verbose) {
            console.log(`Found claude at fallback location: ${claudePath}`);
          }
          break;
        }
      }
    }

    // Always use -p mode for automation (required for non-interactive execution)
    // In verbose mode, use stream-json to see real-time output
    const args = [
      '-p',
      command,
      '--dangerously-skip-permissions',
      '--allowedTools',
      'Bash,Read,Write,Edit,Grep,Glob,Task',
      ...(verbose ? ['--output-format', 'stream-json'] : []),
    ];

    if (verbose) {
      console.log(`Executing: ${claudePath} ${args.join(' ')}`);
    }

    // Ensure PATH includes common binary locations
    const homedir = require('node:os').homedir();
    const enhancedEnv = {
      ...process.env,
      PATH: `${homedir}/.local/bin:/usr/local/bin:${process.env.PATH || ''}`,
    };

    const child = spawn(claudePath, args, {
      cwd: localConfig.repositoryPath,
      stdio: 'pipe', // Always pipe so we can process output
      env: enhancedEnv,
      shell: false, // Don't use shell - we have the full path
    });

    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const text = data.toString();
        if (verbose) {
          // In verbose mode with stream-json, parse and display activity
          for (const line of text.split('\n').filter(Boolean)) {
            try {
              const json = JSON.parse(line);
              // Show assistant messages and tool usage
              if (json.type === 'assistant' && json.message?.content) {
                for (const block of json.message.content) {
                  if (block.type === 'text' && block.text) {
                    console.log('  Claude:', block.text.slice(0, 200));
                  } else if (block.type === 'tool_use') {
                    console.log(`  [Tool] ${block.name}`);
                  }
                }
              } else if (json.type === 'result') {
                console.log(
                  '  [Complete]',
                  json.result?.slice(0, 100) || 'Done',
                );
              }
            } catch {
              // Not JSON or parse error, show raw if verbose
              if (text.trim()) console.log('  ', text.trim().slice(0, 200));
            }
          }
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (verbose) {
          console.error('  [stderr]', data.toString().trim());
        }
      });
    }

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });
  });
}
