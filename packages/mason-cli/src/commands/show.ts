import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import { MasonConfigSchema } from '@mason/core';
import { createDatabase, BacklogRepository } from '@mason/storage';

import type { BacklogItem } from '@mason/storage';

/**
 * Format complexity with color
 */
function formatComplexity(complexity: string): string {
  switch (complexity) {
    case 'low':
      return chalk.green('Low');
    case 'medium':
      return chalk.yellow('Medium');
    case 'high':
      return chalk.red('High');
    case 'very_high':
      return chalk.red.bold('Very High');
    default:
      return complexity;
  }
}

/**
 * Format status with color
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'new':
      return chalk.gray('New');
    case 'approved':
      return chalk.green('Approved');
    case 'in_progress':
      return chalk.blue('In Progress');
    case 'completed':
      return chalk.green('Completed');
    case 'failed':
      return chalk.red('Failed');
    default:
      return status;
  }
}

/**
 * Display a single backlog item
 */
function displayItem(item: BacklogItem, index: number): void {
  // eslint-disable-next-line no-console
  console.log(chalk.bold(`\n#${index} ${item.title}\n`));

  // eslint-disable-next-line no-console
  console.log(
    `${chalk.dim('Priority:')} ${chalk.yellow(item.priorityScore)} (Impact: ${item.impactScore}, Effort: ${item.effortScore})`,
  );
  // eslint-disable-next-line no-console
  console.log(`${chalk.dim('Domain:')} ${item.domain}`);
  // eslint-disable-next-line no-console
  console.log(
    `${chalk.dim('Complexity:')} ${formatComplexity(item.complexity)}`,
  );
  // eslint-disable-next-line no-console
  console.log(`${chalk.dim('Status:')} ${formatStatus(item.status)}`);

  if (item.branchName) {
    // eslint-disable-next-line no-console
    console.log(`${chalk.dim('Branch:')} ${item.branchName}`);
  }

  // eslint-disable-next-line no-console
  console.log();
  // eslint-disable-next-line no-console
  console.log(chalk.bold('Problem:'));
  // eslint-disable-next-line no-console
  console.log(item.problem);

  // eslint-disable-next-line no-console
  console.log();
  // eslint-disable-next-line no-console
  console.log(chalk.bold('Solution:'));
  // eslint-disable-next-line no-console
  console.log(item.solution);

  if (item.prdContent) {
    // eslint-disable-next-line no-console
    console.log();
    // eslint-disable-next-line no-console
    console.log(chalk.bold('PRD:'));
    // eslint-disable-next-line no-console
    console.log(chalk.dim('─'.repeat(60)));
    // eslint-disable-next-line no-console
    console.log(item.prdContent);
    // eslint-disable-next-line no-console
    console.log(chalk.dim('─'.repeat(60)));
  }

  // eslint-disable-next-line no-console
  console.log();
  // eslint-disable-next-line no-console
  console.log(chalk.dim(`ID: ${item.id}`));
  // eslint-disable-next-line no-console
  console.log(
    chalk.dim(
      `Created: ${item.createdAt.toLocaleDateString()} ${item.createdAt.toLocaleTimeString()}`,
    ),
  );
}

/**
 * Mason show command
 */
export const showCommand = new Command('show')
  .description('Show details of a backlog item')
  .argument('<number>', 'Item number (from mason list)')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .action(async (number: string, options: { repo?: string }) => {
    const repoPath = resolve(options.repo ?? process.cwd());
    const itemNumber = parseInt(number, 10);

    if (isNaN(itemNumber) || itemNumber < 1) {
      console.error(chalk.red('Error: Invalid item number'));
      process.exit(1);
    }

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

    // Get item by position
    const items = backlogRepo.list({ limit: itemNumber });
    const item = items[itemNumber - 1];

    db.close();

    if (!item) {
      console.error(chalk.red(`Error: Item #${itemNumber} not found`));
      process.exit(1);
    }

    displayItem(item, itemNumber);
  });
