/**
 * mason-autopilot init
 *
 * Initialize autopilot configuration. Creates all required files and database
 * records if they don't exist - fully self-sufficient setup.
 *
 * UX Goals:
 * - Zero prompts for existing dashboard users (has mason.config.json with valid API key)
 * - Minimal prompts for new users (only Supabase credentials, auto-detect rest)
 * - CI/CD support via --non-interactive flag with environment variables
 */

import { execSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const API_KEY_PREFIX = 'mason_';

// Environment variables for CI/CD
const ENV_SUPABASE_URL = process.env.MASON_SUPABASE_URL;
const ENV_SUPABASE_KEY = process.env.MASON_SUPABASE_KEY;

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

export interface InitOptions {
  nonInteractive?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const nonInteractive = options.nonInteractive || false;

  console.log('\nMason Autopilot - Quick Setup\n');

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

  // Non-interactive mode requires environment variables
  if (nonInteractive && (!ENV_SUPABASE_URL || !ENV_SUPABASE_KEY)) {
    console.error(
      'ERROR: --non-interactive requires MASON_SUPABASE_URL and MASON_SUPABASE_KEY environment variables',
    );
    process.exit(1);
  }

  const masonConfigPath = join(process.cwd(), 'mason.config.json');
  let masonConfig: MasonConfig | null = null;

  // Check for existing mason.config.json
  if (existsSync(masonConfigPath)) {
    masonConfig = JSON.parse(readFileSync(masonConfigPath, 'utf-8'));
  }

  // === ZERO-PROMPT FLOW FOR EXISTING USERS ===
  // If we have a complete mason.config.json with valid credentials, skip all prompts
  if (
    masonConfig?.supabaseUrl &&
    masonConfig?.supabaseAnonKey &&
    masonConfig?.apiKey
  ) {
    const result = await tryZeroPromptSetup(masonConfig);
    if (result.success) {
      return; // Complete - no prompts needed!
    }
    // Fall through to prompted setup if zero-prompt fails
    console.log(result.reason);
    console.log(''); // blank line before continuing
  }

  // === PROMPTED/SEMI-AUTOMATIC FLOW ===
  try {
    let supabaseUrl: string;
    let supabaseAnonKey: string;

    // Get Supabase credentials from env vars or prompt
    if (ENV_SUPABASE_URL && ENV_SUPABASE_KEY) {
      supabaseUrl = ENV_SUPABASE_URL;
      supabaseAnonKey = ENV_SUPABASE_KEY;
      console.log('Using Supabase credentials from environment variables');
    } else if (masonConfig?.supabaseUrl && masonConfig?.supabaseAnonKey) {
      supabaseUrl = masonConfig.supabaseUrl;
      supabaseAnonKey = masonConfig.supabaseAnonKey;
      console.log('Using Supabase credentials from mason.config.json');
    } else {
      if (nonInteractive) {
        console.error(
          'ERROR: No Supabase credentials found and --non-interactive specified',
        );
        process.exit(1);
      }

      console.log('No mason.config.json found.\n');

      const { default: Enquirer } = await import('enquirer');
      const enquirer = new Enquirer();

      interface CredentialAnswers {
        supabaseUrl: string;
        supabaseAnonKey: string;
      }

      const credentials = (await enquirer.prompt([
        {
          type: 'input',
          name: 'supabaseUrl',
          message: 'Supabase URL:',
          validate: (value: string) => {
            if (!value) {
              return 'Supabase URL is required';
            }
            if (!value.includes('supabase.co')) {
              return 'Must be a valid Supabase URL';
            }
            return true;
          },
        },
        {
          type: 'password',
          name: 'supabaseAnonKey',
          message: 'Supabase Anon Key:',
          validate: (value: string) => {
            if (!value) {
              return 'Supabase Anon Key is required';
            }
            if (!value.startsWith('eyJ')) {
              return 'Must be a valid JWT token';
            }
            return true;
          },
        },
      ])) as CredentialAnswers;

      supabaseUrl = credentials.supabaseUrl;
      supabaseAnonKey = credentials.supabaseAnonKey;
    }

    // Validate Supabase connection
    console.log('Validating Supabase connection...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    let needsNewMasonConfig = !masonConfig;

    if (apiKey) {
      // Validate existing API key
      console.log('Validating existing API key...');
      const { data: keyData, error: keyError } = await supabase
        .from('mason_api_keys')
        .select('user_id')
        .eq('key_hash', hashApiKey(apiKey))
        .single();

      if (keyError || !keyData) {
        console.log('Existing API key is invalid or expired.');
        apiKey = undefined;
      } else {
        console.log('API key valid!');
        userId = keyData.user_id;

        // Look up repository for this user
        const repoName = detectRepositoryName();
        if (repoName) {
          const { data: repoData } = await supabase
            .from('mason_github_repositories')
            .select('id')
            .eq('user_id', userId)
            .eq('github_full_name', repoName)
            .single();

          if (repoData) {
            repositoryId = repoData.id;
            console.log(`Detected repository: ${repoName}`);
          }
        }
      }
    }

    if (!apiKey || !repositoryId!) {
      // Need to create new API key or register repository
      const {
        userId: uid,
        repositoryId: rid,
        apiKey: newKey,
      } = await setupUserAndRepository(supabase, process.cwd(), nonInteractive);
      userId = uid;
      repositoryId = rid;
      apiKey = newKey;
      needsNewMasonConfig = true;
    }

    // Check/create autopilot config in database
    console.log('Checking autopilot configuration...');
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
      console.log('Created autopilot config (daily at 2 AM)');
    } else {
      console.log(
        `Autopilot configuration exists (${existingConfig.enabled ? 'enabled' : 'disabled'})`,
      );
    }

    // Create/update mason.config.json if needed
    if (needsNewMasonConfig) {
      const newMasonConfig: MasonConfig = {
        version: '2.0',
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
        apiKey: apiKey!,
        domains: masonConfig?.domains || DEFAULT_DOMAINS,
      };

      writeFileSync(masonConfigPath, JSON.stringify(newMasonConfig, null, 2));
      console.log('Created mason.config.json');
    }

    // Create local autopilot config
    writeLocalConfig(supabaseUrl, supabaseAnonKey);

    printSuccessMessage();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      console.log('\nSetup cancelled.');
      return;
    }
    throw err;
  }
}

/**
 * Attempt zero-prompt setup using existing mason.config.json
 * Returns success=true if complete, or success=false with reason if prompts are needed
 */
async function tryZeroPromptSetup(
  config: MasonConfig,
): Promise<{ success: boolean; reason?: string }> {
  console.log('Found mason.config.json');

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  // Validate API key and get user
  const { data: keyData, error: keyError } = await supabase
    .from('mason_api_keys')
    .select('user_id')
    .eq('key_hash', hashApiKey(config.apiKey))
    .single();

  if (keyError || !keyData) {
    return { success: false, reason: 'API key invalid or expired.' };
  }

  console.log('Validated API key');
  const userId = keyData.user_id;

  // Get user info
  const { data: userData } = await supabase
    .from('mason_users')
    .select('github_username')
    .eq('id', userId)
    .single();

  if (userData?.github_username) {
    console.log(`User: ${userData.github_username}`);
  }

  // Auto-detect repository
  const repoName = detectRepositoryName();
  if (!repoName) {
    return {
      success: false,
      reason: 'Could not detect repository from git remote.',
    };
  }

  console.log(`Detected repository: ${repoName}`);

  // Look up repository
  const { data: repoData } = await supabase
    .from('mason_github_repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('github_full_name', repoName)
    .single();

  if (!repoData) {
    return {
      success: false,
      reason: `Repository ${repoName} not registered. Will register now.`,
    };
  }

  console.log('Found existing repo registration');
  const repositoryId = repoData.id;

  // Check/create autopilot config
  const { data: existingConfig } = await supabase
    .from('mason_autopilot_config')
    .select('id, enabled')
    .eq('repository_id', repositoryId)
    .single();

  if (!existingConfig) {
    const { error: insertError } = await supabase
      .from('mason_autopilot_config')
      .insert({
        user_id: userId,
        repository_id: repositoryId,
        ...DEFAULT_AUTOPILOT_CONFIG,
      });

    if (insertError) {
      return {
        success: false,
        reason: `Failed to create autopilot config: ${insertError.message}`,
      };
    }
    console.log('Created autopilot config with defaults');
  } else {
    console.log(
      `Autopilot config exists (${existingConfig.enabled ? 'enabled' : 'disabled'})`,
    );
  }

  // Create local autopilot config
  writeLocalConfig(config.supabaseUrl, config.supabaseAnonKey);

  printSuccessMessage();
  return { success: true };
}

/**
 * Try to detect GitHub username from git config or remote URL
 */
function detectGitHubUsername(): string | null {
  // 1. Try git config user.name
  try {
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (name) {
      return name;
    }
  } catch {
    // Ignore
  }

  // 2. Try to extract owner from git remote URL
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
    }).trim();
    const match = remoteUrl.match(/[:/]([^/]+)\/[^/]+?(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Try to detect repository name (owner/repo) from git remote
 */
function detectRepositoryName(): string | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
    }).trim();
    const match = remoteUrl.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Write local autopilot config file
 */
function writeLocalConfig(supabaseUrl: string, supabaseAnonKey: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const localConfig: AutopilotLocalConfig = {
    version: '1.0',
    supabaseUrl,
    supabaseAnonKey,
    repositoryPath: process.cwd(),
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(localConfig, null, 2));
  console.log('Created autopilot config:', CONFIG_FILE);
}

/**
 * Print success message with next steps
 */
function printSuccessMessage(): void {
  console.log('\nReady! Start the daemon:');
  console.log('  mason-autopilot start');
}

/**
 * Set up user and repository, generating a new API key
 * Auto-detects GitHub username and repository name where possible
 */
async function setupUserAndRepository(
  supabase: SupabaseClient,
  repoPath: string,
  nonInteractive: boolean,
): Promise<{ userId: string; repositoryId: string; apiKey: string }> {
  console.log('Setting up repository connection...');

  // Auto-detect values
  let githubUsername = detectGitHubUsername();
  let repoName = detectRepositoryName();

  if (githubUsername) {
    console.log(`Detected GitHub user: ${githubUsername} (from git config)`);
  }
  if (repoName) {
    console.log(`Detected repository: ${repoName} (from git remote)`);
  }

  // Only prompt if we couldn't auto-detect AND we're not in non-interactive mode
  if (!githubUsername || !repoName) {
    if (nonInteractive) {
      if (!githubUsername) {
        console.error(
          'ERROR: Could not detect GitHub username. Set git config user.name or use interactive mode.',
        );
      }
      if (!repoName) {
        console.error(
          'ERROR: Could not detect repository. Initialize git with a remote or use interactive mode.',
        );
      }
      process.exit(1);
    }

    const { default: Enquirer } = await import('enquirer');
    const enquirer = new Enquirer();

    interface UserAnswers {
      githubUsername?: string;
      repoName?: string;
    }

    const prompts = [];
    if (!githubUsername) {
      prompts.push({
        type: 'input',
        name: 'githubUsername',
        message: 'GitHub username:',
        validate: (v: string) => (v ? true : 'Username is required'),
      });
    }
    if (!repoName) {
      prompts.push({
        type: 'input',
        name: 'repoName',
        message: 'Repository (owner/name):',
        validate: (v: string) => {
          return v.includes('/') ? true : 'Format: owner/repo-name';
        },
      });
    }

    const answers = (await enquirer.prompt(prompts)) as UserAnswers;
    if (answers.githubUsername) {
      githubUsername = answers.githubUsername;
    }
    if (answers.repoName) {
      repoName = answers.repoName;
    }
  }

  // Find existing user - try multiple lookup strategies
  let userId: string;
  const { data: existingUser } = await supabase
    .from('mason_users')
    .select('id')
    .or(`github_username.eq.${githubUsername},github_id.eq.${githubUsername}`)
    .limit(1)
    .single();

  if (existingUser) {
    userId = existingUser.id;
    console.log('Found existing user account.');
  } else {
    console.log('Creating user account...');
    const { data: newUser, error: userError } = await supabase
      .from('mason_users')
      .insert({
        github_id: githubUsername!, // Using username as ID for CLI setup
        github_username: githubUsername,
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
    .eq('github_full_name', repoName)
    .eq('user_id', userId)
    .single();

  if (existingRepo) {
    repositoryId = existingRepo.id;
    console.log('Found existing repository registration.');
  } else {
    console.log('Registering repository...');
    const [owner, name] = repoName!.split('/');
    const { data: newRepo, error: repoError } = await supabase
      .from('mason_github_repositories')
      .insert({
        user_id: userId,
        github_repo_id: Date.now(), // Placeholder - real GitHub ID would come from OAuth
        github_owner: owner,
        github_name: name,
        github_full_name: repoName,
        github_default_branch: 'main',
        github_private: true,
        github_clone_url: `https://github.com/${repoName}.git`,
        github_html_url: `https://github.com/${repoName}`,
      })
      .select('id')
      .single();

    if (repoError || !newRepo) {
      throw new Error(`Failed to register repository: ${repoError?.message}`);
    }
    repositoryId = newRepo.id;
  }

  // Check if user already has an API key
  const { data: existingKey } = await supabase
    .from('mason_api_keys')
    .select('id, key_prefix')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (existingKey) {
    // User already has an API key but we don't have it in config
    // We need to generate a new one since we can't retrieve the existing key
    console.log(
      `Note: Found existing API key (${existingKey.key_prefix}...) but generating new one for this setup.`,
    );
  }

  // Generate and store API key
  console.log('Generating API key...');
  const { key, hash, prefix } = generateApiKey();

  const { error: keyError } = await supabase.from('mason_api_keys').insert({
    user_id: userId,
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
