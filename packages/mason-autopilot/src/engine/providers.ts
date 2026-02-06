/**
 * Multi-Provider Configuration
 *
 * Defines provider types, default models, and configuration helpers
 * for the BYOAK (Bring Your Own API Key) multi-provider runtime.
 */

export type ProviderName = 'anthropic' | 'openai' | 'google';

export type ProviderSource = 'claude_oauth' | 'env_var' | 'database';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  model: string;
  source: ProviderSource;
}

/**
 * Default models per provider - balanced between capability and cost.
 */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.5-pro',
};

/**
 * Available models per provider for UI dropdowns.
 */
export const AVAILABLE_MODELS: Record<ProviderName, string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250514'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
};

/**
 * Environment variable names for each provider.
 */
export const ENV_VAR_NAMES: Record<ProviderName, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
};

/**
 * Build a ProviderConfig from provider name, key, and optional model override.
 */
export function getProviderConfig(
  provider: ProviderName,
  apiKey: string,
  source: ProviderSource,
  overrideModel?: string,
): ProviderConfig {
  return {
    provider,
    apiKey,
    model: overrideModel || DEFAULT_MODELS[provider],
    source,
  };
}
