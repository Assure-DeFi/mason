/**
 * PostgREST Filter Value Sanitizer
 *
 * PostgREST uses a structured filter syntax where commas, periods,
 * and parentheses are grammar delimiters. When user input is interpolated
 * into filter strings (e.g., `.or()` calls), these characters can break
 * the filter grammar or create unintended filter clauses.
 *
 * Special characters in PostgREST filter syntax:
 * - `,` (comma)       → separates OR conditions
 * - `.` (period)       → separates field.operator.value
 * - `(` `)` (parens)  → grouping for complex filters
 *
 * @see https://postgrest.org/en/stable/references/api/tables_views.html#operators
 */

/**
 * Maximum allowed length for a search query value.
 * Prevents oversized filter expressions that could degrade query performance.
 */
export const MAX_SEARCH_LENGTH = 200;

/**
 * Regex matching PostgREST filter syntax special characters.
 * These characters are grammar delimiters and must be removed from
 * user-provided values before interpolation into filter strings.
 */
const POSTGREST_SPECIAL_CHARS = /[,.()"';\\]/g;

/**
 * Sanitizes a value for safe interpolation into a PostgREST filter string.
 *
 * Removes PostgREST syntax delimiters and enforces a max-length constraint.
 * This prevents filter grammar injection where user input like "a,b.eq.1"
 * would be parsed as separate filter clauses instead of a literal search value.
 *
 * @param value - The raw user-provided search value
 * @returns The sanitized value safe for PostgREST filter interpolation
 *
 * @example
 * sanitizePostgrestValue('hello world')       // 'hello world'
 * sanitizePostgrestValue('a,b.eq.1')          // 'abeq1'
 * sanitizePostgrestValue('test(injection)')   // 'testinjection'
 * sanitizePostgrestValue('')                  // ''
 */
export function sanitizePostgrestValue(value: string): string {
  if (!value) {
    return '';
  }

  // Enforce max length first to avoid processing excessively long strings
  const truncated = value.slice(0, MAX_SEARCH_LENGTH);

  // Remove PostgREST special characters that act as filter syntax delimiters
  const sanitized = truncated.replace(POSTGREST_SPECIAL_CHARS, '');

  // Collapse multiple consecutive spaces into single space and trim
  return sanitized.replace(/\s+/g, ' ').trim();
}
