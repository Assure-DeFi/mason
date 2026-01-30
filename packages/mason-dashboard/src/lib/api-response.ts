/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all API routes.
 * All responses follow the shape: { success, data?, error? }
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response shape
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Standard error codes for API responses
 */
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Client errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Creates a successful API response
 *
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized format
 *
 * @example
 * return apiSuccess({ user: { id: '123', name: 'John' } });
 * // Returns: { success: true, data: { user: { id: '123', name: 'John' } } }
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Creates an error API response
 *
 * @param code - Error code from ErrorCodes
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns NextResponse with standardized error format
 *
 * @example
 * return apiError(ErrorCodes.NOT_FOUND, 'User not found', 404);
 * // Returns: { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }
 */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  const error: ApiResponse<never>['error'] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return NextResponse.json({ success: false, error }, { status });
}

// Pre-configured error responses for common cases

/**
 * Returns 401 Unauthorized response
 */
export function unauthorized(
  message = 'Authentication required',
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Returns 403 Forbidden response
 */
export function forbidden(
  message = 'Access denied',
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.FORBIDDEN, message, 403);
}

/**
 * Returns 400 Bad Request response
 */
export function badRequest(
  message: string,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.BAD_REQUEST, message, 400, details);
}

/**
 * Returns 404 Not Found response
 */
export function notFound(
  message = 'Resource not found',
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.NOT_FOUND, message, 404);
}

/**
 * Returns 409 Conflict response
 */
export function conflict(
  message: string,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.CONFLICT, message, 409, details);
}

/**
 * Returns 500 Internal Server Error response
 */
export function serverError(
  message = 'Internal server error',
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.INTERNAL_ERROR, message, 500, details);
}

/**
 * Wraps an async handler with standardized error handling
 *
 * @param handler - The async route handler
 * @returns Wrapped handler that catches errors and returns standardized responses
 *
 * @example
 * export const POST = withErrorHandler(async (request) => {
 *   const data = await doSomething();
 *   return apiSuccess(data);
 * });
 */
export function withErrorHandler<T>(
  handler: (request: Request) => Promise<NextResponse<ApiResponse<T>>>,
): (request: Request) => Promise<NextResponse<ApiResponse<T | never>>> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      return serverError(message);
    }
  };
}
