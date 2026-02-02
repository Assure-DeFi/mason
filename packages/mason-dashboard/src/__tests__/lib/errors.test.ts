import { describe, expect, it } from 'vitest';

import {
  formatDatabaseError,
  formatErrorForLogging,
  getErrorCode,
  getErrorConfig,
  getUserFriendlyDatabaseError,
} from '@/lib/errors';

describe('errors', () => {
  describe('getErrorCode', () => {
    it('returns UNKNOWN for null/undefined', () => {
      expect(getErrorCode(null)).toBe('UNKNOWN');
      expect(getErrorCode(undefined)).toBe('UNKNOWN');
    });

    it('detects network errors', () => {
      expect(getErrorCode(new Error('network error'))).toBe('NETWORK_ERROR');
      expect(getErrorCode(new Error('fetch failed'))).toBe('NETWORK_ERROR');
      expect(getErrorCode(new Error('connection refused'))).toBe(
        'NETWORK_ERROR',
      );
      expect(getErrorCode(new Error('offline'))).toBe('NETWORK_ERROR');
    });

    it('detects authorization errors', () => {
      expect(getErrorCode(new Error('unauthorized'))).toBe('UNAUTHORIZED');
      expect(getErrorCode(new Error('401 error'))).toBe('UNAUTHORIZED');
      expect(getErrorCode(new Error('invalid api key'))).toBe('UNAUTHORIZED');
      expect(getErrorCode(new Error('jwt expired'))).toBe('UNAUTHORIZED');
    });

    it('detects URL errors', () => {
      expect(getErrorCode(new Error('invalid url format'))).toBe('INVALID_URL');
      expect(getErrorCode(new Error('url format error'))).toBe('INVALID_URL');
    });

    it('detects key format errors', () => {
      expect(getErrorCode(new Error('invalid key format'))).toBe('INVALID_KEY');
      expect(getErrorCode(new Error('key format error'))).toBe('INVALID_KEY');
    });

    it('detects not found errors', () => {
      expect(getErrorCode(new Error('resource not found'))).toBe('NOT_FOUND');
      expect(getErrorCode(new Error('404 not found'))).toBe('NOT_FOUND');
    });

    it('detects rate limiting errors', () => {
      expect(getErrorCode(new Error('rate limit exceeded'))).toBe(
        'RATE_LIMITED',
      );
      expect(getErrorCode(new Error('too many requests'))).toBe('RATE_LIMITED');
      expect(getErrorCode(new Error('429 error'))).toBe('RATE_LIMITED');
    });

    it('detects database errors', () => {
      expect(getErrorCode(new Error('database query failed'))).toBe(
        'DATABASE_ERROR',
      );
      expect(getErrorCode(new Error('postgres error'))).toBe('DATABASE_ERROR');
      expect(getErrorCode(new Error('supabase error'))).toBe('DATABASE_ERROR');
    });

    it('returns UNKNOWN for unrecognized errors', () => {
      expect(getErrorCode(new Error('something went wrong'))).toBe('UNKNOWN');
      expect(getErrorCode('random string error')).toBe('UNKNOWN');
    });
  });

  describe('getErrorConfig', () => {
    it('returns config for known error codes', () => {
      const config = getErrorConfig(new Error('network error'));
      expect(config).toHaveProperty('message', 'Network Connection Failed');
      expect(config).toHaveProperty('severity', 'warning');
      expect(config.actions).toHaveLength(2);
    });

    it('returns UNKNOWN config for unrecognized errors', () => {
      const config = getErrorConfig(new Error('random error'));
      expect(config).toHaveProperty('message', 'Something Went Wrong');
      expect(config).toHaveProperty('severity', 'error');
    });
  });

  describe('formatErrorForLogging', () => {
    it('formats Error objects with code and message', () => {
      const error = new Error('network failure');
      const result = formatErrorForLogging(error);
      expect(result).toContain('[NETWORK_ERROR]');
      expect(result).toContain('Message: network failure');
    });

    it('includes context when provided', () => {
      const error = new Error('connection failed');
      const result = formatErrorForLogging(error, 'API call');
      expect(result).toContain('Context: API call');
    });

    it('includes stack trace for Error objects', () => {
      const error = new Error('test error');
      const result = formatErrorForLogging(error);
      expect(result).toContain('Stack:');
    });

    it('handles non-Error values', () => {
      const result = formatErrorForLogging('string error');
      expect(result).toContain('[UNKNOWN]');
      expect(result).toContain('Message: string error');
    });
  });

  describe('formatDatabaseError', () => {
    it('formats error with all fields', () => {
      const error = {
        code: 'PGRST116',
        message: 'Row not found',
        details: 'No matching row',
        hint: 'Check the ID',
      };
      const result = formatDatabaseError('fetch user', error);
      expect(result).toBe(
        'Failed to fetch user: [PGRST116] Row not found (No matching row) Hint: Check the ID',
      );
    });

    it('handles null error', () => {
      const result = formatDatabaseError('delete item', null);
      expect(result).toBe('Failed to delete item: Unknown error');
    });

    it('handles error with only message', () => {
      const error = { message: 'Connection timeout' };
      const result = formatDatabaseError('save data', error);
      expect(result).toBe('Failed to save data: Connection timeout');
    });

    it('handles error with only code', () => {
      const error = { code: '23505' };
      const result = formatDatabaseError('insert record', error);
      expect(result).toBe('Failed to insert record: [23505]');
    });
  });

  describe('getUserFriendlyDatabaseError', () => {
    it('returns friendly message for known error codes', () => {
      expect(
        getUserFriendlyDatabaseError('delete item', { code: '23505' }),
      ).toBe('Failed to delete item: This item already exists.');
      expect(
        getUserFriendlyDatabaseError('remove user', { code: '23503' }),
      ).toBe(
        'Failed to remove user: Cannot delete - this item is referenced by other data.',
      );
      expect(
        getUserFriendlyDatabaseError('query data', { code: '42P01' }),
      ).toBe(
        'Failed to query data: Database table not found. Please run migrations.',
      );
    });

    it('falls back to error message for unknown codes', () => {
      const error = { code: 'UNKNOWN_CODE', message: 'Something failed' };
      expect(getUserFriendlyDatabaseError('update record', error)).toBe(
        'Failed to update record: Something failed',
      );
    });

    it('returns generic message for null error', () => {
      expect(getUserFriendlyDatabaseError('save item', null)).toBe(
        'Failed to save item. Please try again.',
      );
    });

    it('returns generic message for empty error', () => {
      expect(getUserFriendlyDatabaseError('load data', {})).toBe(
        'Failed to load data. Please try again.',
      );
    });
  });
});
