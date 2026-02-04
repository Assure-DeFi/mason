/**
 * Typed Error Classes
 *
 * Provides type-safe error handling to replace string matching patterns.
 * Use instanceof checks instead of message.includes() for reliability.
 *
 * @example
 * if (error instanceof DatabaseError) {
 *   handleDatabaseError(error.dbCode, error.operation);
 * }
 */

import { ApplicationError, type ErrorCode } from './ApplicationError';

/**
 * Database-specific error with PostgreSQL/PostgREST error code
 */
export class DatabaseError extends ApplicationError {
  public readonly dbCode: string;
  public readonly operation: string;

  constructor(
    dbCode: string,
    message: string,
    operation: string,
    details?: unknown,
    cause?: Error,
  ) {
    super('DATABASE_ERROR', message, 500, details, cause);
    this.name = 'DatabaseError';
    this.dbCode = dbCode;
    this.operation = operation;
  }
}

/**
 * Network/connectivity error
 */
export class NetworkError extends ApplicationError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('NETWORK_ERROR', message, 503, details, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends ApplicationError {
  constructor(
    message: string = 'Authentication required',
    details?: unknown,
    cause?: Error,
  ) {
    super('UNAUTHORIZED', message, 401, details, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization/permission error (403)
 */
export class ForbiddenError extends ApplicationError {
  constructor(
    message: string = 'Access denied',
    details?: unknown,
    cause?: Error,
  ) {
    super('FORBIDDEN', message, 403, details, cause);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limiting error (429)
 */
export class RateLimitError extends ApplicationError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, details?: unknown, cause?: Error) {
    super(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      429,
      details,
      cause,
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Validation/input error (400)
 */
export class ValidationError extends ApplicationError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    details?: unknown,
    cause?: Error,
  ) {
    super('VALIDATION_ERROR', message, 400, details, cause);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Timeout error (503)
 */
export class TimeoutError extends ApplicationError {
  public readonly timeoutMs: number;

  constructor(
    timeoutMs: number = 0,
    message: string = 'Request timed out',
    details?: unknown,
    cause?: Error,
  ) {
    super('TIMEOUT', message, 503, details, cause);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends ApplicationError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(
    resourceType: string,
    resourceId?: string,
    details?: unknown,
    cause?: Error,
  ) {
    const message = resourceId
      ? `${resourceType} with ID ${resourceId} not found`
      : `${resourceType} not found`;
    super('NOT_FOUND', message, 404, details, cause);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Conflict error - resource already exists (409)
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('CONFLICT', message, 409, details, cause);
    this.name = 'ConflictError';
  }
}

/**
 * Already exists error (409)
 */
export class AlreadyExistsError extends ApplicationError {
  constructor(resourceType: string, details?: unknown, cause?: Error) {
    super('ALREADY_EXISTS', `${resourceType} already exists`, 409, details, cause);
    this.name = 'AlreadyExistsError';
  }
}

// Re-export base error
export { ApplicationError, type ErrorCode };
