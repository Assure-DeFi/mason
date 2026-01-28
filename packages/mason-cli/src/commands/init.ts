import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';

// Default config structure
const DEFAULT_CONFIG = {
  version: 1,
  supabase: {
    url: '',
    anonKey: '',
  },
  dashboardUrl: '',
  domains: [
    { name: 'frontend-ux', enabled: true, weight: 1 },
    { name: 'api-backend', enabled: true, weight: 1 },
    { name: 'reliability', enabled: true, weight: 1 },
    { name: 'security', enabled: true, weight: 1.2 },
    { name: 'code-quality', enabled: true, weight: 0.8 },
  ],
};

interface WizardState {
  repoPath: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  anthropicApiKey: string;
  dashboardChoice: 'vercel' | 'local' | 'skip';
  dashboardUrl: string;
}

/**
 * Mason init command - Setup wizard
 */
export const initCommand = new Command('init')
  .description('Initialize Mason in your repository (setup wizard)')
  .option(
    '-r, --repo <path>',
    'Path to repository (default: current directory)',
  )
  .option('-y, --yes', 'Skip prompts and use defaults (requires env vars)')
  .action(async (options: { repo?: string; yes?: boolean }) => {
    const repoPath = resolve(options.repo ?? process.cwd());

    console.log(chalk.bold('\n🔧 Mason Setup Wizard\n'));
    console.log(
      chalk.dim(
        'Mason helps you continuously improve your codebase using AI-powered analysis.',
      ),
    );
    console.log();

    // Check if already initialized
    const configPath = join(repoPath, 'mason.config.json');
    if (existsSync(configPath)) {
      console.log(
        chalk.yellow('Mason is already initialized in this repository.'),
      );

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
          console.log(chalk.dim('\nRun `mason doctor` to check your setup.\n'));
          return;
        }
      }
    }

    // Initialize state
    const state: WizardState = {
      repoPath,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
      dashboardChoice: 'local',
      dashboardUrl: 'http://localhost:3000',
    };

    // Step 1: Welcome
    if (!options.yes) {
      console.log(chalk.bold('This wizard will:'));
      console.log('  1. Set up Supabase database');
      console.log('  2. Install Claude Code commands');
      console.log('  3. Configure the dashboard UI');
      console.log('  4. Create configuration files');
      console.log();

      const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with setup?',
          default: true,
        },
      ]);

      if (!proceed) {
        console.log(chalk.dim('\nSetup cancelled.\n'));
        return;
      }
    }

    // Step 2: Supabase Setup
    console.log(chalk.bold('\n📦 Step 1: Database Setup\n'));

    if (!state.supabaseUrl || !state.supabaseAnonKey) {
      if (!options.yes) {
        console.log(
          chalk.dim('Mason uses Supabase for storing improvement data.\n'),
        );

        const { supabaseChoice } = await inquirer.prompt<{
          supabaseChoice: string;
        }>([
          {
            type: 'list',
            name: 'supabaseChoice',
            message: 'How would you like to set up Supabase?',
            choices: [
              {
                name: 'I have an existing Supabase project',
                value: 'existing',
              },
              {
                name: 'Create a new Supabase project (opens browser)',
                value: 'create',
              },
              { name: 'Skip for now (configure later)', value: 'skip' },
            ],
          },
        ]);

        if (supabaseChoice === 'create') {
          console.log(
            chalk.dim(
              '\nOpening Supabase dashboard. Create a new project, then come back with the URL and anon key.\n',
            ),
          );
          // Open browser
          const openCommand =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'start'
                : 'xdg-open';
          try {
            execSync(`${openCommand} https://database.new`, {
              stdio: 'ignore',
            });
          } catch {
            console.log(
              chalk.yellow(
                'Could not open browser. Visit https://database.new to create a project.',
              ),
            );
          }
        }

        if (supabaseChoice !== 'skip') {
          const supabaseAnswers = await inquirer.prompt<{
            url: string;
            anonKey: string;
          }>([
            {
              type: 'input',
              name: 'url',
              message: 'Supabase URL (https://xxx.supabase.co):',
              validate: (input: string) => {
                if (!input) return 'URL is required';
                if (!input.startsWith('https://'))
                  return 'URL must start with https://';
                return true;
              },
            },
            {
              type: 'password',
              name: 'anonKey',
              message: 'Supabase anon key:',
              mask: '*',
              validate: (input: string) => {
                if (!input) return 'Anon key is required';
                if (!input.startsWith('eyJ'))
                  return 'Invalid key format (should start with eyJ)';
                return true;
              },
            },
          ]);

          state.supabaseUrl = supabaseAnswers.url;
          state.supabaseAnonKey = supabaseAnswers.anonKey;
        }
      }
    } else {
      console.log(
        chalk.green('  Found Supabase credentials in environment variables'),
      );
    }

    // Step 3: Run migrations (if we have credentials)
    if (state.supabaseUrl && state.supabaseAnonKey) {
      console.log(chalk.bold('\n🗄️ Step 2: Database Migrations\n'));

      const spinner = ora('Setting up database tables...').start();

      try {
        // Note: In a real implementation, we'd run migrations via Supabase CLI or API
        // For now, we'll just indicate that migrations need to be run manually
        spinner.succeed(
          'Database migration files ready. Run them in Supabase SQL editor.',
        );

        console.log(
          chalk.dim('\n  Migration files are in: supabase/migrations/'),
        );
        console.log(
          chalk.dim(
            '  Run these SQL files in order in your Supabase SQL editor:',
          ),
        );
        console.log(chalk.dim('    1. 001_pm_backlog_tables.sql'));
        console.log(chalk.dim('    2. 002_pm_execution_runs.sql'));
        console.log(chalk.dim('    3. 003_pm_execution_tasks.sql'));
      } catch (error) {
        spinner.fail('Failed to set up migrations');
        console.error(chalk.red(String(error)));
      }
    }

    // Step 4: Anthropic API Key (optional, for PRD generation in dashboard)
    console.log(chalk.bold('\n🔑 Step 3: Anthropic API Key (Optional)\n'));

    if (!state.anthropicApiKey && !options.yes) {
      console.log(
        chalk.dim(
          'An API key enables AI-powered PRD generation in the dashboard.',
        ),
      );
      console.log(
        chalk.dim(
          'Analysis and execution use your Claude Pro Max subscription.\n',
        ),
      );

      const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter ANTHROPIC_API_KEY (or press Enter to skip):',
          mask: '*',
        },
      ]);

      if (apiKey) {
        state.anthropicApiKey = apiKey;
        console.log(chalk.green('  API key configured'));
      } else {
        console.log(
          chalk.dim(
            '  Skipped. Set ANTHROPIC_API_KEY env var to enable PRD generation.',
          ),
        );
      }
    } else if (state.anthropicApiKey) {
      console.log(chalk.green('  Found API key in environment'));
    }

    // Step 5: Install Claude Code commands
    console.log(chalk.bold('\n📝 Step 4: Installing Claude Code Commands\n'));

    const claudeDir = join(repoPath, '.claude');
    const commandsDir = join(claudeDir, 'commands');
    const skillsDir = join(claudeDir, 'skills', 'pm-domain-knowledge');

    // Create directories
    if (!existsSync(commandsDir)) {
      mkdirSync(commandsDir, { recursive: true });
    }
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }

    // Copy command templates
    // In production, these would come from the @mason/commands package
    // For now, we'll create them inline

    const pmReviewContent = `# PM Review Command

You are a **Product Manager agent** analyzing this codebase for improvement opportunities.

## Usage

\`/pm-review [mode]\`

Modes:
- \`full\` (default): Generate 10-20 improvements + 3 PRDs for top items
- \`area:<name>\`: Focus on specific area (frontend-ux, api-backend, reliability, security, code-quality)
- \`quick\`: Generate 5-7 quick wins only

## Process

1. Load domain knowledge from \`.claude/skills/pm-domain-knowledge/\` if it exists
2. Analyze codebase across domains: frontend-ux, api-backend, reliability, security, code-quality
3. Score each item: Impact (1-10), Effort (1-10), Priority = (Impact × 2) - Effort
4. Store results in Supabase \`pm_backlog_items\` table
5. For top 3 items (in full mode), generate PRDs with wave-based task breakdown

Read Supabase credentials from \`mason.config.json\`.
`;

    const executeApprovedContent = `# Execute Approved Command

Execute approved items from the PM backlog using wave-based parallel execution.

## Usage

\`/execute-approved [options]\`

Options:
- \`--item <id>\`: Execute a specific item by ID
- \`--limit <n>\`: Maximum number of items to execute (default: 5)
- \`--dry-run\`: Show execution plan without making changes

## Process

1. Fetch approved items from Supabase
2. Verify each has a PRD (prompt to generate if missing)
3. Create feature branch: \`mason/<item-slug>\`
4. Build wave-based execution plan from PRDs
5. Execute waves in parallel using Task tool with appropriate subagent types
6. Commit changes with conventional commit format
7. Update item status in Supabase

Read Supabase credentials from \`mason.config.json\`.
`;

    const skillContent = `# PM Domain Knowledge

Edit this file to provide context specific to your project.

## Project Overview

[Describe your project in 2-3 sentences]

## Business Goals

1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

## Domain Priorities

| Domain | Priority | Notes |
|--------|----------|-------|
| frontend-ux | High | User experience is critical |
| api-backend | Medium | Stable but needs optimization |
| reliability | High | Uptime is business-critical |
| security | Critical | Handles sensitive data |
| code-quality | Medium | Tech debt manageable |

## Improvement Guidelines

### Prefer
- Improvements that reduce user friction
- Security hardening
- Performance optimizations

### Avoid
- Major architectural changes without discussion
- Adding new dependencies for minor gains
`;

    writeFileSync(join(commandsDir, 'pm-review.md'), pmReviewContent);
    writeFileSync(
      join(commandsDir, 'execute-approved.md'),
      executeApprovedContent,
    );
    writeFileSync(join(skillsDir, 'SKILL.md'), skillContent);

    console.log(chalk.green('  Created .claude/commands/pm-review.md'));
    console.log(chalk.green('  Created .claude/commands/execute-approved.md'));
    console.log(
      chalk.green('  Created .claude/skills/pm-domain-knowledge/SKILL.md'),
    );

    // Step 6: Copy Supabase migrations
    console.log(chalk.bold('\n📄 Step 5: Copying Migration Files\n'));

    const supabaseDir = join(repoPath, 'supabase', 'migrations');
    if (!existsSync(supabaseDir)) {
      mkdirSync(supabaseDir, { recursive: true });
    }

    // Create migration files inline
    const migration1 = `-- Mason PM System: Backlog Tables
-- Migration: 001_pm_backlog_tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pm_analysis_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode TEXT NOT NULL DEFAULT 'full',
  items_found INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS pm_backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  area TEXT NOT NULL,
  type TEXT NOT NULL,
  complexity TEXT NOT NULL,
  impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  effort_score INTEGER NOT NULL CHECK (effort_score >= 1 AND effort_score <= 10),
  priority_score INTEGER GENERATED ALWAYS AS ((impact_score * 2) - effort_score) STORED,
  benefits_json JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  branch_name TEXT,
  pr_url TEXT,
  prd_content TEXT,
  prd_generated_at TIMESTAMPTZ,
  analysis_run_id UUID REFERENCES pm_analysis_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_status ON pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_priority ON pm_backlog_items(priority_score DESC);

ALTER TABLE pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_backlog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pm_analysis_runs" ON pm_analysis_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pm_backlog_items" ON pm_backlog_items FOR ALL USING (true) WITH CHECK (true);
`;

    const migration2 = `-- Mason PM System: Execution Runs
-- Migration: 002_pm_execution_runs

CREATE TABLE IF NOT EXISTS pm_execution_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  item_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pm_execution_runs_status ON pm_execution_runs(status);

ALTER TABLE pm_execution_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pm_execution_runs" ON pm_execution_runs FOR ALL USING (true) WITH CHECK (true);
`;

    const migration3 = `-- Mason PM System: Execution Tasks
-- Migration: 003_pm_execution_tasks

CREATE TABLE IF NOT EXISTS pm_execution_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id UUID NOT NULL REFERENCES pm_execution_runs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES pm_backlog_items(id) ON DELETE CASCADE,
  wave_number INTEGER NOT NULL,
  task_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  subagent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_run_id ON pm_execution_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_status ON pm_execution_tasks(status);

ALTER TABLE pm_execution_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pm_execution_tasks" ON pm_execution_tasks FOR ALL USING (true) WITH CHECK (true);
`;

    writeFileSync(join(supabaseDir, '001_pm_backlog_tables.sql'), migration1);
    writeFileSync(join(supabaseDir, '002_pm_execution_runs.sql'), migration2);
    writeFileSync(join(supabaseDir, '003_pm_execution_tasks.sql'), migration3);

    console.log(
      chalk.green('  Created supabase/migrations/001_pm_backlog_tables.sql'),
    );
    console.log(
      chalk.green('  Created supabase/migrations/002_pm_execution_runs.sql'),
    );
    console.log(
      chalk.green('  Created supabase/migrations/003_pm_execution_tasks.sql'),
    );

    // Step 7: Dashboard setup
    console.log(chalk.bold('\n🖥️ Step 6: Dashboard Setup\n'));

    if (!options.yes) {
      const { dashboardChoice } = await inquirer.prompt<{
        dashboardChoice: 'vercel' | 'local' | 'skip';
      }>([
        {
          type: 'list',
          name: 'dashboardChoice',
          message: 'How would you like to set up the dashboard?',
          choices: [
            {
              name: 'Run locally with pnpm dev (Recommended for development)',
              value: 'local',
            },
            { name: 'Deploy to Vercel', value: 'vercel' },
            { name: 'Skip dashboard setup', value: 'skip' },
          ],
        },
      ]);

      state.dashboardChoice = dashboardChoice;

      if (dashboardChoice === 'local') {
        console.log(
          chalk.dim('\n  Dashboard will be available at http://localhost:3000'),
        );
        console.log(chalk.dim('  Run from the mason-dashboard directory:'));
        console.log(
          chalk.cyan('    cd mason-dashboard && pnpm install && pnpm dev'),
        );
        state.dashboardUrl = 'http://localhost:3000';
      } else if (dashboardChoice === 'vercel') {
        console.log(chalk.dim('\n  To deploy to Vercel:'));
        console.log(chalk.cyan('    cd mason-dashboard && vercel'));
        console.log(
          chalk.dim(
            '\n  Make sure to set environment variables in Vercel dashboard.',
          ),
        );

        const { vercelUrl } = await inquirer.prompt<{ vercelUrl: string }>([
          {
            type: 'input',
            name: 'vercelUrl',
            message:
              'Enter your Vercel deployment URL (or press Enter to skip):',
          },
        ]);

        if (vercelUrl) {
          state.dashboardUrl = vercelUrl;
        }
      }
    }

    // Step 8: Create configuration file
    console.log(chalk.bold('\n⚙️ Step 7: Creating Configuration\n'));

    const config = {
      ...DEFAULT_CONFIG,
      supabase: {
        url: state.supabaseUrl,
        anonKey: state.supabaseAnonKey,
      },
      dashboardUrl: state.dashboardUrl,
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(chalk.green('  Created mason.config.json'));

    // Create .env.local for dashboard if we have credentials
    if (state.supabaseUrl) {
      const dashboardDir = join(repoPath, 'mason-dashboard');
      if (!existsSync(dashboardDir)) {
        mkdirSync(dashboardDir, { recursive: true });
      }

      const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${state.supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${state.supabaseAnonKey}

# Anthropic API Key (for PRD generation)
${state.anthropicApiKey ? `ANTHROPIC_API_KEY=${state.anthropicApiKey}` : '# ANTHROPIC_API_KEY=your-key-here'}

# Dashboard URL
NEXT_PUBLIC_DASHBOARD_URL=${state.dashboardUrl}
`;

      writeFileSync(join(dashboardDir, '.env.local'), envContent);
      console.log(chalk.green('  Created mason-dashboard/.env.local'));
    }

    // Step 9: Update .gitignore
    const gitignorePath = join(repoPath, '.gitignore');
    const gitignoreEntries = [
      '',
      '# Mason',
      '.mason/',
      'mason-dashboard/.env.local',
      'mason-dashboard/node_modules/',
      'mason-dashboard/.next/',
    ].join('\n');

    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('# Mason')) {
        writeFileSync(gitignorePath, gitignore + gitignoreEntries + '\n');
        console.log(chalk.green('  Updated .gitignore'));
      }
    } else {
      writeFileSync(gitignorePath, gitignoreEntries.trim() + '\n');
      console.log(chalk.green('  Created .gitignore'));
    }

    // Done!
    console.log(chalk.green('\n✅ Mason Setup Complete!\n'));

    console.log(chalk.bold('Next steps:'));
    console.log();

    if (!state.supabaseUrl) {
      console.log(
        '  1. Set up Supabase and add credentials to mason.config.json',
      );
      console.log('  2. Run the SQL migrations in Supabase SQL editor');
    } else {
      console.log('  1. Run the SQL migrations in Supabase SQL editor:');
      console.log(chalk.dim('     supabase/migrations/*.sql'));
    }

    console.log();
    console.log('  2. Open Claude Code in this repo');
    console.log('  3. Run /pm-review to analyze your codebase');
    console.log(`  4. Visit dashboard at ${state.dashboardUrl}/admin/backlog`);
    console.log('  5. Approve improvements and generate PRDs');
    console.log('  6. Run /execute-approved to implement changes');
    console.log();

    console.log(chalk.dim('Run `mason doctor` to verify your setup.\n'));
  });
