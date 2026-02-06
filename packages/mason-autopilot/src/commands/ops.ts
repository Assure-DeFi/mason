/**
 * mason-autopilot ops
 *
 * Unified operations status dashboard.
 * Shows daemon health, queue depth, execution progress, errors, and recent runs
 * in a single color-coded view.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AutopilotConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
}

interface OpsOptions {
  json?: boolean;
  verbose?: boolean;
}

interface DaemonStatus {
  online: boolean;
  lastHeartbeat: string | null;
  minutesAgo: number | null;
  serviceStatus: string;
}

interface QueueStatus {
  new: number;
  approved: number;
  in_progress: number;
  completed: number;
  rejected: number;
  deferred: number;
  total: number;
}

interface DailyProgress {
  executedToday: number;
  maxPerDay: number;
  remaining: number;
}

interface ErrorSummary {
  totalErrors: number;
  last24h: number;
  lastHour: number;
  maxConsecutive: number;
  status: 'healthy' | 'warning' | 'critical';
  topErrors: Array<{ type: string; count: number }>;
}

interface RecentRun {
  run_type: string;
  status: string;
  items_analyzed: number;
  items_auto_approved: number;
  items_executed: number;
  prs_created: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  skip_reason: string | null;
}

interface OpsReport {
  daemon: DaemonStatus;
  queue: QueueStatus;
  daily: DailyProgress;
  errors: ErrorSummary;
  recentRuns: RecentRun[];
}

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function statusIcon(ok: boolean): string {
  return ok ? c('green', '+') : c('red', 'x');
}

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');

export async function opsCommand(options: OpsOptions): Promise<void> {
  // Load config
  if (!existsSync(CONFIG_FILE)) {
    console.error(
      c('red', 'Autopilot not configured.') + ' Run: mason-autopilot init',
    );
    process.exit(1);
  }

  const config = JSON.parse(
    readFileSync(CONFIG_FILE, 'utf-8'),
  ) as AutopilotConfig;
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  const report = await gatherReport(supabase, config);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printReport(report, options.verbose ?? false);
}

async function gatherReport(
  supabase: SupabaseClient,
  config: AutopilotConfig,
): Promise<OpsReport> {
  // Run all queries in parallel
  const [daemon, queue, daily, errors, recentRuns] = await Promise.all([
    getDaemonStatus(supabase),
    getQueueStatus(supabase),
    getDailyProgress(supabase),
    getErrorSummary(supabase),
    getRecentRuns(supabase),
  ]);

  return { daemon, queue, daily, errors, recentRuns };
}

async function getDaemonStatus(
  supabase: SupabaseClient,
): Promise<DaemonStatus> {
  const serviceStatus = getServiceStatus();

  const { data } = await supabase
    .from('mason_autopilot_config')
    .select('last_heartbeat')
    .limit(1)
    .single();

  let online = false;
  let lastHeartbeat: string | null = null;
  let minutesAgo: number | null = null;

  if (data?.last_heartbeat) {
    lastHeartbeat = data.last_heartbeat;
    const diff = Date.now() - new Date(data.last_heartbeat).getTime();
    minutesAgo = Math.round(diff / 60000);
    online = minutesAgo < 10;
  }

  return { online, lastHeartbeat, minutesAgo, serviceStatus };
}

function getServiceStatus(): string {
  const os = platform();
  try {
    switch (os) {
      case 'darwin': {
        const output = execSync(
          'launchctl list 2>/dev/null | grep mason-autopilot || echo "not found"',
          { encoding: 'utf-8' },
        );
        if (output.includes('not found')) return 'NOT INSTALLED';
        const pid = output.trim().split(/\s+/)[0];
        return pid === '-' ? 'STOPPED' : `RUNNING (PID: ${pid})`;
      }
      case 'linux': {
        const output = execSync(
          'systemctl --user is-active mason-autopilot 2>/dev/null || echo "not found"',
          { encoding: 'utf-8' },
        );
        const status = output.trim();
        if (status === 'not found' || status === 'inactive')
          return 'NOT INSTALLED';
        return status.toUpperCase();
      }
      default:
        return 'UNKNOWN';
    }
  } catch {
    return 'UNKNOWN';
  }
}

async function getQueueStatus(supabase: SupabaseClient): Promise<QueueStatus> {
  const statuses = [
    'new',
    'approved',
    'in_progress',
    'completed',
    'rejected',
    'deferred',
  ] as const;

  const counts: Record<string, number> = {};
  let total = 0;

  // Query counts for each status in parallel
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from('mason_pm_backlog_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      return { status, count: count ?? 0 };
    }),
  );

  for (const { status, count } of results) {
    counts[status] = count;
    total += count;
  }

  return {
    new: counts['new'] ?? 0,
    approved: counts['approved'] ?? 0,
    in_progress: counts['in_progress'] ?? 0,
    completed: counts['completed'] ?? 0,
    rejected: counts['rejected'] ?? 0,
    deferred: counts['deferred'] ?? 0,
    total,
  };
}

async function getDailyProgress(
  supabase: SupabaseClient,
): Promise<DailyProgress> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const [configResult, runsResult] = await Promise.all([
    supabase
      .from('mason_autopilot_config')
      .select('guardian_rails')
      .limit(1)
      .single(),
    supabase
      .from('mason_autopilot_runs')
      .select('items_executed')
      .eq('run_type', 'execution')
      .eq('status', 'completed')
      .gte('started_at', twentyFourHoursAgo),
  ]);

  const maxPerDay =
    (configResult.data?.guardian_rails as { maxItemsPerDay?: number })
      ?.maxItemsPerDay ?? 10;
  const executedToday =
    runsResult.data?.reduce(
      (sum: number, r: { items_executed: number }) => sum + r.items_executed,
      0,
    ) ?? 0;

  return {
    executedToday,
    maxPerDay,
    remaining: Math.max(0, maxPerDay - executedToday),
  };
}

async function getErrorSummary(
  supabase: SupabaseClient,
): Promise<ErrorSummary> {
  try {
    const { data, error } = await supabase.rpc('get_dlq_metrics');

    if (error || !data) {
      return {
        totalErrors: 0,
        last24h: 0,
        lastHour: 0,
        maxConsecutive: 0,
        status: 'healthy',
        topErrors: [],
      };
    }

    const metrics = data as {
      total_count: number;
      last_24h_count: number;
      last_hour_count: number;
      max_consecutive_failures: number;
      error_types: Array<{ type: string; count: number }>;
    };

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (metrics.total_count > 50) status = 'critical';
    else if (metrics.total_count >= 10) status = 'warning';

    return {
      totalErrors: metrics.total_count,
      last24h: metrics.last_24h_count,
      lastHour: metrics.last_hour_count,
      maxConsecutive: metrics.max_consecutive_failures,
      status,
      topErrors: metrics.error_types ?? [],
    };
  } catch {
    return {
      totalErrors: 0,
      last24h: 0,
      lastHour: 0,
      maxConsecutive: 0,
      status: 'healthy',
      topErrors: [],
    };
  }
}

async function getRecentRuns(supabase: SupabaseClient): Promise<RecentRun[]> {
  const { data } = await supabase
    .from('mason_autopilot_runs')
    .select(
      'run_type, status, items_analyzed, items_auto_approved, items_executed, prs_created, error_message, started_at, completed_at, skip_reason',
    )
    .order('started_at', { ascending: false })
    .limit(10);

  return (data as RecentRun[]) ?? [];
}

function printReport(report: OpsReport, verbose: boolean): void {
  const { daemon, queue, daily, errors, recentRuns } = report;
  const w = 56;
  const line = '─'.repeat(w);

  console.log('');
  console.log(c('bold', `┌${line}┐`));
  console.log(
    c('bold', `│${' '.repeat(12)}Mason Ops Dashboard${' '.repeat(w - 31)}│`),
  );
  console.log(c('bold', `└${line}┘`));

  // Daemon Status
  console.log('');
  console.log(c('bold', '  DAEMON'));
  console.log(c('dim', `  ${line}`));
  const daemonColor = daemon.online ? 'green' : 'red';
  const daemonLabel = daemon.online ? 'ONLINE' : 'OFFLINE';
  console.log(
    `  Status:    ${c(daemonColor, daemonLabel)}${daemon.minutesAgo !== null ? c('dim', ` (heartbeat ${daemon.minutesAgo}m ago)`) : ''}`,
  );
  console.log(`  Service:   ${daemon.serviceStatus}`);

  // Queue Status
  console.log('');
  console.log(c('bold', '  QUEUE'));
  console.log(c('dim', `  ${line}`));
  const queueBar = buildBar(queue.approved, queue.total || 1, 30);
  console.log(
    `  New:         ${c('cyan', String(queue.new).padStart(4))}    Approved:    ${c('green', String(queue.approved).padStart(4))}`,
  );
  console.log(
    `  In Progress: ${c('yellow', String(queue.in_progress).padStart(4))}    Completed:   ${c('green', String(queue.completed).padStart(4))}`,
  );
  console.log(
    `  Rejected:    ${c('red', String(queue.rejected).padStart(4))}    Deferred:    ${c('dim', String(queue.deferred).padStart(4))}`,
  );
  console.log(`  Ready:       ${queueBar} ${queue.approved}/${queue.total}`);

  // Daily Progress
  console.log('');
  console.log(c('bold', '  DAILY EXECUTION'));
  console.log(c('dim', `  ${line}`));
  const dailyBar = buildBar(daily.executedToday, daily.maxPerDay, 30);
  const dailyColor =
    daily.remaining === 0 ? 'red' : daily.remaining <= 2 ? 'yellow' : 'green';
  console.log(
    `  Executed:    ${dailyBar} ${daily.executedToday}/${daily.maxPerDay}`,
  );
  console.log(`  Remaining:   ${c(dailyColor, String(daily.remaining))}`);

  // Error Summary
  console.log('');
  console.log(c('bold', '  ERRORS (DLQ)'));
  console.log(c('dim', `  ${line}`));
  const errColor =
    errors.status === 'critical'
      ? 'red'
      : errors.status === 'warning'
        ? 'yellow'
        : 'green';
  console.log(`  Status:      ${c(errColor, errors.status.toUpperCase())}`);
  console.log(
    `  Total:       ${errors.totalErrors}    Last 24h: ${errors.last24h}    Last 1h: ${errors.lastHour}`,
  );
  if (errors.maxConsecutive > 0) {
    console.log(
      `  Max streak:  ${c('red', String(errors.maxConsecutive))} consecutive failures`,
    );
  }
  if (verbose && errors.topErrors.length > 0) {
    console.log(`  Breakdown:`);
    for (const e of errors.topErrors) {
      console.log(`    ${e.type}: ${e.count}`);
    }
  }

  // Recent Runs
  console.log('');
  console.log(c('bold', '  RECENT RUNS'));
  console.log(c('dim', `  ${line}`));
  if (recentRuns.length === 0) {
    console.log(c('dim', '  No runs recorded'));
  } else {
    const limit = verbose ? 10 : 5;
    for (const run of recentRuns.slice(0, limit)) {
      const time = new Date(run.started_at).toLocaleString();
      const icon =
        run.status === 'completed'
          ? c('green', '+')
          : run.status === 'running'
            ? c('yellow', '>')
            : run.status === 'skipped'
              ? c('dim', '-')
              : c('red', 'x');
      const type = run.run_type.padEnd(10);
      let details: string;
      if (run.skip_reason) {
        details = c('dim', `skipped: ${run.skip_reason.slice(0, 40)}`);
      } else if (run.run_type === 'analysis') {
        details = `found: ${run.items_analyzed}, approved: ${run.items_auto_approved}`;
      } else {
        details = `executed: ${run.items_executed}, PRs: ${run.prs_created}`;
      }
      console.log(`  [${icon}] ${type} ${c('dim', time)}`);
      console.log(`      ${details}`);
      if (run.error_message) {
        console.log(`      ${c('red', run.error_message.slice(0, 60))}`);
      }
    }
    if (!verbose && recentRuns.length > 5) {
      console.log(
        c('dim', `  ... ${recentRuns.length - 5} more (use --verbose)`),
      );
    }
  }

  console.log('');
  console.log(c('dim', `  ${line}`));
  console.log(c('dim', `  ${new Date().toLocaleString()}`));
  console.log('');
}

function buildBar(value: number, max: number, width: number): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round((value / max) * 100);
  return `${c('green', bar)} ${pct}%`;
}
