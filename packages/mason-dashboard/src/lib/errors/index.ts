/**
 * Error Handling Module
 *
 * Provides typed error classes and utilities for consistent error handling.
 *
 * @example
 * import {
 *   normalizeError,
 *   handleDatabaseError,
 *   ApplicationError,
 *   DatabaseError,
 *   isDatabaseError,
 * } from '@/lib/errors';
 *
 * try {
 *   const result = await supabase.from('table').select();
 *   if (result.error) {
 *     throw handleDatabaseError(result.error, 'fetch records');
 *   }
 * } catch (err) {
 *   const appError = normalizeError(err);
 *   if (isDatabaseError(appError)) {
 *     console.error('Database error:', appError.dbCode);
 *   }
 * }
 */

// Error classes
export {
  ApplicationError,
  DatabaseError,
  NetworkError,
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
  TimeoutError,
  NotFoundError,
  ConflictError,
  AlreadyExistsError,
  type ErrorCode,
} from './errors';

// Error handling utilities
export {
  normalizeError,
  handleDatabaseError,
  isApplicationError,
  isDatabaseError,
  isAuthenticationError,
  isRateLimitError,
  isTimeoutError,
  isNetworkError,
  isNotFoundError,
  getErrorMessage,
  getErrorCode,
} from './errorHandler';
