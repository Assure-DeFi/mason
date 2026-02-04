/**
 * Base Application Error Class
 *
 * Provides a standardized error structure with:
 * - Error code for programmatic handling
 * - HTTP status code for API responses
 * - Optional details for debugging
 *
 * All custom errors should extend this class.
 */

export type ErrorCode =
  | 'UNKNOWN'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROCESS_EXIT'
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR';

export class ApplicationError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code for API responses
   */
  public readonly statusCode: number;

  /**
   * Additional details for debugging
   */
  public readonly details?: unknown;

  /**
   * Original error if this wraps another error
   */
  public readonly cause?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: unknown,
    cause?: Error,
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
