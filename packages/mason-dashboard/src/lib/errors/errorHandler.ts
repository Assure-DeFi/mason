/**
 * Error Handler Utilities
 *
 * Provides utilities to normalize and handle errors consistently.
 * Replaces fragile string matching with type-safe error handling.
 *
 * @example
 * try {
 *   await operation();
 * } catch (err) {
 *   const appError = normalizeError(err);
 *   console.error('[Component]', appError.code, appError.message);
 *   setError(appError.message);
 * }
 */

import {
  ApplicationError,
  AuthenticationError,
  DatabaseError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  NotFoundError,
  ConflictError,
  AlreadyExistsError,
} from './errors';

/**
 * Normalizes any error to an ApplicationError.
 * Detects error type from message patterns and converts accordingly.
 *
 * @param error - Any error value (Error, string, unknown)
 * @returns ApplicationError with proper typing
 */
export function normalizeError(error: unknown): ApplicationError {
  // Already an ApplicationError
  if (error instanceof ApplicationError) {
    return error;
  }

  // Standard Error object
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return new RateLimitError(undefined, { originalError: error }, error);
    }

    // Timeout
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('timed out')
    ) {
      return new TimeoutError(0, error.message, { originalError: error }, error);
    }

    // Authentication
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('401') ||
      message.includes('invalid api key') ||
      message.includes('jwt')
    ) {
      return new AuthenticationError(
        error.message,
        { originalError: error },
        error,
      );
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused') ||
      message.includes('connection')
    ) {
      return new NetworkError(error.message, { originalError: error }, error);
    }

    // Not found
    if (message.includes('not found') || message.includes('404')) {
      return new NotFoundError('Resource', undefined, { originalError: error }, error);
    }

    // Generic application error
    return new ApplicationError(
      'UNKNOWN',
      error.message,
      500,
      { originalError: error, stack: error.stack },
      error,
    );
  }

  // String errors
  if (typeof error === 'string') {
    return new ApplicationError('UNKNOWN', error, 500);
  }

  // Unknown objects
  return new ApplicationError(
    'UNKNOWN',
    'An unexpected error occurred',
    500,
    { originalError: error },
  );
}

/**
 * Handles database errors and converts to typed ApplicationError.
 * Maps PostgreSQL and PostgREST error codes to appropriate error types.
 *
 * @param error - Database error object with code property
 * @param operation - Description of the operation that failed
 * @returns Typed ApplicationError
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
): ApplicationError {
  if (!error || typeof error !== 'object') {
    return new DatabaseError('UNKNOWN', `Failed to ${operation}`, operation);
  }

  const dbError = error as Record<string, unknown>;
  const code = String(dbError.code || 'UNKNOWN');
  const message = String(dbError.message || `Failed to ${operation}`);

  // Map PostgreSQL/PostgREST error codes to typed errors
  switch (code) {
    // PostgreSQL: Unique violation
    case '23505':
      return new AlreadyExistsError('Item', { dbCode: code, operation });

    // PostgreSQL: Foreign key violation
    case '23503':
      return new ConflictError(
        'Cannot delete - this item is referenced by other data',
        { dbCode: code, operation },
      );

    // PostgreSQL: Table does not exist
    case '42P01':
      return new DatabaseError(
        code,
        'Database schema missing. Please run migrations.',
        operation,
      );

    // PostgreSQL: Permission denied
    case '42501':
      return new ApplicationError(
        'FORBIDDEN',
        'Permission denied. Check your database permissions.',
        403,
        { dbCode: code, operation },
      );

    // PostgreSQL: Protocol error
    case '08P01':
      return new NetworkError('Database connection error. Please try again.', {
        dbCode: code,
        operation,
      });

    // PostgreSQL: Query timeout
    case '57014':
      return new TimeoutError(0, 'Database query timed out. Please try again.', {
        dbCode: code,
        operation,
      });

    // PostgREST: Not found
    case 'PGRST116':
      return new NotFoundError('Resource', undefined, { dbCode: code, operation });

    // PostgREST: Unauthorized
    case 'PGRST301':
      return new AuthenticationError('Invalid database credentials', {
        dbCode: code,
        operation,
      });

    // PostgREST: Schema cache error
    case 'PGRST200':
      return new DatabaseError(
        code,
        'Database schema issue. Please update your schema.',
        operation,
      );

    default:
      return new DatabaseError(code, message, operation, { originalError: error });
  }
}

/**
 * Type guard to check if error is a specific ApplicationError type
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Type guard for DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard for AuthenticationError
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard for RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Type guard for TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Type guard for NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard for NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Extracts a user-friendly error message from any error.
 * Use this in UI components to display error messages.
 */
export function getErrorMessage(error: unknown): string {
  const appError = normalizeError(error);
  return appError.message;
}

/**
 * Extracts the error code from any error.
 * Returns 'UNKNOWN' if the error is not an ApplicationError.
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ApplicationError) {
    return error.code;
  }
  return 'UNKNOWN';
}
