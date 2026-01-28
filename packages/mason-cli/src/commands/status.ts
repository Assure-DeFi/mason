import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import Table from 'cli-table3';

import { MasonConfigSchema } from '@mason/core';
import {
  createDatabase,
  BacklogRepository,
  ExecutionRunRepository,
  ExecutionTaskRepository,
} from '@mason/storage';
import { readLockfile, getLockfilePath, formatLockInfo } from '@mason/executor';

import type { ExecutionRunStatus, ExecutionTaskStatus } from '@mason/storage';

/**
 * Format run status with color
 */
function formatRunStatus(status: ExecutionRunStatus): string {
  switch (status) {
    case 'pending':
      return chalk.gray('pending');
    case 'running':
      return chalk.blue('running');
    case 'completed':
      return chalk.green('completed');
    case 'failed':
      return chalk.red('failed');
    case 'cancelled':
      return chalk.yellow('cancelled');
    default:
      return status;
  }
}

/**
 * Format task status with color
 */
function formatTaskStatus(status: ExecutionTaskStatus): string {
  switch (status) {
    case 'pending':
      return chalk.gray('○');
    case 'running':
      return chalk.blue('◐');
    case 'completed':
      return chalk.green('●');
    case 'failed':
      return chalk.red('✗');
    case 'skipped':
      return chalk.yellow('-');
    default:
      return status;
  }
}

/**
 * Mason status command
 */
export const statusCommand = new Command('status')
  .description('Show execution status')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('-a, --all', 'Show all execution runs')
  .action(async (options: { repo?: string; all?: boolean }) => {
    const repoPath = resolve(options.repo ?? process.cwd());

    // Check for config
    const configPath = join(repoPath, 'mason.config.json');
    if (!existsSync(configPath)) {
      console.error(
        chalk.red('Error: Mason not initialized. Run `mason init` first.'),
      );
      process.exit(1);
    }

    // Load config
    let config;
    try {
      const content = readFileSync(configPath, 'utf-8');
      config = MasonConfigSchema.parse(JSON.parse(content));
    } catch {
      console.error(chalk.red('Error: Invalid mason.config.json'));
      process.exit(1);
    }

    // Check for active lock
    const lockPath = getLockfilePath(repoPath, config.dataDir);
    const lock = readLockfile(lockPath);

    // eslint-disable-next-line no-console
    console.log(chalk.bold('\n📊 Mason Status\n'));

    if (lock) {
      // eslint-disable-next-line no-console
      console.log(chalk.blue('⚡ Active execution:'));
      // eslint-disable-next-line no-console
      console.log(chalk.dim(`   ${formatLockInfo(lock)}`));
      // eslint-disable-next-line no-console
      console.log();
    }

    // Open database
    const db = createDatabase(repoPath, config.dataDir);
    const backlogRepo = new BacklogRepository(db);
    const runRepo = new ExecutionRunRepository(db);
    const taskRepo = new ExecutionTaskRepository(db);

    // Show backlog summary
    const counts = backlogRepo.countByStatus();
    // eslint-disable-next-line no-console
    console.log(chalk.bold('Backlog:'));
    // eslint-disable-next-line no-console
    console.log(
      `  ${chalk.gray(counts.new)} new · ${chalk.green(counts.approved)} approved · ${chalk.blue(counts.in_progress)} in progress · ${chalk.green(counts.completed)} completed · ${chalk.red(counts.failed)} failed`,
    );
    // eslint-disable-next-line no-console
    console.log();

    // Get execution runs
    const runs = runRepo.list({ limit: options.all ? 50 : 5 });

    if (runs.length === 0) {
      // eslint-disable-next-line no-console
      console.log(chalk.dim('No execution history yet.'));
      db.close();
      return;
    }

    // Display runs
    // eslint-disable-next-line no-console
    console.log(chalk.bold('Recent Executions:'));

    const table = new Table({
      head: ['Run', 'Status', 'Wave', 'Branch', 'Started'],
      colWidths: [8, 12, 8, 30, 20],
      style: {
        head: ['cyan'],
      },
    });

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i]!;
      const waveProgress =
        run.status === 'running'
          ? `${run.currentWave}/${run.totalWaves}`
          : run.status === 'completed'
            ? `${run.totalWaves}/${run.totalWaves}`
            : '-';

      table.push([
        `#${i + 1}`,
        formatRunStatus(run.status),
        waveProgress,
        run.branchName.slice(0, 28),
        run.startedAt
          ? run.startedAt.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
      ]);
    }

    // eslint-disable-next-line no-console
    console.log(table.toString());

    // Show latest run details if running
    const latestRun = runs[0];
    if (latestRun && latestRun.status === 'running') {
      // eslint-disable-next-line no-console
      console.log(chalk.bold('\nCurrent Run Tasks:'));

      const tasks = taskRepo.getByRunId(latestRun.id);

      for (const task of tasks) {
        const prefix = formatTaskStatus(task.status);
        const desc = task.description.slice(0, 60);
        // eslint-disable-next-line no-console
        console.log(
          `  ${prefix} Wave ${task.wave}, Task ${task.taskNumber}: [${task.subagentType}] ${desc}...`,
        );
      }
    }

    // Show failed run error if applicable
    if (latestRun && latestRun.status === 'failed' && latestRun.errorMessage) {
      // eslint-disable-next-line no-console
      console.log(chalk.red(`\nError: ${latestRun.errorMessage}`));

      if (latestRun.backupBranch) {
        // eslint-disable-next-line no-console
        console.log(
          chalk.dim(`\nTo rollback: git checkout ${latestRun.backupBranch}`),
        );
      }
    }

    db.close();
    // eslint-disable-next-line no-console
    console.log();
  });
