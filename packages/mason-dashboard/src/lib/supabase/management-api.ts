/**
 * Supabase Management API Client
 *
 * Provides authenticated access to Supabase Management API endpoints
 * using OAuth tokens for database setup and API key retrieval.
 */

const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1';

// =============================================================================
// Types
// =============================================================================

export interface SupabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  created_at: string;
  status: 'ACTIVE_HEALTHY' | 'ACTIVE_UNHEALTHY' | 'INACTIVE' | 'UNKNOWN';
}

export interface SupabaseApiKey {
  name: string;
  api_key: string;
}

export interface DatabaseQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface ManagementApiError {
  message: string;
  code?: string;
}

// =============================================================================
// Projects API
// =============================================================================

/**
 * List all projects the user has access to
 */
export async function listProjects(
  accessToken: string,
): Promise<SupabaseProject[]> {
  const response = await fetch(`${MANAGEMENT_API_BASE}/projects`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await parseError(response);
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * Get a specific project by reference
 */
export async function getProject(
  accessToken: string,
  projectRef: string,
): Promise<SupabaseProject> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/projects/${projectRef}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await parseError(response);
    throw new Error(error.message);
  }

  return response.json();
}

// =============================================================================
// Database Query API
// =============================================================================

/**
 * Run a SQL query against a project's database
 * Used for running migrations and checking table existence
 */
export async function runDatabaseQuery(
  accessToken: string,
  projectRef: string,
  query: string,
  readOnly = false,
): Promise<DatabaseQueryResult> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        read_only: readOnly,
      }),
    },
  );

  if (!response.ok) {
    const error = await parseError(response);
    throw new Error(error.message);
  }

  const data = await response.json();

  // The API returns results in array format for each statement
  // For single statements, return the first result
  if (Array.isArray(data) && data.length > 0) {
    const firstResult = data[data.length - 1]; // Get last statement result
    return {
      rows: firstResult.result || [],
      rowCount: firstResult.result?.length || 0,
    };
  }

  return {
    rows: data.result || [],
    rowCount: data.result?.length || 0,
  };
}

/**
 * Check if Mason tables exist in the database
 */
export async function checkMasonTablesExist(
  accessToken: string,
  projectRef: string,
): Promise<{ exists: boolean; missing: string[] }> {
  const requiredTables = [
    'mason_users',
    'mason_api_keys',
    'mason_github_repositories',
    'mason_pm_backlog_items',
    'mason_pm_analysis_runs',
    'mason_remote_execution_runs',
    'mason_execution_logs',
  ];

  try {
    const result = await runDatabaseQuery(
      accessToken,
      projectRef,
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_name LIKE 'mason_%'`,
      true,
    );

    const existingTables = new Set(
      result.rows.map((row) => row.table_name as string),
    );
    const missing = requiredTables.filter(
      (table) => !existingTables.has(table),
    );

    return {
      exists: missing.length === 0,
      missing,
    };
  } catch (error) {
    // If we can't query, assume tables don't exist
    return {
      exists: false,
      missing: requiredTables,
    };
  }
}

// =============================================================================
// API Keys
// =============================================================================

/**
 * Get API keys for a project
 * Returns anon (publishable) and service_role keys
 */
export async function getApiKeys(
  accessToken: string,
  projectRef: string,
): Promise<{ anonKey: string; serviceRoleKey: string }> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/projects/${projectRef}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    const error = await parseError(response);
    throw new Error(error.message);
  }

  const keys: SupabaseApiKey[] = await response.json();

  const anonKey = keys.find((k) => k.name === 'anon')?.api_key;
  const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;

  if (!anonKey) {
    throw new Error('Could not find anon API key for project');
  }

  if (!serviceRoleKey) {
    throw new Error('Could not find service_role API key for project');
  }

  return { anonKey, serviceRoleKey };
}

// =============================================================================
// Migrations
// =============================================================================

/**
 * Mason database migration SQL
 * Creates all required tables with proper indexes and RLS policies
 */
export const MASON_MIGRATION_SQL = `
-- Mason Users table (for user's own Supabase, NOT central DB)
-- Privacy: github_access_token is NOT stored here - it stays in browser localStorage
CREATE TABLE IF NOT EXISTS mason_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  github_email TEXT,
  github_avatar_url TEXT,
  default_repository_id UUID,
  is_active BOOLEAN DEFAULT true
);

-- Mason API Keys table
CREATE TABLE IF NOT EXISTS mason_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ
);

-- Mason GitHub Repositories table
CREATE TABLE IF NOT EXISTS mason_github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  github_owner TEXT NOT NULL,
  github_name TEXT NOT NULL,
  github_full_name TEXT NOT NULL,
  github_default_branch TEXT NOT NULL DEFAULT 'main',
  github_private BOOLEAN DEFAULT false,
  github_clone_url TEXT NOT NULL,
  github_html_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  UNIQUE(user_id, github_repo_id)
);

-- Mason PM Analysis Runs table
CREATE TABLE IF NOT EXISTS mason_pm_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'full',
  items_found INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  error_message TEXT
);

-- Mason PM Backlog Items table
CREATE TABLE IF NOT EXISTS mason_pm_backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL,
  analysis_run_id UUID REFERENCES mason_pm_analysis_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('frontend', 'backend')),
  type TEXT NOT NULL CHECK (type IN ('dashboard', 'discovery', 'auth', 'backend')),
  complexity INTEGER NOT NULL CHECK (complexity BETWEEN 1 AND 5),
  impact_score INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 10),
  effort_score INTEGER NOT NULL CHECK (effort_score BETWEEN 1 AND 10),
  priority_score INTEGER GENERATED ALWAYS AS (impact_score * 2 - effort_score) STORED,
  benefits JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected')),
  branch_name TEXT,
  pr_url TEXT,
  prd_content TEXT,
  prd_generated_at TIMESTAMPTZ
);

-- Mason Remote Execution Runs table
CREATE TABLE IF NOT EXISTS mason_remote_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES mason_github_repositories(id) ON DELETE CASCADE,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  item_count INTEGER DEFAULT 0,
  branch_name TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  pr_url TEXT,
  pr_number INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled')),
  error_message TEXT,
  files_changed INTEGER DEFAULT 0,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0
);

-- Mason Execution Logs table
CREATE TABLE IF NOT EXISTS mason_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  execution_run_id UUID NOT NULL REFERENCES mason_remote_execution_runs(id) ON DELETE CASCADE,
  log_level TEXT DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Mason AI Provider Keys table
CREATE TABLE IF NOT EXISTS mason_ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mason_api_keys_user_id ON mason_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_api_keys_key_hash ON mason_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mason_github_repositories_user_id ON mason_github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_id ON mason_pm_backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_status ON mason_pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_repository_id ON mason_pm_backlog_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_analysis_runs_user_id ON mason_pm_analysis_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_remote_execution_runs_user_id ON mason_remote_execution_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_execution_logs_execution_run_id ON mason_execution_logs(execution_run_id);
CREATE INDEX IF NOT EXISTS idx_mason_ai_provider_keys_user_id ON mason_ai_provider_keys(user_id);

-- Enable Row Level Security
ALTER TABLE mason_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_remote_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies (BYOD model - users own their database, allow all operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_users' AND policyname = 'Allow all operations on mason_users'
  ) THEN
    CREATE POLICY "Allow all operations on mason_users" ON mason_users
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_api_keys' AND policyname = 'Allow all operations on mason_api_keys'
  ) THEN
    CREATE POLICY "Allow all operations on mason_api_keys" ON mason_api_keys
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_github_repositories' AND policyname = 'Allow all operations on mason_github_repositories'
  ) THEN
    CREATE POLICY "Allow all operations on mason_github_repositories" ON mason_github_repositories
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_analysis_runs' AND policyname = 'Allow all operations on mason_pm_analysis_runs'
  ) THEN
    CREATE POLICY "Allow all operations on mason_pm_analysis_runs" ON mason_pm_analysis_runs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_backlog_items' AND policyname = 'Allow all operations on mason_pm_backlog_items'
  ) THEN
    CREATE POLICY "Allow all operations on mason_pm_backlog_items" ON mason_pm_backlog_items
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_remote_execution_runs' AND policyname = 'Allow all operations on mason_remote_execution_runs'
  ) THEN
    CREATE POLICY "Allow all operations on mason_remote_execution_runs" ON mason_remote_execution_runs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_execution_logs' AND policyname = 'Allow all operations on mason_execution_logs'
  ) THEN
    CREATE POLICY "Allow all operations on mason_execution_logs" ON mason_execution_logs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mason_ai_provider_keys' AND policyname = 'Allow all operations on mason_ai_provider_keys'
  ) THEN
    CREATE POLICY "Allow all operations on mason_ai_provider_keys" ON mason_ai_provider_keys
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

/**
 * Run Mason database migrations on a project
 */
export async function runMasonMigrations(
  accessToken: string,
  projectRef: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await runDatabaseQuery(accessToken, projectRef, MASON_MIGRATION_SQL, false);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}

// =============================================================================
// Project URL Construction
// =============================================================================

/**
 * Build the Supabase project URL from project reference
 */
export function buildProjectUrl(projectRef: string): string {
  return `https://${projectRef}.supabase.co`;
}

// =============================================================================
// Error Handling
// =============================================================================

async function parseError(response: Response): Promise<ManagementApiError> {
  try {
    const data = await response.json();
    return {
      message:
        data.message ||
        data.error ||
        data.error_description ||
        `API error: ${response.status}`,
      code: data.code,
    };
  } catch {
    return {
      message: `API error: ${response.status} ${response.statusText}`,
    };
  }
}
