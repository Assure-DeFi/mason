import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { TABLES } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/client';
import type { User } from '@/types/auth';

const API_KEY_PREFIX = 'mason_';

/**
 * Type guard to validate that data conforms to the User interface
 */
function isValidUser(data: unknown): data is User {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required string fields
  if (typeof obj.id !== 'string') {
    return false;
  }
  if (typeof obj.github_id !== 'string') {
    return false;
  }
  if (typeof obj.github_username !== 'string') {
    return false;
  }

  // Required boolean field
  if (typeof obj.is_active !== 'boolean') {
    return false;
  }

  // Required string fields (timestamps)
  if (typeof obj.created_at !== 'string') {
    return false;
  }
  if (typeof obj.updated_at !== 'string') {
    return false;
  }

  // Optional fields (can be null or expected type)
  if (obj.github_email !== null && typeof obj.github_email !== 'string') {
    return false;
  }
  if (
    obj.github_avatar_url !== null &&
    typeof obj.github_avatar_url !== 'string'
  ) {
    return false;
  }
  if (
    obj.default_repository_id !== null &&
    typeof obj.default_repository_id !== 'string'
  ) {
    return false;
  }

  return true;
}

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
  const rawRandom = randomBytes(24).toString('base64url');
  const randomPart = rawRandom.replace(/^[-_]+/, ''); // Strip leading - or _ to avoid mason__ or mason_-
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12); // "mason_" + first 6 chars

  return { key, hash, prefix };
}

/**
 * Validate an API key and return the associated user
 * Updates last_used_at on successful validation
 *
 * Optimized to use JOIN query - reduces from 3 queries to 2:
 * 1. SELECT with JOIN (api_key + user in one query)
 * 2. UPDATE last_used_at (lightweight, non-blocking)
 *
 * Uses timing-safe comparison to prevent timing attacks on hash validation
 */
export async function validateApiKey(key: string): Promise<User | null> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hash = hashApiKey(key);
  const supabase = createServiceClient();

  // Use JOIN to fetch api_key and user in a single query
  const { data: joined, error: joinError } = await supabase
    .from(TABLES.API_KEYS)
    .select(
      `
      id,
      key_hash,
      mason_users (
        id,
        created_at,
        updated_at,
        github_id,
        github_username,
        github_email,
        github_avatar_url,
        default_repository_id,
        is_active
      )
    `,
    )
    .eq('key_hash', hash)
    .single();

  if (joinError || !joined) {
    return null;
  }

  // Timing-safe comparison of hash values to prevent timing attacks
  const storedHash = joined.key_hash;
  if (!storedHash || typeof storedHash !== 'string') {
    return null;
  }

  const hashBuffer = Buffer.from(hash, 'utf8');
  const storedHashBuffer = Buffer.from(storedHash, 'utf8');

  // Only compare if lengths match (timing-safe)
  if (hashBuffer.length !== storedHashBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(hashBuffer, storedHashBuffer)) {
    return null;
  }

  // Extract user from joined result
  // Supabase returns nested relations as arrays for many-to-one, so we need to handle both cases
  const usersData = joined.mason_users;
  if (!usersData) {
    return null;
  }

  // Handle both single object and array cases (Supabase behavior varies)
  const userData = Array.isArray(usersData) ? usersData[0] : usersData;
  if (!userData) {
    return null;
  }

  // Update last_used_at asynchronously (fire and forget - don't block validation)
  void supabase
    .from(TABLES.API_KEYS)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', joined.id)
    .then(() => {
      // Intentionally not awaited - best effort tracking
    });

  if (!isValidUser(userData)) {
    console.error('Invalid user data from API key validation:', userData);
    return null;
  }

  return userData;
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
    .from(TABLES.API_KEYS)
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
    .from(TABLES.API_KEYS)
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
 * Validates that the key belongs to the specified user before deletion
 *
 * @returns 'success' if deleted, 'not_found' if key doesn't exist or doesn't belong to user, 'error' on failure
 */
export async function deleteApiKey(
  keyId: string,
  userId: string,
): Promise<'success' | 'not_found' | 'error'> {
  const supabase = createServiceClient();

  // First verify the key exists AND belongs to this user
  const { data: existingKey, error: fetchError } = await supabase
    .from(TABLES.API_KEYS)
    .select('id')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingKey) {
    // Key doesn't exist or doesn't belong to this user
    return 'not_found';
  }

  // Now safe to delete - we've verified ownership
  const { error: deleteError } = await supabase
    .from(TABLES.API_KEYS)
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Failed to delete API key:', deleteError);
    return 'error';
  }

  return 'success';
}
