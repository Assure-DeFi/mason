/**
 * Error handling utilities with user-friendly messages and actions
 */

export type ErrorCode =
  | 'INVALID_URL'
  | 'INVALID_KEY'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

interface ErrorConfig {
  /** User-friendly error message */
  message: string;
  /** Detailed explanation */
  description: string;
  /** Suggested actions */
  actions: ErrorAction[];
  /** Error severity */
  severity: 'warning' | 'error' | 'critical';
}

interface ErrorAction {
  /** Action label */
  label: string;
  /** Action type */
  type: 'link' | 'button' | 'copy';
  /** Value (URL for link, callback for button, text for copy) */
  value: string;
}

const ERROR_CONFIGS: Record<ErrorCode, ErrorConfig> = {
  INVALID_URL: {
    message: 'Invalid Supabase URL',
    description: 'The URL format should be https://your-project.supabase.co',
    actions: [
      {
        label: 'Open Supabase Dashboard',
        type: 'link',
        value: 'https://supabase.com/dashboard',
      },
    ],
    severity: 'error',
  },
  INVALID_KEY: {
    message: 'Invalid API Key Format',
    description:
      'The key should be a JWT starting with "eyJ". Check that you copied the full key.',
    actions: [
      {
        label: 'Open Supabase Dashboard',
        type: 'link',
        value: 'https://supabase.com/dashboard',
      },
    ],
    severity: 'error',
  },
  UNAUTHORIZED: {
    message: 'Authentication Failed',
    description:
      'The API key was rejected by Supabase. Make sure you are using the correct key type (anon for public, service_role for admin).',
    actions: [
      {
        label: 'Copy Correct Key from Supabase',
        type: 'link',
        value: 'https://supabase.com/dashboard/project/_/settings/api',
      },
    ],
    severity: 'error',
  },
  NETWORK_ERROR: {
    message: 'Network Connection Failed',
    description:
      'Unable to reach Supabase. Check your internet connection and try again.',
    actions: [
      {
        label: 'Try Again',
        type: 'button',
        value: 'retry',
      },
      {
        label: 'Check Supabase Status',
        type: 'link',
        value: 'https://status.supabase.com',
      },
    ],
    severity: 'warning',
  },
  DATABASE_ERROR: {
    message: 'Database Error',
    description:
      'An error occurred while accessing the database. This might be a temporary issue.',
    actions: [
      {
        label: 'Try Again',
        type: 'button',
        value: 'retry',
      },
    ],
    severity: 'error',
  },
  NOT_FOUND: {
    message: 'Resource Not Found',
    description: 'The requested resource could not be found in the database.',
    actions: [
      {
        label: 'Go to Dashboard',
        type: 'link',
        value: '/admin/backlog',
      },
    ],
    severity: 'warning',
  },
  RATE_LIMITED: {
    message: 'Too Many Requests',
    description:
      'You have made too many requests. Please wait a moment and try again.',
    actions: [
      {
        label: 'Wait and Retry',
        type: 'button',
        value: 'retry',
      },
    ],
    severity: 'warning',
  },
  UNKNOWN: {
    message: 'Something Went Wrong',
    description:
      'An unexpected error occurred. Please try again or contact support.',
    actions: [
      {
        label: 'Try Again',
        type: 'button',
        value: 'retry',
      },
      {
        label: 'Get Help',
        type: 'link',
        value: 'https://github.com/Assure-DeFi/mason/issues',
      },
    ],
    severity: 'error',
  },
};

/**
 * Map an error to a known error code
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (!error) {return 'UNKNOWN';}

  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('offline')
  ) {
    return 'NETWORK_ERROR';
  }

  // Auth errors
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('401') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('jwt')
  ) {
    return 'UNAUTHORIZED';
  }

  // URL errors
  if (
    errorMessage.includes('invalid url') ||
    errorMessage.includes('url format')
  ) {
    return 'INVALID_URL';
  }

  // Key format errors
  if (
    errorMessage.includes('invalid key') ||
    errorMessage.includes('key format')
  ) {
    return 'INVALID_KEY';
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'NOT_FOUND';
  }

  // Rate limiting
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many') ||
    errorMessage.includes('429')
  ) {
    return 'RATE_LIMITED';
  }

  // Database errors
  if (
    errorMessage.includes('database') ||
    errorMessage.includes('postgres') ||
    errorMessage.includes('supabase')
  ) {
    return 'DATABASE_ERROR';
  }

  return 'UNKNOWN';
}

/**
 * Get error configuration for display
 */
export function getErrorConfig(error: unknown): ErrorConfig {
  const code = getErrorCode(error);
  return ERROR_CONFIGS[code];
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(
  error: unknown,
  context?: string,
): string {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const parts = [
    `[${code}]`,
    context ? `Context: ${context}` : '',
    `Message: ${message}`,
    stack ? `Stack: ${stack}` : '',
  ].filter(Boolean);

  return parts.join('\n');
}

/**
 * Supabase/Postgres error with code and details
 */
export interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Format a database error with detailed context for debugging.
 * Includes Supabase error code, message, and details when available.
 */
export function formatDatabaseError(
  operation: string,
  error: DatabaseError | null | undefined,
): string {
  if (!error) {
    return `Failed to ${operation}: Unknown error`;
  }

  const parts = [`Failed to ${operation}:`];

  if (error.code) {
    parts.push(`[${error.code}]`);
  }

  if (error.message) {
    parts.push(error.message);
  }

  if (error.details) {
    parts.push(`(${error.details})`);
  }

  if (error.hint) {
    parts.push(`Hint: ${error.hint}`);
  }

  return parts.join(' ');
}

/**
 * Create a user-friendly error message from a database error.
 * Extracts the most relevant information without exposing internals.
 */
export function getUserFriendlyDatabaseError(
  operation: string,
  error: DatabaseError | null | undefined,
): string {
  if (!error) {
    return `Failed to ${operation}. Please try again.`;
  }

  const errorCodeMessages: Record<string, string> = {
    PGRST116: 'The requested item was not found.',
    PGRST301: 'Unable to connect to the database.',
    '23505': 'This item already exists.',
    '23503': 'Cannot delete - this item is referenced by other data.',
    '42P01': 'Database table not found. Please run migrations.',
    '42501': 'Permission denied. Please check your database permissions.',
    '08P01': 'Database protocol error. Please try again.',
    '57014': 'Query cancelled due to timeout. Please try again.',
  };

  if (error.code && errorCodeMessages[error.code]) {
    return `Failed to ${operation}: ${errorCodeMessages[error.code]}`;
  }

  if (error.message) {
    return `Failed to ${operation}: ${error.message}`;
  }

  return `Failed to ${operation}. Please try again.`;
}
