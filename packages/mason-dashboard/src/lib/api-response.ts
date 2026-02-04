/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formatting across all API routes.
 * All responses follow the shape: { success, data?, error?, requestId? }
 *
 * Features:
 * - Consistent { success, data/error } envelope
 * - X-Request-ID header tracking for debugging
 * - Pre-configured error responses for common cases
 */

import { randomUUID } from 'crypto';

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
  requestId?: string;
}

/**
 * Response options for request tracking
 */
export interface ResponseOptions {
  /** Optional request ID for tracking. If not provided, one will be generated. */
  requestId?: string;
  /** Whether to include request ID in response body (default: false) */
  includeRequestIdInBody?: boolean;
}

/**
 * Generates or extracts a request ID
 * Extracts from incoming request header if present, otherwise generates new UUID
 */
export function getRequestId(request?: Request): string {
  if (request) {
    const existingId = request.headers.get('X-Request-ID');
    if (existingId) {
      return existingId;
    }
  }
  return randomUUID();
}

/**
 * Adds standard headers to a response including X-Request-ID
 */
function addStandardHeaders<T>(
  response: NextResponse<T>,
  requestId: string,
): NextResponse<T> {
  response.headers.set('X-Request-ID', requestId);
  return response;
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
 * @param options - Optional request tracking options
 * @returns NextResponse with standardized format and X-Request-ID header
 *
 * @example
 * return apiSuccess({ user: { id: '123', name: 'John' } });
 * // Returns: { success: true, data: { user: { id: '123', name: 'John' } } }
 * // Headers: X-Request-ID: <uuid>
 *
 * @example
 * // With request ID tracking
 * const requestId = getRequestId(request);
 * return apiSuccess(data, 200, { requestId });
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  options?: ResponseOptions,
): NextResponse<ApiResponse<T>> {
  const requestId = options?.requestId || randomUUID();
  const body: ApiResponse<T> = { success: true, data };

  if (options?.includeRequestIdInBody) {
    body.requestId = requestId;
  }

  const response = NextResponse.json(body, { status });
  return addStandardHeaders(response, requestId);
}

/**
 * Creates an error API response
 *
 * @param code - Error code from ErrorCodes
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @param options - Optional request tracking options
 * @returns NextResponse with standardized error format and X-Request-ID header
 *
 * @example
 * return apiError(ErrorCodes.NOT_FOUND, 'User not found', 404);
 * // Returns: { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }
 * // Headers: X-Request-ID: <uuid>
 */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  const requestId = options?.requestId || randomUUID();
  const error: ApiResponse<never>['error'] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }

  const body: ApiResponse<never> = { success: false, error };
  if (options?.includeRequestIdInBody) {
    body.requestId = requestId;
  }

  const response = NextResponse.json(body, { status });
  return addStandardHeaders(response, requestId);
}

// Pre-configured error responses for common cases

/**
 * Returns 401 Unauthorized response
 */
export function unauthorized(
  message = 'Authentication required',
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.UNAUTHORIZED, message, 401, undefined, options);
}

/**
 * Returns 403 Forbidden response
 */
export function forbidden(
  message = 'Access denied',
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.FORBIDDEN, message, 403, undefined, options);
}

/**
 * Returns 400 Bad Request response
 */
export function badRequest(
  message: string,
  details?: unknown,
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.BAD_REQUEST, message, 400, details, options);
}

/**
 * Returns 404 Not Found response
 */
export function notFound(
  message = 'Resource not found',
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.NOT_FOUND, message, 404, undefined, options);
}

/**
 * Returns 409 Conflict response
 */
export function conflict(
  message: string,
  details?: unknown,
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.CONFLICT, message, 409, details, options);
}

/**
 * Returns 500 Internal Server Error response
 */
export function serverError(
  message = 'Internal server error',
  details?: unknown,
  options?: ResponseOptions,
): NextResponse<ApiResponse<never>> {
  return apiError(ErrorCodes.INTERNAL_ERROR, message, 500, details, options);
}

/**
 * Wraps an async handler with standardized error handling and request ID tracking
 *
 * @param handler - The async route handler
 * @returns Wrapped handler that catches errors and returns standardized responses
 *
 * @example
 * export const POST = withErrorHandler(async (request, { requestId }) => {
 *   const data = await doSomething();
 *   return apiSuccess(data, 200, { requestId });
 * });
 */
export function withErrorHandler<T>(
  handler: (
    request: Request,
    context: { requestId: string },
  ) => Promise<NextResponse<ApiResponse<T>>>,
): (request: Request) => Promise<NextResponse<ApiResponse<T | never>>> {
  return async (request: Request) => {
    const requestId = getRequestId(request);
    try {
      return await handler(request, { requestId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      return serverError(message, undefined, { requestId });
    }
  };
}

// Note: getRequestId is already exported above where it's defined
