/**
 * mason-autopilot init
 *
 * Initialize autopilot configuration. Creates all required files and database
 * records if they don't exist - fully self-sufficient setup.
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_KEY_PREFIX = 'mason_';

/**
 * Generate a SHA-256 hash of an API key
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawRandom = randomBytes(24).toString('base64url');
  const randomPart = rawRandom.replace(/^[-_]+/, '');
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

interface AutopilotLocalConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  repositoryPath: string;
}

interface MasonConfig {
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiKey: string;
  domains: Array<{ name: string; enabled: boolean; weight: number }>;
}

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');

const DEFAULT_DOMAINS = [
  { name: 'frontend-ux', enabled: true, weight: 1 },
  { name: 'api-backend', enabled: true, weight: 1 },
  { name: 'reliability', enabled: true, weight: 1 },
  { name: 'security', enabled: true, weight: 1.2 },
  { name: 'code-quality', enabled: true, weight: 0.8 },
];

const DEFAULT_AUTOPILOT_CONFIG = {
  enabled: true,
  schedule_cron: '0 2 * * *', // Daily at 2 AM
  auto_approval_rules: {
    maxComplexity: 2,
    minImpact: 3,
    excludedCategories: ['security', 'breaking-change'],
  },
  guardian_rails: {
    maxItemsPerDay: 5,
    pauseOnFailure: true,
    requireHumanReviewComplexity: 4,
  },
  execution_window: {
    startHour: 0,
    endHour: 6,
  },
};

export async function initCommand(): Promise<void> {
  console.log('\n🔧 Mason Autopilot - Configuration Setup\n');

  // Check if already configured
  if (existsSync(CONFIG_FILE)) {
    console.log('Existing configuration found at:', CONFIG_FILE);
    const existing = JSON.parse(
      readFileSync(CONFIG_FILE, 'utf-8'),
    ) as AutopilotLocalConfig;
    console.log('  Supabase URL:', existing.supabaseUrl);
    console.log('  Repository:', existing.repositoryPath);
    console.log('\nTo reconfigure, delete the config file and run init again.');
    console.log(`  rm ${CONFIG_FILE}`);
    return;
  }

  const { default: Enquirer } = await import('enquirer');
  const enquirer = new Enquirer();

  try {
    const masonConfigPath = join(process.cwd(), 'mason.config.json');
    let masonConfig: MasonConfig | null = null;
    let needsNewMasonConfig = false;

    // Check for existing mason.config.json
    if (existsSync(masonConfigPath)) {
      console.log('Found existing mason.config.json\n');
      masonConfig = JSON.parse(readFileSync(masonConfigPath, 'utf-8'));
    } else {
      console.log('No mason.config.json found - will create one.\n');
      needsNewMasonConfig = true;
    }

    // Prompt for Supabase credentials
    interface CredentialAnswers {
      supabaseUrl: string;
      supabaseAnonKey: string;
    }

    const credentials = (await enquirer.prompt([
      {
        type: 'input',
        name: 'supabaseUrl',
        message: 'Supabase URL:',
        initial: masonConfig?.supabaseUrl || '',
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
        initial: masonConfig?.supabaseAnonKey || '',
        validate: (value: string) => {
          if (!value) return 'Supabase Anon Key is required';
          if (!value.startsWith('eyJ')) return 'Must be a valid JWT token';
          return true;
        },
      },
    ])) as CredentialAnswers;

    // Validate Supabase connection
    console.log('\nValidating Supabase connection...');
    const supabase = createClient(
      credentials.supabaseUrl,
      credentials.supabaseAnonKey,
    );

    // Check if required tables exist
    const { error: tableError } = await supabase
      .from('mason_autopilot_config')
      .select('id')
      .limit(1);

    if (tableError?.code === '42P01') {
      console.error('\nAutopilot tables not found in your database.');
      console.error('Please run database migrations first:');
      console.error('  1. Go to https://mason.assuredefi.com');
      console.error('  2. Settings > Database > Update Database Schema');
      console.error('\nThen run this command again.');
      return;
    }

    console.log('Connection verified!');

    // Handle API key and repository registration
    let apiKey = masonConfig?.apiKey;
    let userId: string;
    let repositoryId: string;

    if (apiKey) {
      // Validate existing API key
      console.log('Validating existing API key...');
      const { data: keyData, error: keyError } = await supabase
        .from('mason_api_keys')
        .select('user_id, repository_id')
        .eq('key_hash', hashApiKey(apiKey))
        .single();

      if (keyError || !keyData) {
        console.log('Existing API key is invalid or expired.');
        console.log('Generating a new API key...\n');
        apiKey = undefined;
      } else {
        console.log('API key valid!');
        userId = keyData.user_id;
        repositoryId = keyData.repository_id;
      }
    }

    if (!apiKey) {
      // Need to create new API key - first get or create user
      const {
        userId: uid,
        repositoryId: rid,
        apiKey: newKey,
      } = await setupUserAndRepository(supabase, enquirer, process.cwd());
      userId = uid;
      repositoryId = rid;
      apiKey = newKey;
      needsNewMasonConfig = true;
    }

    // Check/create autopilot config in database
    console.log('\nChecking autopilot configuration...');
    const { data: existingConfig } = await supabase
      .from('mason_autopilot_config')
      .select('id, enabled')
      .eq('repository_id', repositoryId!)
      .single();

    if (!existingConfig) {
      console.log('Creating default autopilot configuration...');

      const { error: insertError } = await supabase
        .from('mason_autopilot_config')
        .insert({
          user_id: userId!,
          repository_id: repositoryId!,
          ...DEFAULT_AUTOPILOT_CONFIG,
        });

      if (insertError) {
        console.error(
          'Failed to create autopilot config:',
          insertError.message,
        );
        return;
      }
      console.log('Default autopilot configuration created!');
      console.log('  Schedule: Daily at 2 AM');
      console.log('  Execution window: 12 AM - 6 AM');
      console.log('  Max items per day: 5');
      console.log('  Auto-approve: complexity <= 2, impact >= 3');
    } else {
      console.log(
        `Autopilot configuration exists (${existingConfig.enabled ? 'enabled' : 'disabled'})`,
      );
    }

    // Create/update mason.config.json if needed
    if (needsNewMasonConfig) {
      const newMasonConfig: MasonConfig = {
        version: '2.0',
        supabaseUrl: credentials.supabaseUrl,
        supabaseAnonKey: credentials.supabaseAnonKey,
        apiKey: apiKey!,
        domains: masonConfig?.domains || DEFAULT_DOMAINS,
      };

      writeFileSync(masonConfigPath, JSON.stringify(newMasonConfig, null, 2));
      console.log('\nCreated mason.config.json');
      console.log(
        '  ⚠️  Add this file to .gitignore to keep credentials safe!',
      );
    }

    // Create local autopilot config
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const localConfig: AutopilotLocalConfig = {
      version: '1.0',
      supabaseUrl: credentials.supabaseUrl,
      supabaseAnonKey: credentials.supabaseAnonKey,
      repositoryPath: process.cwd(),
    };

    writeFileSync(CONFIG_FILE, JSON.stringify(localConfig, null, 2));
    console.log('Created autopilot config:', CONFIG_FILE);

    console.log('\n✅ Autopilot initialization complete!\n');
    console.log('Next steps:');
    console.log('  1. Start the daemon:');
    console.log('     mason-autopilot start');
    console.log('  2. (Optional) Install as system service:');
    console.log('     mason-autopilot install');
    console.log('  3. (Optional) Customize settings in Mason Dashboard:');
    console.log('     https://mason.assuredefi.com/settings/autopilot');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      console.log('\nSetup cancelled.');
      return;
    }
    throw err;
  }
}

/**
 * Set up user and repository, generating a new API key
 */
async function setupUserAndRepository(
  supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enquirer: any,
  repoPath: string,
): Promise<{ userId: string; repositoryId: string; apiKey: string }> {
  console.log('\nSetting up repository connection...\n');

  // Get GitHub info for identification
  interface UserAnswers {
    githubUsername: string;
    repoName: string;
  }

  // Try to get repo name from git remote
  let defaultRepoName = '';
  try {
    const { execSync } = await import('node:child_process');
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim();
    const match = remoteUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) {
      defaultRepoName = match[1];
    }
  } catch {
    // Ignore - will prompt user
  }

  const userInfo = (await enquirer.prompt([
    {
      type: 'input',
      name: 'githubUsername',
      message: 'GitHub username:',
      validate: (v: string) => (v ? true : 'Username is required'),
    },
    {
      type: 'input',
      name: 'repoName',
      message: 'Repository (owner/name):',
      initial: defaultRepoName,
      validate: (v: string) =>
        v.includes('/') ? true : 'Format: owner/repo-name',
    },
  ])) as UserAnswers;

  // Check if user exists or create
  let userId: string;
  const { data: existingUser } = await supabase
    .from('mason_users')
    .select('id')
    .eq('github_username', userInfo.githubUsername)
    .single();

  if (existingUser) {
    userId = existingUser.id;
    console.log('Found existing user account.');
  } else {
    console.log('Creating user account...');
    const { data: newUser, error: userError } = await supabase
      .from('mason_users')
      .insert({
        github_id: userInfo.githubUsername, // Using username as ID for CLI setup
        github_username: userInfo.githubUsername,
        is_active: true,
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      throw new Error(`Failed to create user: ${userError?.message}`);
    }
    userId = newUser.id;
  }

  // Check if repository exists or create
  let repositoryId: string;
  const { data: existingRepo } = await supabase
    .from('mason_github_repositories')
    .select('id')
    .eq('github_full_name', userInfo.repoName)
    .eq('user_id', userId)
    .single();

  if (existingRepo) {
    repositoryId = existingRepo.id;
    console.log('Found existing repository registration.');
  } else {
    console.log('Registering repository...');
    const [owner, repoName] = userInfo.repoName.split('/');
    const { data: newRepo, error: repoError } = await supabase
      .from('mason_github_repositories')
      .insert({
        user_id: userId,
        github_repo_id: Date.now(), // Placeholder - real GitHub ID would come from OAuth
        github_owner: owner,
        github_name: repoName,
        github_full_name: userInfo.repoName,
        github_default_branch: 'main',
        github_private: true,
        github_clone_url: `https://github.com/${userInfo.repoName}.git`,
        github_html_url: `https://github.com/${userInfo.repoName}`,
      })
      .select('id')
      .single();

    if (repoError || !newRepo) {
      throw new Error(`Failed to register repository: ${repoError?.message}`);
    }
    repositoryId = newRepo.id;
  }

  // Generate and store API key
  console.log('Generating API key...');
  const { key, hash, prefix } = generateApiKey();

  const { error: keyError } = await supabase.from('mason_api_keys').insert({
    user_id: userId,
    repository_id: repositoryId,
    name: 'Autopilot CLI',
    key_hash: hash,
    key_prefix: prefix,
  });

  if (keyError) {
    throw new Error(`Failed to create API key: ${keyError.message}`);
  }

  console.log('API key generated:', prefix + '...');

  return { userId, repositoryId, apiKey: key };
}
