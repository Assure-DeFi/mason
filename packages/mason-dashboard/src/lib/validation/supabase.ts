/**
 * Validation utilities for Supabase-related inputs
 */

/**
 * Regex pattern for valid Supabase project references.
 * Format: lowercase alphanumeric with dashes, 20+ characters
 * Example: fbggihrxuuqkqvfogqja
 */
const PROJECT_REF_PATTERN = /^[a-z0-9-]{20,}$/;

/**
 * Validates a Supabase project reference format.
 * Returns true if the format is valid, false otherwise.
 *
 * @param ref - The project reference to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidProjectRef(ref: string): boolean {
  return PROJECT_REF_PATTERN.test(ref);
}

/**
 * Validates a Supabase project reference and returns an error message if invalid.
 *
 * @param ref - The project reference to validate
 * @returns null if valid, error message string if invalid
 */
export function validateProjectRef(ref: string): string | null {
  if (!ref) {
    return 'Project reference is required';
  }
  if (!PROJECT_REF_PATTERN.test(ref)) {
    return 'Invalid project reference format. Expected lowercase alphanumeric string with at least 20 characters.';
  }
  return null;
}

/**
 * Validates that a URL is a legitimate Supabase instance URL.
 * Prevents SSRF by ensuring the server only connects to *.supabase.co domains.
 *
 * @param url - The URL to validate
 * @returns Validation result with reason if invalid
 */
export function validateSupabaseUrl(
  url: string,
): { valid: true } | { valid: false; reason: string } {
  // 1. Try parsing URL - reject if invalid
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // 2. Require HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'URL must use HTTPS protocol' };
  }

  // 3. Reject non-standard ports
  if (parsed.port) {
    return { valid: false, reason: 'URL must not include a port number' };
  }

  // 4. Require *.supabase.co hostname
  const SUPABASE_HOST_PATTERN = /^[a-z0-9-]+\.supabase\.co$/;
  if (!SUPABASE_HOST_PATTERN.test(parsed.hostname)) {
    return { valid: false, reason: 'URL must be a valid *.supabase.co domain' };
  }

  return { valid: true };
}
