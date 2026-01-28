import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import Table from 'cli-table3';
import ora from 'ora';
import inquirer from 'inquirer';

import {
  resolveApiKey,
  MasonConfigSchema,
  DEFAULT_DOMAINS,
  analyzeRepository,
  estimateAnalysisCost,
  getFileSummary,
} from '@mason/core';
import {
  createDatabase,
  runMigrations,
  BacklogRepository,
} from '@mason/storage';

/**
 * Priority indicator using filled circles
 */
function getPriorityIndicator(priority: number): string {
  const filled = Math.min(5, Math.round((priority / 19) * 5)); // Max priority is 19 (10*2 - 1)
  const empty = 5 - filled;
  return chalk.yellow('●'.repeat(filled)) + chalk.dim('○'.repeat(empty));
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
 * Mason review command
 */
export const reviewCommand = new Command('review')
  .description('Analyze repository and generate improvement backlog')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('-d, --domain <name>', 'Analyze only a specific domain')
  .option('--no-cache', 'Ignore cached results')
  .option('--thorough', 'Analyze all files (may be expensive)')
  .option('-y, --yes', 'Skip cost confirmation')
  .option('-v, --verbose', 'Verbose output')
  .action(
    async (options: {
      repo?: string;
      domain?: string;
      cache?: boolean;
      thorough?: boolean;
      yes?: boolean;
      verbose?: boolean;
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

      // Get file summary
      // eslint-disable-next-line no-console
      console.log(chalk.bold('\n🔍 Mason Review\n'));

      const spinner = ora('Scanning repository...').start();
      const summary = await getFileSummary(repoPath);
      spinner.stop();

      // eslint-disable-next-line no-console
      console.log(
        chalk.dim(
          `Found ${summary.totalFiles} files (${Object.keys(summary.byExtension).length} types)`,
        ),
      );
      if (summary.largeFiles.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          chalk.dim(`Skipping ${summary.largeFiles.length} large files`),
        );
      }
      // eslint-disable-next-line no-console
      console.log();

      // Determine domains to analyze
      const domains =
        config.domains.length > 0 ? config.domains : DEFAULT_DOMAINS;
      let enabledDomains = domains.filter((d) => d.enabled);

      if (options.domain) {
        enabledDomains = enabledDomains.filter(
          (d) => d.name === options.domain,
        );
        if (enabledDomains.length === 0) {
          console.error(
            chalk.red(`Error: Domain '${options.domain}' not found`),
          );
          process.exit(1);
        }
      }

      // Estimate cost
      const tokensPerDomain = options.thorough ? 100000 : 50000;
      const totalTokens = tokensPerDomain * enabledDomains.length;
      const costEstimate = estimateAnalysisCost(totalTokens);

      // eslint-disable-next-line no-console
      console.log(
        `Analyzing ${chalk.cyan(enabledDomains.length)} domain${enabledDomains.length > 1 ? 's' : ''}`,
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.dim(
          `Estimated cost: ~$${costEstimate.totalCost.toFixed(2)} (${(totalTokens / 1000).toFixed(0)}k tokens)`,
        ),
      );
      // eslint-disable-next-line no-console
      console.log();

      // Confirm if cost is high
      if (
        costEstimate.totalCost > (config.limits?.warnAtCost ?? 1.0) &&
        !options.yes
      ) {
        const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Cost may exceed $${config.limits?.warnAtCost ?? 1.0}. Continue?`,
            default: true,
          },
        ]);

        if (!proceed) {
          // eslint-disable-next-line no-console
          console.log('Cancelled.');
          return;
        }
      }

      // Run analysis
      const progressSpinner = ora('Analyzing...').start();

      const results = await analyzeRepository(
        {
          repoPath,
          apiKey: apiKeyResult.apiKey,
          maxTokensPerDomain: config.limits?.maxTokensPerReview
            ? Math.floor(
                config.limits.maxTokensPerReview / enabledDomains.length,
              )
            : 20000,
          maxFilesPerDomain: config.limits?.maxFilesPerAnalysis ?? 500,
          maxFileSize: config.limits?.maxFileSize ?? 102400,
          ignorePatterns: config.ignore,
        },
        enabledDomains,
        (domain, current, total) => {
          progressSpinner.text = `Analyzing ${domain}... (${current}/${total})`;
        },
      );

      progressSpinner.stop();

      // Collect all improvements
      const allImprovements = results.flatMap((r) =>
        r.improvements.map((imp) => ({
          ...imp,
          domain: r.domain,
          priorityScore: imp.impactScore * 2 - imp.effortScore,
        })),
      );

      // Sort by priority
      allImprovements.sort((a, b) => b.priorityScore - a.priorityScore);

      // Save to database
      const db = createDatabase(repoPath, config.dataDir);
      runMigrations(db);
      const backlogRepo = new BacklogRepository(db);

      for (const imp of allImprovements) {
        backlogRepo.create({
          title: imp.title,
          problem: imp.problem,
          solution: imp.solution,
          impactScore: imp.impactScore,
          effortScore: imp.effortScore,
          domain: imp.domain,
          complexity: imp.complexity,
        });
      }

      db.close();

      // Calculate totals
      const totalTokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0);
      const totalFilesAnalyzed = results.reduce(
        (sum, r) => sum + r.filesAnalyzed.length,
        0,
      );

      // Display results
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          '\n┌─────────────────────────────────────────────────────────────┐',
        ),
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          '│ Mason Review Complete                                       │',
        ),
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          '├─────────────────────────────────────────────────────────────┤',
        ),
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          `│ Analyzed: ${enabledDomains.length} domains · ${totalFilesAnalyzed} files · ${(totalTokensUsed / 1000).toFixed(1)}k tokens`.padEnd(
            62,
          ) + '│',
        ),
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          `│ Found: ${allImprovements.length} improvements`.padEnd(62) + '│',
        ),
      );
      // eslint-disable-next-line no-console
      console.log(
        chalk.bold(
          '└─────────────────────────────────────────────────────────────┘',
        ),
      );
      // eslint-disable-next-line no-console
      console.log();

      // Display table
      if (allImprovements.length > 0) {
        const table = new Table({
          head: ['#', 'Priority', '', 'Domain', 'Title'],
          colWidths: [4, 8, 9, 15, 40],
          style: {
            head: ['cyan'],
          },
        });

        for (let i = 0; i < Math.min(15, allImprovements.length); i++) {
          const imp = allImprovements[i]!;
          table.push([
            String(i + 1),
            String(imp.priorityScore),
            getPriorityIndicator(imp.priorityScore),
            truncate(imp.domain, 13),
            truncate(imp.title, 38),
          ]);
        }

        // eslint-disable-next-line no-console
        console.log(table.toString());

        if (allImprovements.length > 15) {
          // eslint-disable-next-line no-console
          console.log(
            chalk.dim(
              `\n... and ${allImprovements.length - 15} more. Run \`mason list\` to see all.`,
            ),
          );
        }

        // eslint-disable-next-line no-console
        console.log(chalk.bold('\nNext steps:'));
        // eslint-disable-next-line no-console
        console.log('  mason approve 1 2 3    # Approve specific items');
        // eslint-disable-next-line no-console
        console.log('  mason show 1           # View item details');
        // eslint-disable-next-line no-console
        console.log('  mason execute --top 3  # Execute top 3 approved items');
      } else {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow('No improvements found.'));
      }
      // eslint-disable-next-line no-console
      console.log();
    },
  );
