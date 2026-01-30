/**
 * mason-autopilot status
 *
 * Show the current status of the autopilot daemon.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface AutopilotConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
}

interface AutopilotDbConfig {
  id: string;
  enabled: boolean;
  schedule_cron: string | null;
  last_heartbeat: string | null;
  auto_approval_rules: {
    maxComplexity: number;
    minImpact: number;
  };
  guardian_rails: {
    maxItemsPerDay: number;
    pauseOnFailure: boolean;
  };
  execution_window: {
    startHour: number;
    endHour: number;
  };
}

interface AutopilotRun {
  id: string;
  run_type: 'analysis' | 'execution';
  status: 'running' | 'completed' | 'failed';
  items_analyzed: number;
  items_auto_approved: number;
  items_executed: number;
  prs_created: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');

export async function statusCommand(): Promise<void> {
  console.log('\nMason Autopilot Status\n');
  console.log('='.repeat(50));

  // Check local configuration
  if (!existsSync(CONFIG_FILE)) {
    console.log('\nLocal Configuration: NOT CONFIGURED');
    console.log('  Run: mason-autopilot init');
    return;
  }

  const config = JSON.parse(
    readFileSync(CONFIG_FILE, 'utf-8'),
  ) as AutopilotConfig;
  console.log('\nLocal Configuration:');
  console.log(`  Config file: ${CONFIG_FILE}`);
  console.log(`  Repository: ${config.repositoryPath}`);
  console.log(`  Supabase: ${config.supabaseUrl}`);

  // Check service status
  console.log('\nService Status:');
  const serviceStatus = await checkServiceStatus();
  console.log(`  ${serviceStatus}`);

  // Check log file
  const logFile = join(CONFIG_DIR, 'autopilot.log');
  if (existsSync(logFile)) {
    const stats = statSync(logFile);
    const lastModified = stats.mtime.toLocaleString();
    console.log(`  Log file: ${logFile}`);
    console.log(`  Last modified: ${lastModified}`);
  }

  // Check Supabase configuration
  console.log('\nRemote Configuration:');
  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

    const { data: dbConfig, error } = await supabase
      .from('mason_autopilot_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.log('  Autopilot tables not found. Run database migrations.');
      } else if (error.code === 'PGRST116') {
        console.log('  No autopilot configuration found.');
        console.log(
          '  Configure at: https://mason.assuredefi.com/settings/autopilot',
        );
      } else {
        console.log(`  Error: ${error.message}`);
      }
    } else if (dbConfig) {
      const cfg = dbConfig as AutopilotDbConfig;
      console.log(`  Enabled: ${cfg.enabled ? 'Yes' : 'No'}`);
      console.log(`  Schedule: ${cfg.schedule_cron || 'Not set'}`);
      console.log(
        `  Execution window: ${cfg.execution_window.startHour}:00 - ${cfg.execution_window.endHour}:00`,
      );
      console.log(
        `  Auto-approval: complexity <= ${cfg.auto_approval_rules.maxComplexity}, impact >= ${cfg.auto_approval_rules.minImpact}`,
      );
      console.log(`  Max items/day: ${cfg.guardian_rails.maxItemsPerDay}`);
      console.log(
        `  Pause on failure: ${cfg.guardian_rails.pauseOnFailure ? 'Yes' : 'No'}`,
      );

      if (cfg.last_heartbeat) {
        const heartbeat = new Date(cfg.last_heartbeat);
        const now = new Date();
        const diffMinutes = Math.round(
          (now.getTime() - heartbeat.getTime()) / 60000,
        );
        const status = diffMinutes < 10 ? 'ONLINE' : 'OFFLINE';
        console.log(
          `\n  Daemon heartbeat: ${heartbeat.toLocaleString()} (${status}, ${diffMinutes} min ago)`,
        );
      } else {
        console.log('\n  Daemon heartbeat: Never (daemon not started)');
      }

      // Fetch recent runs
      const { data: runs } = await supabase
        .from('mason_autopilot_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (runs && runs.length > 0) {
        console.log('\nRecent Runs:');
        for (const run of runs as AutopilotRun[]) {
          const startTime = new Date(run.started_at).toLocaleString();
          const statusIcon =
            run.status === 'completed'
              ? '+'
              : run.status === 'running'
                ? '>'
                : 'x';
          const details =
            run.run_type === 'analysis'
              ? `analyzed: ${run.items_analyzed}, approved: ${run.items_auto_approved}`
              : `executed: ${run.items_executed}, PRs: ${run.prs_created}`;
          console.log(
            `  [${statusIcon}] ${run.run_type} (${startTime}) - ${run.status} - ${details}`,
          );
          if (run.error_message) {
            console.log(`      Error: ${run.error_message}`);
          }
        }
      } else {
        console.log('\nRecent Runs: None');
      }
    }
  } catch (error) {
    console.log(`  Connection error: ${error}`);
  }

  console.log('\n' + '='.repeat(50));
}

async function checkServiceStatus(): Promise<string> {
  const os = platform();

  try {
    switch (os) {
      case 'darwin': {
        const output = execSync(
          'launchctl list 2>/dev/null | grep mason-autopilot || echo "not found"',
          {
            encoding: 'utf-8',
          },
        );
        if (output.includes('not found')) {
          return 'launchd: NOT INSTALLED (run: mason-autopilot install)';
        }
        // Parse launchctl list output: PID Status Label
        const parts = output.trim().split(/\s+/);
        const pid = parts[0];
        if (pid === '-') {
          return 'launchd: STOPPED';
        }
        return `launchd: RUNNING (PID: ${pid})`;
      }

      case 'linux': {
        const output = execSync(
          'systemctl --user is-active mason-autopilot 2>/dev/null || echo "not found"',
          {
            encoding: 'utf-8',
          },
        );
        const status = output.trim();
        if (status === 'not found' || status === 'inactive') {
          return 'systemd: NOT INSTALLED (run: mason-autopilot install)';
        }
        return `systemd: ${status.toUpperCase()}`;
      }

      case 'win32': {
        const output = execSync(
          'schtasks /query /tn "MasonAutopilot" 2>nul || echo "not found"',
          {
            encoding: 'utf-8',
          },
        );
        if (output.includes('not found')) {
          return 'Task Scheduler: NOT INSTALLED (run: mason-autopilot install)';
        }
        if (output.includes('Running')) {
          return 'Task Scheduler: RUNNING';
        }
        return 'Task Scheduler: READY';
      }

      default:
        return `${os}: Service installation not supported`;
    }
  } catch {
    return 'Unable to check service status';
  }
}
