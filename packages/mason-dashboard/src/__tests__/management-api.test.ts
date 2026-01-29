import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listProjects,
  getProject,
  runDatabaseQuery,
  checkMasonTablesExist,
  getApiKeys,
  runMasonMigrations,
  buildProjectUrl,
  type SupabaseProject,
} from '@/lib/supabase/management-api';

describe('Management API Client', () => {
  const mockAccessToken = 'test-access-token';

  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  describe('listProjects', () => {
    it('should fetch and return projects', async () => {
      const mockProjects: SupabaseProject[] = [
        {
          id: 'project-1',
          organization_id: 'org-1',
          name: 'Project One',
          region: 'us-east-1',
          created_at: '2024-01-01T00:00:00Z',
          status: 'ACTIVE_HEALTHY',
        },
        {
          id: 'project-2',
          organization_id: 'org-1',
          name: 'Project Two',
          region: 'eu-west-1',
          created_at: '2024-01-02T00:00:00Z',
          status: 'ACTIVE_HEALTHY',
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      } as Response);

      const projects = await listProjects(mockAccessToken);

      expect(projects).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.supabase.com/v1/projects',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should throw on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      } as Response);

      await expect(listProjects(mockAccessToken)).rejects.toThrow(
        'Unauthorized',
      );
    });
  });

  describe('getProject', () => {
    it('should fetch a specific project', async () => {
      const mockProject: SupabaseProject = {
        id: 'project-1',
        organization_id: 'org-1',
        name: 'Project One',
        region: 'us-east-1',
        created_at: '2024-01-01T00:00:00Z',
        status: 'ACTIVE_HEALTHY',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      } as Response);

      const project = await getProject(mockAccessToken, 'project-1');

      expect(project).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.supabase.com/v1/projects/project-1',
        expect.any(Object),
      );
    });
  });

  describe('runDatabaseQuery', () => {
    it('should run a query and return results', async () => {
      const mockResult = [
        {
          result: [{ id: 1, name: 'Test' }],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await runDatabaseQuery(
        mockAccessToken,
        'project-1',
        'SELECT * FROM users',
        true,
      );

      expect(result.rows).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.rowCount).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.supabase.com/v1/projects/project-1/database/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'SELECT * FROM users',
            read_only: true,
          }),
        }),
      );
    });

    it('should handle empty results', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ result: [] }],
      } as Response);

      const result = await runDatabaseQuery(
        mockAccessToken,
        'project-1',
        'SELECT * FROM empty_table',
      );

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should throw on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Query failed' }),
      } as Response);

      await expect(
        runDatabaseQuery(mockAccessToken, 'project-1', 'INVALID SQL'),
      ).rejects.toThrow('Query failed');
    });
  });

  describe('checkMasonTablesExist', () => {
    it('should return exists: true when all tables exist', async () => {
      const mockResult = [
        {
          result: [
            { table_name: 'mason_users' },
            { table_name: 'mason_api_keys' },
            { table_name: 'mason_github_repositories' },
            { table_name: 'mason_pm_backlog_items' },
            { table_name: 'mason_pm_analysis_runs' },
            { table_name: 'mason_remote_execution_runs' },
            { table_name: 'mason_execution_logs' },
          ],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await checkMasonTablesExist(mockAccessToken, 'project-1');

      expect(result.exists).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return missing tables when some are absent', async () => {
      const mockResult = [
        {
          result: [
            { table_name: 'mason_users' },
            { table_name: 'mason_api_keys' },
          ],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await checkMasonTablesExist(mockAccessToken, 'project-1');

      expect(result.exists).toBe(false);
      expect(result.missing).toContain('mason_github_repositories');
      expect(result.missing).toContain('mason_pm_backlog_items');
    });

    it('should return all tables as missing on error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkMasonTablesExist(mockAccessToken, 'project-1');

      expect(result.exists).toBe(false);
      expect(result.missing.length).toBe(7);
    });
  });

  describe('getApiKeys', () => {
    it('should fetch and return API keys', async () => {
      const mockKeys = [
        { name: 'anon', api_key: 'anon-key-123' },
        { name: 'service_role', api_key: 'service-key-456' },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockKeys,
      } as Response);

      const keys = await getApiKeys(mockAccessToken, 'project-1');

      expect(keys.anonKey).toBe('anon-key-123');
      expect(keys.serviceRoleKey).toBe('service-key-456');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.supabase.com/v1/projects/project-1/api-keys',
        expect.any(Object),
      );
    });

    it('should throw if anon key is missing', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'service_role', api_key: 'service-key' }],
      } as Response);

      await expect(getApiKeys(mockAccessToken, 'project-1')).rejects.toThrow(
        'Could not find anon API key',
      );
    });

    it('should throw if service_role key is missing', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'anon', api_key: 'anon-key' }],
      } as Response);

      await expect(getApiKeys(mockAccessToken, 'project-1')).rejects.toThrow(
        'Could not find service_role API key',
      );
    });
  });

  describe('runMasonMigrations', () => {
    it('should run migrations successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ result: [] }],
      } as Response);

      const result = await runMasonMigrations(mockAccessToken, 'project-1');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Permission denied' }),
      } as Response);

      const result = await runMasonMigrations(mockAccessToken, 'project-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('buildProjectUrl', () => {
    it('should build correct project URL', () => {
      expect(buildProjectUrl('abc123')).toBe('https://abc123.supabase.co');
    });

    it('should handle project refs with dashes', () => {
      expect(buildProjectUrl('my-project-ref')).toBe(
        'https://my-project-ref.supabase.co',
      );
    });
  });
});
