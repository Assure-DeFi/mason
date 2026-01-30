/**
 * mason-autopilot init
 *
 * Initialize autopilot configuration by prompting for Supabase credentials
 * and repository path.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface AutopilotConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
  userEmail?: string;
}

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');

export async function initCommand(): Promise<void> {
  console.log('\nMason Autopilot - Configuration Setup\n');

  // Check if config already exists
  if (existsSync(CONFIG_FILE)) {
    console.log('Existing configuration found at:', CONFIG_FILE);
    const existing = JSON.parse(
      readFileSync(CONFIG_FILE, 'utf-8'),
    ) as AutopilotConfig;
    console.log('  Supabase URL:', existing.supabaseUrl);
    console.log('  Repository:', existing.repositoryPath);
    console.log('\nTo reconfigure, delete the config file and run init again.');
    console.log(`  rm ${CONFIG_FILE}`);
    return;
  }

  // Dynamic import for enquirer (ESM)
  const { default: Enquirer } = await import('enquirer');
  const enquirer = new Enquirer();

  interface InitAnswers {
    supabaseUrl: string;
    supabaseAnonKey: string;
    repositoryPath: string;
  }

  try {
    // Check if mason.config.json exists in current directory
    const masonConfigPath = join(process.cwd(), 'mason.config.json');
    let defaults = {
      supabaseUrl: '',
      supabaseAnonKey: '',
      repositoryPath: process.cwd(),
    };

    if (existsSync(masonConfigPath)) {
      console.log('Found mason.config.json - importing credentials...\n');
      const masonConfig = JSON.parse(readFileSync(masonConfigPath, 'utf-8'));
      defaults = {
        supabaseUrl: masonConfig.supabaseUrl || '',
        supabaseAnonKey: masonConfig.supabaseAnonKey || '',
        repositoryPath: process.cwd(),
      };
    }

    const answers = (await enquirer.prompt([
      {
        type: 'input',
        name: 'supabaseUrl',
        message: 'Supabase URL:',
        initial: defaults.supabaseUrl,
        validate: (value: string) => {
          if (!value) return 'Supabase URL is required';
          if (!value.includes('supabase.co'))
            return 'Must be a valid Supabase URL';
          return true;
        },
      },
      {
        type: 'password',
        name: 'supabaseAnonKey',
        message: 'Supabase Anon Key:',
        initial: defaults.supabaseAnonKey,
        validate: (value: string) => {
          if (!value) return 'Supabase Anon Key is required';
          if (!value.startsWith('eyJ')) return 'Must be a valid JWT token';
          return true;
        },
      },
      {
        type: 'input',
        name: 'repositoryPath',
        message: 'Repository path:',
        initial: defaults.repositoryPath,
        validate: (value: string) => {
          if (!value) return 'Repository path is required';
          if (!existsSync(value)) return 'Path does not exist';
          if (!existsSync(join(value, '.git'))) return 'Not a git repository';
          return true;
        },
      },
    ])) as InitAnswers;

    // Validate connection to Supabase
    console.log('\nValidating Supabase connection...');
    const supabase = createClient(answers.supabaseUrl, answers.supabaseAnonKey);

    // Try to query the autopilot config table
    const { error } = await supabase
      .from('mason_autopilot_config')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log(
          '\nAutopilot tables not found. Please run database migrations in Mason Dashboard:',
        );
        console.log('  Settings > Database > Update Database Schema');
        console.log('\nThen run this command again.');
        return;
      }
      console.error('\nFailed to connect to Supabase:', error.message);
      return;
    }

    // Verify beta access (check if user email is in beta list)
    // For now, we'll skip this check and let the dashboard handle it
    console.log('Connection verified!');

    // Create config directory if needed
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Save configuration
    const config: AutopilotConfig = {
      version: '1.0',
      supabaseUrl: answers.supabaseUrl,
      supabaseAnonKey: answers.supabaseAnonKey,
      repositoryPath: answers.repositoryPath,
    };

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('\nConfiguration saved to:', CONFIG_FILE);

    console.log('\nNext steps:');
    console.log('  1. Configure autopilot settings in Mason Dashboard');
    console.log('     https://mason.assuredefi.com/settings/autopilot');
    console.log('  2. Start the daemon:');
    console.log('     mason-autopilot start');
    console.log('  3. (Optional) Install as system service:');
    console.log('     mason-autopilot install');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      // User cancelled with Ctrl+C
      console.log('\nSetup cancelled.');
      return;
    }
    throw err;
  }
}
