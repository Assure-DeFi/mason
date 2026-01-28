import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import {
  detectStack,
  getStackDescription,
  resolveApiKey,
  saveApiKey,
  isValidApiKeyFormat,
  maskApiKey,
  MasonConfigSchema,
  DEFAULT_DOMAINS,
} from '@mason/core';
import { createDatabase, runMigrations } from '@mason/storage';

/**
 * Mason init command
 */
export const initCommand = new Command('init')
  .description('Initialize Mason in your repository')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options: { repo?: string; yes?: boolean }) => {
    const repoPath = resolve(options.repo ?? process.cwd());

    // eslint-disable-next-line no-console
    console.log(chalk.bold('\n🧱 Mason Setup\n'));

    // Check if already initialized
    const configPath = join(repoPath, 'mason.config.json');
    const dataDir = join(repoPath, '.mason');

    if (existsSync(configPath)) {
      // eslint-disable-next-line no-console
      console.log(
        chalk.yellow('Mason is already initialized in this repository.'),
      );
      // eslint-disable-next-line no-console
      console.log(`Config: ${configPath}`);

      if (!options.yes) {
        const { reinit } = await inquirer.prompt<{ reinit: boolean }>([
          {
            type: 'confirm',
            name: 'reinit',
            message: 'Do you want to reinitialize?',
            default: false,
          },
        ]);

        if (!reinit) {
          return;
        }
      }
    }

    // Step 1: Detect stack
    // eslint-disable-next-line no-console
    console.log(chalk.dim('Detecting project stack...'));
    const stackResult = detectStack(repoPath);
    // eslint-disable-next-line no-console
    console.log(
      `  Stack: ${chalk.cyan(getStackDescription(stackResult))} (${Math.round(stackResult.confidence * 100)}% confidence)`,
    );
    if (stackResult.packageManager) {
      // eslint-disable-next-line no-console
      console.log(
        `  Package manager: ${chalk.cyan(stackResult.packageManager)}`,
      );
    }
    // eslint-disable-next-line no-console
    console.log();

    // Step 2: Check for API key
    // eslint-disable-next-line no-console
    console.log(chalk.dim('Checking API key...'));
    const apiKeyResult = resolveApiKey(repoPath);

    let apiKeyConfigured = false;
    if (apiKeyResult.apiKey) {
      // eslint-disable-next-line no-console
      console.log(
        `  Found: ${chalk.green(maskApiKey(apiKeyResult.apiKey))} (from ${apiKeyResult.source})`,
      );
      if (apiKeyResult.warning) {
        // eslint-disable-next-line no-console
        console.log(chalk.yellow(`  Warning: ${apiKeyResult.warning}`));
      }
      apiKeyConfigured = true;
    } else {
      // eslint-disable-next-line no-console
      console.log(chalk.yellow('  No API key found'));
    }
    // eslint-disable-next-line no-console
    console.log();

    // Step 3: Configure API key if needed
    if (!apiKeyConfigured && !options.yes) {
      // eslint-disable-next-line no-console
      console.log(chalk.bold('API Key Setup'));
      // eslint-disable-next-line no-console
      console.log(
        chalk.dim(
          'Mason requires an Anthropic API key. Get one at https://console.anthropic.com/',
        ),
      );
      // eslint-disable-next-line no-console
      console.log();

      const { keyChoice } = await inquirer.prompt<{ keyChoice: string }>([
        {
          type: 'list',
          name: 'keyChoice',
          message: 'How would you like to provide your API key?',
          choices: [
            {
              name: 'Set ANTHROPIC_API_KEY environment variable (Recommended)',
              value: 'env',
            },
            {
              name: 'Store in ~/.mason/credentials.json',
              value: 'credentials',
            },
            {
              name: "I'll set it up later",
              value: 'later',
            },
          ],
        },
      ]);

      if (keyChoice === 'credentials') {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Anthropic API key:',
            mask: '*',
            validate: (input: string) => {
              if (!input) {
                return 'API key is required';
              }
              if (!isValidApiKeyFormat(input)) {
                return 'Invalid API key format. Should start with sk-ant-';
              }
              return true;
            },
          },
        ]);

        saveApiKey(apiKey);
        // eslint-disable-next-line no-console
        console.log(
          chalk.green('  API key saved to ~/.mason/credentials.json'),
        );
        apiKeyConfigured = true;
      } else if (keyChoice === 'env') {
        // eslint-disable-next-line no-console
        console.log(
          chalk.dim(
            '\nAdd this to your shell profile (~/.bashrc, ~/.zshrc, etc.):',
          ),
        );
        // eslint-disable-next-line no-console
        console.log(
          chalk.cyan('  export ANTHROPIC_API_KEY="your-api-key-here"'),
        );
        // eslint-disable-next-line no-console
        console.log();
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    // Step 4: Configure domains
    let enabledDomains = DEFAULT_DOMAINS.map((d) => d.name);

    if (!options.yes) {
      const { domains } = await inquirer.prompt<{ domains: string[] }>([
        {
          type: 'checkbox',
          name: 'domains',
          message: 'Which improvement domains would you like to analyze?',
          choices: DEFAULT_DOMAINS.map((d) => ({
            name: `${d.name} - ${chalk.dim('weight: ' + d.weight)}`,
            value: d.name,
            checked: d.enabled,
          })),
        },
      ]);
      enabledDomains = domains;
    }

    // Step 5: Create configuration
    // eslint-disable-next-line no-console
    console.log(chalk.dim('\nCreating configuration...'));

    const config = MasonConfigSchema.parse({
      version: 1,
      stack: stackResult.type,
      dataDir: '.mason',
      domains: DEFAULT_DOMAINS.map((d) => ({
        ...d,
        enabled: enabledDomains.includes(d.name),
      })),
    });

    // Write config file
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    // eslint-disable-next-line no-console
    console.log(`  Created ${chalk.cyan('mason.config.json')}`);

    // Step 6: Initialize database
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const db = createDatabase(repoPath, '.mason');
    const migrationResult = runMigrations(db);
    db.close();

    // eslint-disable-next-line no-console
    console.log(
      `  Created ${chalk.cyan('.mason/')} directory (${migrationResult.applied.length} migrations)`,
    );

    // Step 7: Update .gitignore
    const gitignorePath = join(repoPath, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = await import('node:fs').then((fs) =>
        fs.readFileSync(gitignorePath, 'utf-8'),
      );
      if (!gitignore.includes('.mason/')) {
        const fs = await import('node:fs');
        fs.appendFileSync(gitignorePath, '\n# Mason local data\n.mason/\n');
        // eslint-disable-next-line no-console
        console.log(`  Updated ${chalk.cyan('.gitignore')}`);
      }
    }

    // Done
    // eslint-disable-next-line no-console
    console.log(chalk.green('\n✓ Mason initialized successfully!\n'));

    // Next steps
    // eslint-disable-next-line no-console
    console.log(chalk.bold('Next steps:'));
    if (!apiKeyConfigured) {
      // eslint-disable-next-line no-console
      console.log('  1. Set your ANTHROPIC_API_KEY environment variable');
      // eslint-disable-next-line no-console
      console.log('  2. Run: mason doctor');
      // eslint-disable-next-line no-console
      console.log('  3. Run: mason review');
    } else {
      // eslint-disable-next-line no-console
      console.log('  1. Run: mason doctor');
      // eslint-disable-next-line no-console
      console.log('  2. Run: mason review');
    }
    // eslint-disable-next-line no-console
    console.log();
  });
