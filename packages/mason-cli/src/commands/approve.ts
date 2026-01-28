import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import { MasonConfigSchema } from '@mason/core';
import { createDatabase, BacklogRepository } from '@mason/storage';

/**
 * Mason approve command
 */
export const approveCommand = new Command('approve')
  .description('Approve backlog items for execution')
  .argument('[numbers...]', 'Item numbers to approve (e.g., 1 2 3)')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('-i, --interactive', 'Interactive selection mode')
  .action(
    async (
      numbers: string[],
      options: { repo?: string; interactive?: boolean },
    ) => {
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

      // Get all new items
      const newItems = backlogRepo.list({ status: 'new' });

      if (newItems.length === 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('\nNo new items to approve.'));
        // eslint-disable-next-line no-console
        console.log(
          chalk.dim('Run `mason review` to analyze your repository.'),
        );
        db.close();
        return;
      }

      let selectedIds: string[] = [];

      if (options.interactive || numbers.length === 0) {
        // Interactive mode
        const { selected } = await inquirer.prompt<{ selected: string[] }>([
          {
            type: 'checkbox',
            name: 'selected',
            message: 'Select items to approve:',
            choices: newItems.map((item, i) => ({
              name: `${i + 1}. [${item.priorityScore}] ${item.title} (${item.domain})`,
              value: item.id,
              checked: false,
            })),
            pageSize: 15,
          },
        ]);

        selectedIds = selected;
      } else {
        // Number-based mode
        const allItems = backlogRepo.list();

        for (const num of numbers) {
          const index = parseInt(num, 10) - 1;
          if (index >= 0 && index < allItems.length) {
            const item = allItems[index];
            if (item && item.status === 'new') {
              selectedIds.push(item.id);
            } else if (item) {
              // eslint-disable-next-line no-console
              console.log(
                chalk.yellow(
                  `Item #${num} is already ${item.status}, skipping.`,
                ),
              );
            }
          } else {
            console.error(chalk.red(`Invalid item number: ${num}`));
          }
        }
      }

      if (selectedIds.length === 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('\nNo items selected.'));
        db.close();
        return;
      }

      // Approve selected items
      const approvedCount = backlogRepo.approveMany(selectedIds);
      db.close();

      // eslint-disable-next-line no-console
      console.log(
        chalk.green(
          `\n✓ Approved ${approvedCount} item${approvedCount > 1 ? 's' : ''}\n`,
        ),
      );

      // eslint-disable-next-line no-console
      console.log(chalk.bold('Next steps:'));
      // eslint-disable-next-line no-console
      console.log('  mason execute             # Execute all approved items');
      // eslint-disable-next-line no-console
      console.log('  mason execute --top 3     # Execute top 3 approved items');
      // eslint-disable-next-line no-console
      console.log('  mason list --status approved  # View approved items');
      // eslint-disable-next-line no-console
      console.log();
    },
  );
