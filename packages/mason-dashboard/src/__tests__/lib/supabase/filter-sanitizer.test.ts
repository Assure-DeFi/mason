import { describe, expect, it } from 'vitest';

import {
  MAX_SEARCH_LENGTH,
  sanitizePostgrestValue,
} from '@/lib/supabase/filter-sanitizer';

describe('sanitizePostgrestValue', () => {
  describe('normal input', () => {
    it('passes through plain text unchanged', () => {
      expect(sanitizePostgrestValue('hello world')).toBe('hello world');
    });

    it('passes through alphanumeric text', () => {
      expect(sanitizePostgrestValue('test123')).toBe('test123');
    });

    it('preserves hyphens and underscores', () => {
      expect(sanitizePostgrestValue('my-search_query')).toBe(
        'my-search_query',
      );
    });

    it('preserves spaces between words', () => {
      expect(sanitizePostgrestValue('fix login bug')).toBe('fix login bug');
    });
  });

  describe('PostgREST special character removal', () => {
    it('removes commas (OR condition separator)', () => {
      expect(sanitizePostgrestValue('a,b,c')).toBe('abc');
    });

    it('removes periods (field.operator.value separator)', () => {
      expect(sanitizePostgrestValue('a.b.c')).toBe('abc');
    });

    it('removes parentheses (filter grouping)', () => {
      expect(sanitizePostgrestValue('test(injection)')).toBe('testinjection');
    });

    it('removes double quotes', () => {
      expect(sanitizePostgrestValue('hello "world"')).toBe('hello world');
    });

    it('removes single quotes', () => {
      expect(sanitizePostgrestValue("it's a test")).toBe('its a test');
    });

    it('removes semicolons (statement separator)', () => {
      expect(sanitizePostgrestValue('select;drop')).toBe('selectdrop');
    });

    it('removes backslashes', () => {
      expect(sanitizePostgrestValue('path\\to\\file')).toBe('pathtofile');
    });

    it('removes all special characters in combination', () => {
      expect(sanitizePostgrestValue('a,b.eq.1(test);drop')).toBe(
        'abeq1testdrop',
      );
    });
  });

  describe('filter injection prevention', () => {
    it('neutralizes PostgREST filter injection: field.operator.value', () => {
      const malicious = 'a,b.eq.1';
      const result = sanitizePostgrestValue(malicious);
      expect(result).not.toContain(',');
      expect(result).not.toContain('.');
      expect(result).toBe('abeq1');
    });

    it('neutralizes parenthetical grouping injection', () => {
      const malicious = 'abc);select * from users;--()';
      const result = sanitizePostgrestValue(malicious);
      expect(result).not.toContain(')');
      expect(result).not.toContain('(');
      expect(result).not.toContain(';');
      expect(result).toBe('abcselect * from users--');
    });

    it('neutralizes comma-separated filter injection', () => {
      const malicious = 'test%,status.eq.approved';
      const result = sanitizePostgrestValue(malicious);
      expect(result).not.toContain(',');
      expect(result).toBe('test%statuseqapproved');
    });
  });

  describe('empty and falsy input', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizePostgrestValue('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizePostgrestValue('   ')).toBe('');
    });

    it('returns empty string for input that is all special characters', () => {
      expect(sanitizePostgrestValue(',.();"\'')).toBe('');
    });
  });

  describe('max length enforcement', () => {
    it('truncates input exceeding MAX_SEARCH_LENGTH', () => {
      const longInput = 'a'.repeat(MAX_SEARCH_LENGTH + 100);
      const result = sanitizePostgrestValue(longInput);
      expect(result.length).toBeLessThanOrEqual(MAX_SEARCH_LENGTH);
    });

    it('preserves input at exactly MAX_SEARCH_LENGTH', () => {
      const exactInput = 'a'.repeat(MAX_SEARCH_LENGTH);
      expect(sanitizePostgrestValue(exactInput)).toBe(exactInput);
    });

    it('preserves input shorter than MAX_SEARCH_LENGTH', () => {
      const shortInput = 'short search';
      expect(sanitizePostgrestValue(shortInput)).toBe(shortInput);
    });

    it('MAX_SEARCH_LENGTH is 200', () => {
      expect(MAX_SEARCH_LENGTH).toBe(200);
    });
  });

  describe('whitespace normalization', () => {
    it('collapses multiple spaces into one', () => {
      expect(sanitizePostgrestValue('hello    world')).toBe('hello world');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizePostgrestValue('  hello world  ')).toBe('hello world');
    });

    it('normalizes tabs and newlines to single space', () => {
      expect(sanitizePostgrestValue('hello\tworld\nnew')).toBe(
        'hello world new',
      );
    });
  });

  describe('preserves safe special characters', () => {
    it('preserves % (ILIKE wildcard - used intentionally in queries)', () => {
      expect(sanitizePostgrestValue('test%value')).toBe('test%value');
    });

    it('preserves * (wildcard)', () => {
      expect(sanitizePostgrestValue('test*')).toBe('test*');
    });

    it('preserves @ # $ & + = : ! ? / - _', () => {
      expect(sanitizePostgrestValue('@#$&+=:!?/-_')).toBe('@#$&+=:!?/-_');
    });
  });
});
