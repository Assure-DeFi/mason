import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Credentials storage structure
 */
interface CredentialsFile {
  anthropicApiKey?: string;
  updatedAt: string;
}

/**
 * API key resolution source
 */
export type ApiKeySource = 'environment' | 'config' | 'credentials' | 'none';

/**
 * API key resolution result
 */
export interface ApiKeyResolution {
  /** The API key if found */
  apiKey: string | null;

  /** Where the key was found */
  source: ApiKeySource;

  /** Warning message if any */
  warning?: string;
}

/**
 * Get the Mason home directory
 */
export function getMasonHomeDir(): string {
  return join(homedir(), '.mason');
}

/**
 * Get the credentials file path
 */
export function getCredentialsPath(): string {
  return join(getMasonHomeDir(), 'credentials.json');
}

/**
 * Read credentials from the credentials file
 */
function readCredentials(): CredentialsFile | null {
  const path = getCredentialsPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as CredentialsFile;
  } catch {
    return null;
  }
}

/**
 * Save API key to credentials file
 */
export function saveApiKey(apiKey: string): void {
  const dir = getMasonHomeDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const credentials: CredentialsFile = {
    anthropicApiKey: apiKey,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(getCredentialsPath(), JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Restrict to user only
  });
}

/**
 * Delete stored API key
 */
export function deleteApiKey(): boolean {
  const path = getCredentialsPath();
  if (!existsSync(path)) {
    return false;
  }

  const credentials: CredentialsFile = {
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(path, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });

  return true;
}

/**
 * Read config file to check for API key
 */
function readConfigApiKey(repoPath: string): string | null {
  const configPath = join(repoPath, 'mason.config.json');
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as { apiKey?: string };
    return config.apiKey ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve API key from various sources
 *
 * Priority order:
 * 1. ANTHROPIC_API_KEY environment variable (recommended)
 * 2. mason.config.json apiKey field (not recommended)
 * 3. ~/.mason/credentials.json (secure local storage)
 */
export function resolveApiKey(repoPath?: string): ApiKeyResolution {
  // 1. Environment variable (recommended)
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'environment',
    };
  }

  // 2. Config file (not recommended - warn user)
  if (repoPath) {
    const configKey = readConfigApiKey(repoPath);
    if (configKey) {
      return {
        apiKey: configKey,
        source: 'config',
        warning:
          'API key found in mason.config.json. This is insecure - use ANTHROPIC_API_KEY environment variable instead.',
      };
    }
  }

  // 3. Credentials file
  const credentials = readCredentials();
  if (credentials?.anthropicApiKey) {
    return {
      apiKey: credentials.anthropicApiKey,
      source: 'credentials',
    };
  }

  // Not found
  return {
    apiKey: null,
    source: 'none',
  };
}

/**
 * Validate an API key format (basic check)
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Anthropic API keys typically start with 'sk-ant-' and are fairly long
  return apiKey.startsWith('sk-ant-') && apiKey.length > 30;
}

/**
 * Mask an API key for display
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 10) {
    return '****';
  }
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

/**
 * Get a human-readable description of where the API key is from
 */
export function getApiKeySourceDescription(source: ApiKeySource): string {
  switch (source) {
    case 'environment':
      return 'ANTHROPIC_API_KEY environment variable';
    case 'config':
      return 'mason.config.json';
    case 'credentials':
      return '~/.mason/credentials.json';
    case 'none':
      return 'Not found';
  }
}
