import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

interface MasonConfig {
  version: number;
  supabase: {
    url: string;
    anonKey: string;
  };
  dashboardUrl: string;
  domains: Array<{
    name: string;
    enabled: boolean;
    weight: number;
  }>;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

/**
 * Mason doctor command - Verify setup
 */
export const doctorCommand = new Command('doctor')
  .description('Check Mason setup and environment')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .action(async (options: { repo?: string }) => {
    const repoPath = resolve(options.repo ?? process.cwd());
    const results: CheckResult[] = [];

    console.log(chalk.bold('\n🔍 Mason Doctor\n'));
    console.log(chalk.dim('Checking your Mason setup...\n'));

    // Check 1: Configuration file
    const configPath = join(repoPath, 'mason.config.json');
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        const config: MasonConfig = JSON.parse(configContent);

        if (config.version !== 1) {
          results.push({
            name: 'Configuration file',
            status: 'warn',
            message: `Unexpected version: ${config.version}`,
            fix: 'Run `mason init` to update',
          });
        } else {
          results.push({
            name: 'Configuration file',
            status: 'pass',
            message: 'mason.config.json found and valid',
          });
        }

        // Check Supabase config
        if (config.supabase?.url && config.supabase?.anonKey) {
          results.push({
            name: 'Supabase configuration',
            status: 'pass',
            message: `URL: ${config.supabase.url.slice(0, 30)}...`,
          });
        } else {
          results.push({
            name: 'Supabase configuration',
            status: 'fail',
            message: 'Missing Supabase credentials',
            fix: 'Add supabase.url and supabase.anonKey to mason.config.json',
          });
        }

        // Check dashboard URL
        if (config.dashboardUrl) {
          results.push({
            name: 'Dashboard URL',
            status: 'pass',
            message: config.dashboardUrl,
          });
        } else {
          results.push({
            name: 'Dashboard URL',
            status: 'warn',
            message: 'Not configured',
            fix: 'Add dashboardUrl to mason.config.json',
          });
        }
      } catch {
        results.push({
          name: 'Configuration file',
          status: 'fail',
          message: 'Invalid JSON in mason.config.json',
          fix: 'Fix JSON syntax or run `mason init`',
        });
      }
    } else {
      results.push({
        name: 'Configuration file',
        status: 'fail',
        message: 'mason.config.json not found',
        fix: 'Run `mason init` to create it',
      });
    }

    // Check 2: Claude Code commands
    const commandsDir = join(repoPath, '.claude', 'commands');
    const pmReviewPath = join(commandsDir, 'pm-review.md');
    const executeApprovedPath = join(commandsDir, 'execute-approved.md');

    if (existsSync(pmReviewPath) && existsSync(executeApprovedPath)) {
      results.push({
        name: 'Claude Code commands',
        status: 'pass',
        message: 'pm-review.md and execute-approved.md found',
      });
    } else {
      const missing = [];
      if (!existsSync(pmReviewPath)) missing.push('pm-review.md');
      if (!existsSync(executeApprovedPath)) missing.push('execute-approved.md');

      results.push({
        name: 'Claude Code commands',
        status: 'fail',
        message: `Missing: ${missing.join(', ')}`,
        fix: 'Run `mason init` to create commands',
      });
    }

    // Check 3: PM domain knowledge skill
    const skillPath = join(
      repoPath,
      '.claude',
      'skills',
      'pm-domain-knowledge',
      'SKILL.md',
    );
    if (existsSync(skillPath)) {
      results.push({
        name: 'PM domain knowledge',
        status: 'pass',
        message: 'SKILL.md found',
      });
    } else {
      results.push({
        name: 'PM domain knowledge',
        status: 'warn',
        message: 'SKILL.md not found',
        fix: 'Run `mason init` or create .claude/skills/pm-domain-knowledge/SKILL.md',
      });
    }

    // Check 4: Supabase migrations
    const migrationsDir = join(repoPath, 'supabase', 'migrations');
    const migration1 = join(migrationsDir, '001_pm_backlog_tables.sql');
    const migration2 = join(migrationsDir, '002_pm_execution_runs.sql');
    const migration3 = join(migrationsDir, '003_pm_execution_tasks.sql');

    if (
      existsSync(migration1) &&
      existsSync(migration2) &&
      existsSync(migration3)
    ) {
      results.push({
        name: 'Supabase migrations',
        status: 'pass',
        message: 'All migration files present',
      });
    } else {
      const missing = [];
      if (!existsSync(migration1)) missing.push('001');
      if (!existsSync(migration2)) missing.push('002');
      if (!existsSync(migration3)) missing.push('003');

      results.push({
        name: 'Supabase migrations',
        status: 'fail',
        message: `Missing migrations: ${missing.join(', ')}`,
        fix: 'Run `mason init` to create migration files',
      });
    }

    // Check 5: Anthropic API key (optional, for dashboard PRD generation)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      results.push({
        name: 'Anthropic API key',
        status: 'pass',
        message: `Set in environment (${anthropicKey.slice(0, 10)}...)`,
      });
    } else {
      results.push({
        name: 'Anthropic API key',
        status: 'warn',
        message: 'Not set (optional, for dashboard PRD generation)',
        fix: 'Set ANTHROPIC_API_KEY environment variable',
      });
    }

    // Check 6: Dashboard directory
    const dashboardDir = join(repoPath, 'mason-dashboard');
    const dashboardEnv = join(dashboardDir, '.env.local');
    if (existsSync(dashboardDir)) {
      if (existsSync(dashboardEnv)) {
        results.push({
          name: 'Dashboard setup',
          status: 'pass',
          message: 'mason-dashboard directory with .env.local found',
        });
      } else {
        results.push({
          name: 'Dashboard setup',
          status: 'warn',
          message: 'mason-dashboard exists but missing .env.local',
          fix: 'Create mason-dashboard/.env.local with Supabase credentials',
        });
      }
    } else {
      results.push({
        name: 'Dashboard setup',
        status: 'warn',
        message: 'mason-dashboard directory not found',
        fix: 'Copy dashboard template or run `mason init`',
      });
    }

    // Print results
    console.log(chalk.bold('Results:\n'));

    for (const result of results) {
      const icon =
        result.status === 'pass'
          ? chalk.green('✓')
          : result.status === 'fail'
            ? chalk.red('✗')
            : chalk.yellow('⚠');

      const statusColor =
        result.status === 'pass'
          ? chalk.green
          : result.status === 'fail'
            ? chalk.red
            : chalk.yellow;

      console.log(`  ${icon} ${chalk.bold(result.name)}`);
      console.log(`    ${statusColor(result.message)}`);
      if (result.fix) {
        console.log(`    ${chalk.dim(`Fix: ${result.fix}`)}`);
      }
      console.log();
    }

    // Summary
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const warned = results.filter((r) => r.status === 'warn').length;

    console.log(chalk.bold('\nSummary:'));
    console.log(
      `  ${chalk.green(passed + ' passed')}, ${chalk.red(failed + ' failed')}, ${chalk.yellow(warned + ' warnings')}`,
    );

    if (failed > 0) {
      console.log(
        chalk.red('\nSome checks failed. Fix the issues above to proceed.\n'),
      );
      process.exit(1);
    } else if (warned > 0) {
      console.log(
        chalk.yellow(
          '\nSetup complete with warnings. Some features may be limited.\n',
        ),
      );
    } else {
      console.log(chalk.green('\nAll checks passed! Mason is ready to use.\n'));
    }

    console.log(chalk.bold('Next steps:'));
    console.log('  1. Run the SQL migrations in Supabase');
    console.log('  2. Open Claude Code and run /pm-review');
    console.log('  3. View results in the dashboard\n');
  });
