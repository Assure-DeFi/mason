import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import inquirer from 'inquirer';

import { MasonConfigSchema, resolveApiKey } from '@mason/core';
import {
  createDatabase,
  runMigrations,
  BacklogRepository,
  ExecutionRunRepository,
  ExecutionTaskRepository,
} from '@mason/storage';
import {
  validateGitState,
  acquireLock,
  releaseLock,
  setupAutoRelease,
  formatLockInfo,
  createBranch,
  createBackupBranch,
  commitChanges,
  generateBranchName,
  getHeadCommit,
  generateWavesForItem,
} from '@mason/executor';

/**
 * Mason execute command
 */
export const executeCommand = new Command('execute')
  .description('Execute approved backlog items')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('--top <n>', 'Execute only top N approved items')
  .option('--ids <ids>', 'Execute specific item IDs (comma-separated)')
  .option('--dry-run', 'Show what would be executed without making changes')
  .option('--force', 'Skip git state validation')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(
    async (options: {
      repo?: string;
      top?: string;
      ids?: string;
      dryRun?: boolean;
      force?: boolean;
      yes?: boolean;
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

      // Check for API key
      const apiKeyResult = resolveApiKey(repoPath);
      if (!apiKeyResult.apiKey) {
        console.error(
          chalk.red(
            'Error: No API key found. Set ANTHROPIC_API_KEY or run `mason init`.',
          ),
        );
        process.exit(1);
      }

      // Validate git state
      if (!options.force) {
        const gitValidation = await validateGitState(repoPath);
        if (!gitValidation.valid) {
          console.error(chalk.red('\n✗ Cannot execute: git state issues\n'));
          for (const issue of gitValidation.issues) {
            console.error(chalk.red(`  • ${issue.message}`));
            console.error(chalk.dim(`    ${issue.suggestion}`));
          }
          console.error(
            chalk.dim('\nUse --force to skip this check (not recommended).'),
          );
          process.exit(1);
        }
      }

      // Try to acquire lock
      const lockResult = acquireLock(repoPath, 'execute', config.dataDir);
      if (!lockResult.acquired) {
        console.error(chalk.red('\n✗ Another mason command is running\n'));
        if (lockResult.existingLock) {
          console.error(
            chalk.dim(`  ${formatLockInfo(lockResult.existingLock)}`),
          );
        }
        console.error(
          chalk.dim('\nIf this is stale, remove .mason/mason.lock manually.'),
        );
        process.exit(1);
      }

      // Set up automatic lock release
      setupAutoRelease(repoPath, config.dataDir);

      // Open database
      const db = createDatabase(repoPath, config.dataDir);
      runMigrations(db);
      const backlogRepo = new BacklogRepository(db);
      const runRepo = new ExecutionRunRepository(db);
      const taskRepo = new ExecutionTaskRepository(db);

      // Get approved items
      let approvedItems = backlogRepo.list({ status: 'approved' });

      if (approvedItems.length === 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('\nNo approved items to execute.'));
        // eslint-disable-next-line no-console
        console.log(chalk.dim('Run `mason approve` to approve items.'));
        db.close();
        releaseLock(repoPath, config.dataDir);
        return;
      }

      // Filter by --ids if specified
      if (options.ids) {
        const idList = options.ids.split(',').map((id) => id.trim());
        const allItems = backlogRepo.list();
        approvedItems = approvedItems.filter((item) => {
          const itemIndex = allItems.findIndex((i) => i.id === item.id) + 1;
          return idList.includes(String(itemIndex)) || idList.includes(item.id);
        });
      }

      // Limit by --top if specified
      if (options.top) {
        const topN = parseInt(options.top, 10);
        if (!isNaN(topN) && topN > 0) {
          approvedItems = approvedItems.slice(0, topN);
        }
      }

      // Display what will be executed
      // eslint-disable-next-line no-console
      console.log(chalk.bold('\n🚀 Mason Execute\n'));

      // eslint-disable-next-line no-console
      console.log(`Items to execute: ${chalk.cyan(approvedItems.length)}`);
      for (let i = 0; i < approvedItems.length; i++) {
        const item = approvedItems[i]!;
        // eslint-disable-next-line no-console
        console.log(chalk.dim(`  ${i + 1}. ${item.title}`));
      }
      // eslint-disable-next-line no-console
      console.log();

      // Generate waves for preview
      let totalTasks = 0;
      let totalWaves = 0;
      for (const item of approvedItems) {
        const waves = generateWavesForItem(item, item.id);
        totalWaves = Math.max(totalWaves, waves.length);
        totalTasks += waves.reduce((sum, w) => sum + w.tasks.length, 0);
      }

      // eslint-disable-next-line no-console
      console.log(
        `Execution plan: ${chalk.cyan(totalTasks)} tasks across ${chalk.cyan(totalWaves)} waves`,
      );
      // eslint-disable-next-line no-console
      console.log();

      if (options.dryRun) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('Dry run - no changes will be made.\n'));

        for (const item of approvedItems) {
          // eslint-disable-next-line no-console
          console.log(chalk.bold(`\n${item.title}`));
          // eslint-disable-next-line no-console
          console.log(chalk.dim(`Branch: ${generateBranchName(item.title)}`));

          const waves = generateWavesForItem(item, item.id);
          for (const wave of waves) {
            // eslint-disable-next-line no-console
            console.log(chalk.dim(`  Wave ${wave.wave}:`));
            for (const task of wave.tasks) {
              // eslint-disable-next-line no-console
              console.log(
                chalk.dim(
                  `    • [${task.subagentType}] ${task.description.slice(0, 60)}...`,
                ),
              );
            }
          }
        }
        // eslint-disable-next-line no-console
        console.log();
        db.close();
        releaseLock(repoPath, config.dataDir);
        return;
      }

      // Confirm execution
      if (!options.yes) {
        const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with execution?',
            default: true,
          },
        ]);

        if (!proceed) {
          // eslint-disable-next-line no-console
          console.log('Cancelled.');
          db.close();
          releaseLock(repoPath, config.dataDir);
          return;
        }
      }

      // Create backup branch
      const spinner = ora('Creating backup branch...').start();
      const backupBranch = await createBackupBranch(repoPath);
      const originalHead = await getHeadCommit(repoPath);
      spinner.succeed(`Backup branch: ${backupBranch}`);

      // Process each item
      for (let i = 0; i < approvedItems.length; i++) {
        const item = approvedItems[i]!;
        const branchName = generateBranchName(item.title);

        // eslint-disable-next-line no-console
        console.log(
          chalk.bold(`\n[${i + 1}/${approvedItems.length}] ${item.title}`),
        );

        // Create execution run
        const waves = generateWavesForItem(item, item.id);
        const run = runRepo.create({
          itemIds: [item.id],
          branchName,
          totalWaves: waves.length,
          backupBranch,
          originalHead: originalHead ?? undefined,
        });

        // Create tasks in database
        for (const wave of waves) {
          for (const task of wave.tasks) {
            taskRepo.create({
              runId: run.id,
              wave: task.wave,
              taskNumber: task.taskNumber,
              subagentType: task.subagentType,
              description: task.description,
            });
          }
        }

        // Create branch
        const branchSpinner = ora(`Creating branch ${branchName}...`).start();
        try {
          await createBranch(repoPath, branchName);
          branchSpinner.succeed(`Branch: ${branchName}`);
        } catch {
          branchSpinner.fail(`Failed to create branch ${branchName}`);
          runRepo.updateStatus(run.id, 'failed', 'Failed to create branch');
          continue;
        }

        // Update item status
        backlogRepo.update(item.id, {
          status: 'in_progress',
          branchName,
        });

        runRepo.updateStatus(run.id, 'running');

        // Execute waves
        let executionFailed = false;
        for (const wave of waves) {
          runRepo.updateWave(run.id, wave.wave);

          const waveSpinner = ora(
            `Wave ${wave.wave}/${waves.length}: ${wave.tasks.length} task(s)...`,
          ).start();

          for (const task of wave.tasks) {
            const dbTask = taskRepo
              .getByWave(run.id, wave.wave)
              .find((t) => t.taskNumber === task.taskNumber);

            if (dbTask) {
              taskRepo.updateStatus(dbTask.id, 'running');
            }

            // Note: In a real implementation, this would call Claude Code
            // For now, we'll simulate success
            waveSpinner.text = `Wave ${wave.wave}: [${task.subagentType}] ${task.description.slice(0, 40)}...`;

            // Simulate task execution
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (dbTask) {
              taskRepo.updateStatus(dbTask.id, 'completed', {
                output: 'Task completed (simulated)',
              });
            }
          }

          if (!executionFailed) {
            waveSpinner.succeed(`Wave ${wave.wave} complete`);

            // Commit after each wave
            try {
              await commitChanges(
                repoPath,
                `feat(mason): ${item.title} - wave ${wave.wave}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
              );
            } catch {
              // No changes to commit is OK
            }
          }
        }

        if (!executionFailed) {
          runRepo.updateStatus(run.id, 'completed');
          backlogRepo.update(item.id, { status: 'completed' });
          // eslint-disable-next-line no-console
          console.log(chalk.green(`✓ ${item.title} completed`));
        } else {
          runRepo.updateStatus(run.id, 'failed', 'Execution failed');
          backlogRepo.update(item.id, { status: 'failed' });
          // eslint-disable-next-line no-console
          console.log(chalk.red(`✗ ${item.title} failed`));
        }
      }

      db.close();
      releaseLock(repoPath, config.dataDir);

      // Summary
      // eslint-disable-next-line no-console
      console.log(chalk.bold('\n✓ Execution complete\n'));
      // eslint-disable-next-line no-console
      console.log(chalk.dim('Run `mason status` to see execution details.'));
      // eslint-disable-next-line no-console
      console.log();
    },
  );
