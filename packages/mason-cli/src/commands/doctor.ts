import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';

import {
  detectStack,
  getStackDescription,
  resolveApiKey,
  maskApiKey,
  getApiKeySourceDescription,
} from '@mason/core';
import { createDatabase, getMigrationStatus } from '@mason/storage';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

/**
 * Run a single check
 */
function formatCheck(result: CheckResult): string {
  const icon =
    result.status === 'pass'
      ? chalk.green('✓')
      : result.status === 'warn'
        ? chalk.yellow('⚠')
        : chalk.red('✗');

  const color =
    result.status === 'pass'
      ? chalk.green
      : result.status === 'warn'
        ? chalk.yellow
        : chalk.red;

  let output = `${icon} ${result.name}: ${color(result.message)}`;
  if (result.details) {
    output += chalk.dim(`\n    ${result.details}`);
  }
  return output;
}

/**
 * Check Git repository
 */
async function checkGit(repoPath: string): Promise<CheckResult> {
  const gitDir = join(repoPath, '.git');

  if (!existsSync(gitDir)) {
    return {
      name: 'Git',
      status: 'fail',
      message: 'Not a git repository',
      details: 'Run `git init` to initialize a git repository',
    };
  }

  // Check for uncommitted changes
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: repoPath,
    });

    if (stdout.trim()) {
      return {
        name: 'Git',
        status: 'warn',
        message: 'Uncommitted changes detected',
        details: 'Consider committing changes before running mason execute',
      };
    }

    return {
      name: 'Git',
      status: 'pass',
      message: 'Clean working directory',
    };
  } catch {
    return {
      name: 'Git',
      status: 'fail',
      message: 'Could not check git status',
    };
  }
}

/**
 * Check Node.js version
 */
function checkNode(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10);

  if (major < 18) {
    return {
      name: 'Node.js',
      status: 'fail',
      message: `${version} (requires >= 18.0.0)`,
    };
  }

  return {
    name: 'Node.js',
    status: 'pass',
    message: version,
  };
}

/**
 * Check API key
 */
function checkApiKey(repoPath: string): CheckResult {
  const result = resolveApiKey(repoPath);

  if (!result.apiKey) {
    return {
      name: 'API Key',
      status: 'fail',
      message: 'Not found',
      details:
        'Set ANTHROPIC_API_KEY environment variable or run `mason init` to configure',
    };
  }

  if (result.warning) {
    return {
      name: 'API Key',
      status: 'warn',
      message: `${maskApiKey(result.apiKey)} (${getApiKeySourceDescription(result.source)})`,
      details: result.warning,
    };
  }

  return {
    name: 'API Key',
    status: 'pass',
    message: `${maskApiKey(result.apiKey)} (${getApiKeySourceDescription(result.source)})`,
  };
}

/**
 * Check Mason configuration
 */
function checkConfig(repoPath: string): CheckResult {
  const configPath = join(repoPath, 'mason.config.json');

  if (!existsSync(configPath)) {
    return {
      name: 'Config',
      status: 'fail',
      message: 'Not found',
      details: 'Run `mason init` to create configuration',
    };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as { version?: number };

    return {
      name: 'Config',
      status: 'pass',
      message: `mason.config.json (v${config.version ?? 1})`,
    };
  } catch {
    return {
      name: 'Config',
      status: 'fail',
      message: 'Invalid configuration',
      details: 'mason.config.json contains invalid JSON',
    };
  }
}

/**
 * Check database
 */
function checkDatabase(repoPath: string): CheckResult {
  const dataDir = join(repoPath, '.mason');
  const dbPath = join(dataDir, 'mason.db');

  if (!existsSync(dataDir)) {
    return {
      name: 'Database',
      status: 'fail',
      message: '.mason directory not found',
      details: 'Run `mason init` to create database',
    };
  }

  if (!existsSync(dbPath)) {
    return {
      name: 'Database',
      status: 'fail',
      message: 'Database not found',
      details: 'Run `mason init` to create database',
    };
  }

  try {
    const db = createDatabase(repoPath, '.mason');
    const status = getMigrationStatus(db);
    db.close();

    if (status.pendingCount > 0) {
      return {
        name: 'Database',
        status: 'warn',
        message: `${status.pendingCount} pending migrations`,
        details: 'Run mason to apply migrations',
      };
    }

    return {
      name: 'Database',
      status: 'pass',
      message: `Schema v${status.currentVersion}`,
    };
  } catch (err) {
    return {
      name: 'Database',
      status: 'fail',
      message: 'Could not connect to database',
      details: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check stack detection
 */
function checkStack(repoPath: string): CheckResult {
  const result = detectStack(repoPath);

  if (result.type === 'unknown') {
    return {
      name: 'Stack',
      status: 'warn',
      message: 'Unknown',
      details: 'Could not detect project type. Analysis may be limited.',
    };
  }

  return {
    name: 'Stack',
    status: 'pass',
    message: getStackDescription(result),
  };
}

/**
 * Mason doctor command
 */
export const doctorCommand = new Command('doctor')
  .description('Check your Mason setup and environment')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .action(async (options: { repo?: string }) => {
    const repoPath = resolve(options.repo ?? process.cwd());

    // eslint-disable-next-line no-console
    console.log(chalk.bold('\n🔍 Mason Doctor\n'));
    // eslint-disable-next-line no-console
    console.log(chalk.dim(`Checking ${repoPath}\n`));

    // Run all checks
    const checks: CheckResult[] = [
      checkNode(),
      await checkGit(repoPath),
      checkConfig(repoPath),
      checkApiKey(repoPath),
      checkDatabase(repoPath),
      checkStack(repoPath),
    ];

    // Display results
    for (const check of checks) {
      // eslint-disable-next-line no-console
      console.log(formatCheck(check));
    }

    // Summary
    const passed = checks.filter((c) => c.status === 'pass').length;
    const warnings = checks.filter((c) => c.status === 'warn').length;
    const failed = checks.filter((c) => c.status === 'fail').length;

    // eslint-disable-next-line no-console
    console.log();

    if (failed > 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.red(`${failed} check(s) failed. Please fix the issues above.`),
      );
      process.exit(1);
    } else if (warnings > 0) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.yellow(
          `All checks passed with ${warnings} warning(s). Mason is ready.`,
        ),
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(chalk.green(`All ${passed} checks passed. Mason is ready!`));
    }
    // eslint-disable-next-line no-console
    console.log();
  });
