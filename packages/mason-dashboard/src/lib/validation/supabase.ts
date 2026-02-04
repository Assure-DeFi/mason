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
 * Private/reserved IP ranges that should be blocked to prevent SSRF attacks.
 * These include:
 * - Loopback (127.0.0.0/8)
 * - Private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Link-local (169.254.0.0/16)
 * - AWS/cloud metadata service (169.254.169.254)
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
];

/**
 * Check if an IP address is in a private/reserved range.
 * This prevents SSRF attacks targeting internal services.
 */
function isPrivateOrReservedIP(hostname: string): boolean {
  // Check for blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
    return true;
  }

  // Check for IPv4 private ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);

    // Loopback: 127.0.0.0/8
    if (a === 127) {
      return true;
    }

    // Private: 10.0.0.0/8
    if (a === 10) {
      return true;
    }

    // Private: 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    // Private: 192.168.0.0/16
    if (a === 192 && b === 168) {
      return true;
    }

    // Link-local: 169.254.0.0/16 (includes AWS metadata at 169.254.169.254)
    if (a === 169 && b === 254) {
      return true;
    }

    // Reserved: 0.0.0.0/8
    if (a === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Validation result for Supabase URL validation.
 */
export interface SupabaseUrlValidationResult {
  valid: boolean;
  error?: string;
  projectRef?: string;
}

/**
 * Validates a Supabase URL to ensure it:
 * 1. Is a valid HTTPS URL
 * 2. Points to *.supabase.co domain
 * 3. Does not point to internal/private IP addresses (SSRF prevention)
 * 4. Has a valid project reference in the subdomain
 *
 * @param url - The Supabase URL to validate
 * @returns Validation result with error message if invalid, or projectRef if valid
 */
export function validateSupabaseUrl(url: string): SupabaseUrlValidationResult {
  // Check for empty/null
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Supabase URL is required' };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Must use HTTPS protocol
  if (!trimmedUrl.startsWith('https://')) {
    return { valid: false, error: 'Supabase URL must use HTTPS protocol' };
  }

  // Parse URL to validate structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Validate protocol again after parsing (prevents protocol confusion)
  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Supabase URL must use HTTPS protocol' };
  }

  // Check for IP addresses in hostname (SSRF prevention)
  if (isPrivateOrReservedIP(parsedUrl.hostname)) {
    return { valid: false, error: 'Invalid Supabase URL: IP addresses are not allowed' };
  }

  // Validate hostname matches *.supabase.co pattern
  if (!parsedUrl.hostname.endsWith('.supabase.co')) {
    return { valid: false, error: 'Invalid Supabase URL: must be a *.supabase.co domain' };
  }

  // Extract project reference from subdomain
  const hostParts = parsedUrl.hostname.split('.');
  if (hostParts.length !== 3) {
    return { valid: false, error: 'Invalid Supabase URL format: expected <project-ref>.supabase.co' };
  }

  const projectRef = hostParts[0];

  // Validate project reference format
  if (!PROJECT_REF_PATTERN.test(projectRef)) {
    return {
      valid: false,
      error: 'Invalid Supabase project reference in URL. Expected lowercase alphanumeric string with at least 20 characters.',
    };
  }

  // URL should not have authentication info embedded
  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, error: 'Supabase URL should not contain authentication credentials' };
  }

  // URL should not have query parameters or fragments for the base URL
  if (parsedUrl.search || parsedUrl.hash) {
    return { valid: false, error: 'Supabase URL should not contain query parameters or fragments' };
  }

  return { valid: true, projectRef };
}

/**
 * Quick boolean check for Supabase URL validity.
 * Use validateSupabaseUrl() if you need the error message.
 *
 * @param url - The Supabase URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidSupabaseUrl(url: string): boolean {
  return validateSupabaseUrl(url).valid;
}

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
