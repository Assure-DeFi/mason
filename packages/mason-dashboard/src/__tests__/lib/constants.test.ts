import { describe, expect, it } from 'vitest';

import { API_ROUTES, REALTIME_CHANNELS, STORAGE_KEYS, TABLES } from '@/lib/constants';

describe('constants', () => {
  describe('STORAGE_KEYS', () => {
    it('has all required keys defined', () => {
      expect(STORAGE_KEYS.CONFIG).toBe('mason_config');
      expect(STORAGE_KEYS.LAST_REPOSITORY).toBe('mason-last-repository');
      expect(STORAGE_KEYS.EXECUTE_PREFERENCE).toBe('mason_execute_preference');
      expect(STORAGE_KEYS.GITHUB_TOKEN).toBe('mason_github_token');
      expect(STORAGE_KEYS.SUPABASE_OAUTH_SESSION).toBe(
        'mason_supabase_oauth_session',
      );
      expect(STORAGE_KEYS.COLUMN_WIDTHS).toBe('mason_backlog_column_widths');
    });
  });

  describe('TABLES', () => {
    it('has all core tables with mason_ prefix', () => {
      expect(TABLES.USERS).toBe('mason_users');
      expect(TABLES.API_KEYS).toBe('mason_api_keys');
      expect(TABLES.GITHUB_REPOSITORIES).toBe('mason_github_repositories');
    });

    it('has all PM backlog tables', () => {
      expect(TABLES.PM_BACKLOG_ITEMS).toBe('mason_pm_backlog_items');
      expect(TABLES.PM_ANALYSIS_RUNS).toBe('mason_pm_analysis_runs');
      expect(TABLES.PM_FILTERED_ITEMS).toBe('mason_pm_filtered_items');
    });

    it('has execution progress table', () => {
      expect(TABLES.EXECUTION_PROGRESS).toBe('mason_execution_progress');
    });

    it('all table names have mason_ prefix', () => {
      Object.values(TABLES).forEach((tableName) => {
        expect(tableName).toMatch(/^mason_/);
      });
    });
  });

  describe('API_ROUTES', () => {
    it('has required API routes', () => {
      expect(API_ROUTES.GITHUB_REPOSITORIES).toBe('/api/github/repositories');
      expect(API_ROUTES.SETUP_MIGRATIONS).toBe('/api/setup/migrations');
      expect(API_ROUTES.BACKLOG_RESTORE).toBe('/api/backlog/restore');
    });

    it('all routes start with /api', () => {
      Object.values(API_ROUTES).forEach((route) => {
        expect(route).toMatch(/^\/api/);
      });
    });
  });

  describe('REALTIME_CHANNELS', () => {
    it('has backlog changes channel', () => {
      expect(REALTIME_CHANNELS.BACKLOG_CHANGES).toBe(
        'mason_pm_backlog_changes',
      );
    });
  });
});
