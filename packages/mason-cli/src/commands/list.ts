import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import Table from 'cli-table3';

import { MasonConfigSchema } from '@mason/core';
import { createDatabase, BacklogRepository } from '@mason/storage';

import type { BacklogItemStatus } from '@mason/storage';

/**
 * Priority indicator using filled circles
 */
function getPriorityIndicator(priority: number): string {
  const filled = Math.min(5, Math.round((priority / 19) * 5));
  const empty = 5 - filled;
  return chalk.yellow('●'.repeat(filled)) + chalk.dim('○'.repeat(empty));
}

/**
 * Format status with color
 */
function formatStatus(status: BacklogItemStatus): string {
  switch (status) {
    case 'new':
      return chalk.gray('new');
    case 'approved':
      return chalk.green('approved');
    case 'in_progress':
      return chalk.blue('in_progress');
    case 'completed':
      return chalk.green('completed');
    case 'failed':
      return chalk.red('failed');
    default:
      return status;
  }
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Mason list command
 */
export const listCommand = new Command('list')
  .description('List backlog items')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option(
    '-s, --status <status>',
    'Filter by status (new, approved, in_progress, completed, failed)',
  )
  .option('-d, --domain <name>', 'Filter by domain')
  .option('-n, --limit <number>', 'Maximum items to show', '20')
  .action(
    async (options: {
      repo?: string;
      status?: string;
      domain?: string;
      limit?: string;
    }) => {
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

      // Open database
      const db = createDatabase(repoPath, config.dataDir);
      const backlogRepo = new BacklogRepository(db);

      // Get items
      const items = backlogRepo.list({
        status: options.status as BacklogItemStatus | undefined,
        domain: options.domain,
        limit: parseInt(options.limit ?? '20', 10),
      });

      db.close();

      // Display
      // eslint-disable-next-line no-console
      console.log(chalk.bold('\n📋 Mason Backlog\n'));

      if (items.length === 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('No items found.'));
        // eslint-disable-next-line no-console
        console.log(
          chalk.dim('Run `mason review` to analyze your repository.'),
        );
        // eslint-disable-next-line no-console
        console.log();
        return;
      }

      const table = new Table({
        head: ['#', 'Priority', '', 'Status', 'Domain', 'Title'],
        colWidths: [4, 8, 9, 12, 15, 35],
        style: {
          head: ['cyan'],
        },
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        table.push([
          String(i + 1),
          String(item.priorityScore),
          getPriorityIndicator(item.priorityScore),
          formatStatus(item.status),
          truncate(item.domain, 13),
          truncate(item.title, 33),
        ]);
      }

      // eslint-disable-next-line no-console
      console.log(table.toString());

      // Show counts by status
      const counts = backlogRepo.countByStatus();
      const countParts: string[] = [];
      if (counts.new > 0) {
        countParts.push(`${counts.new} new`);
      }
      if (counts.approved > 0) {
        countParts.push(`${counts.approved} approved`);
      }
      if (counts.in_progress > 0) {
        countParts.push(`${counts.in_progress} in progress`);
      }
      if (counts.completed > 0) {
        countParts.push(`${counts.completed} completed`);
      }

      if (countParts.length > 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.dim(`\nTotal: ${countParts.join(' · ')}`));
      }
      // eslint-disable-next-line no-console
      console.log();
    },
  );
