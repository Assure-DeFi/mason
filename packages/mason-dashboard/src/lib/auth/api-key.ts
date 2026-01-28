import { createHash, randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';
import type { User } from '@/types/auth';

const API_KEY_PREFIX = 'mason_';

/**
 * Generate a SHA-256 hash of an API key
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key with the mason_ prefix
 * Returns both the full key (to show user once) and the hash (to store)
 */
export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomPart = randomBytes(24).toString('base64url');
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12); // "mason_" + first 6 chars

  return { key, hash, prefix };
}

/**
 * Validate an API key and return the associated user
 * Updates last_used_at on successful validation
 */
export async function validateApiKey(key: string): Promise<User | null> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hash = hashApiKey(key);
  const supabase = createServiceClient();

  // Look up the key by its hash
  const { data: apiKey, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', hash)
    .single();

  if (keyError || !apiKey) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  // Fetch the associated user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', apiKey.user_id)
    .single();

  if (userError || !user) {
    return null;
  }

  return user as User;
}

/**
 * Extract API key from Authorization header
 * Supports "Bearer <key>" format
 */
export function extractApiKeyFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * API Key type for listing (without the full key)
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

/**
 * List all API keys for a user (returns only prefixes, never full keys)
 */
export async function listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list API keys:', error);
    return [];
  }

  return data as ApiKeyInfo[];
}

/**
 * Create a new API key for a user
 * Returns the full key (to show once) and key info
 */
export async function createApiKey(
  userId: string,
  name: string = 'Default',
): Promise<{ key: string; info: ApiKeyInfo } | null> {
  const { key, hash, prefix } = generateApiKey();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix,
    })
    .select('id, name, key_prefix, created_at, last_used_at')
    .single();

  if (error) {
    console.error('Failed to create API key:', error);
    return null;
  }

  return {
    key,
    info: data as ApiKeyInfo,
  };
}

/**
 * Delete an API key
 * Validates that the key belongs to the specified user
 */
export async function deleteApiKey(
  keyId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete API key:', error);
    return false;
  }

  return true;
}
