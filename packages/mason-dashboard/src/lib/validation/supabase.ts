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
