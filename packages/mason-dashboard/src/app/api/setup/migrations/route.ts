import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { runMigrations } from '@/lib/supabase/pg-migrate';

/**
 * Mason Database Migrations
 *
 * IMPORTANT: See /.claude/rules/database-migrations.md for maintenance rules.
 *
 * This SQL runs when users click "Update Database Schema" in Settings.
 * It MUST be:
 *   1. IDEMPOTENT - Safe to run multiple times (use IF NOT EXISTS)
 *   2. NON-DESTRUCTIVE - NEVER delete user data (no DROP/DELETE/TRUNCATE)
 *   3. COMPLETE - Include ALL tables referenced in /lib/constants.ts TABLES
 *
 * Tables included (must match TABLES constant):
 *   - mason_users
 *   - mason_api_keys
 *   - mason_github_repositories
 *   - mason_pm_analysis_runs
 *   - mason_pm_backlog_items
 *   - mason_pm_filtered_items
 *   - mason_pm_execution_runs
 *   - mason_pm_execution_tasks
 *   - mason_remote_execution_runs
 *   - mason_execution_logs
 *   - mason_ai_provider_keys
 */
const MIGRATION_SQL = `
--------------------------------------------------------------------------------
-- MASON DATABASE SCHEMA
-- This migration is idempotent and safe to run on any database state.
-- It will create missing tables/indexes/policies without affecting existing data.
--------------------------------------------------------------------------------

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
  -- github_access_token intentionally omitted - stored in browser localStorage only
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

-- Mason PM Filtered Items table (items filtered out during analysis)
CREATE TABLE IF NOT EXISTS mason_pm_filtered_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL,
  impact_score INTEGER NOT NULL,
  effort_score INTEGER NOT NULL,
  complexity INTEGER DEFAULT 2,
  benefits JSONB DEFAULT '[]'::jsonb,
  filter_reason TEXT NOT NULL,
  filter_tier TEXT NOT NULL CHECK (filter_tier IN ('tier1', 'tier2', 'tier3')),
  filter_confidence DECIMAL(3,2) NOT NULL,
  evidence TEXT,
  analysis_run_id UUID REFERENCES mason_pm_analysis_runs(id) ON DELETE CASCADE,
  override_status TEXT DEFAULT 'filtered',
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL
);

-- Mason PM Execution Runs table (tracks /execute-approved runs)
CREATE TABLE IF NOT EXISTS mason_pm_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  item_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled')),
  error_message TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0
);

-- Mason PM Execution Tasks table (individual tasks within an execution run)
CREATE TABLE IF NOT EXISTS mason_pm_execution_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  run_id UUID NOT NULL REFERENCES mason_pm_execution_runs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  wave_number INTEGER NOT NULL,
  task_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  subagent_type TEXT NOT NULL CHECK (subagent_type IN ('Explore', 'general-purpose', 'Bash', 'code-reviewer', 'frontend-design', 'Plan')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result_summary TEXT
);

-- Ensure user_id columns exist in tables that might have been created before user_id was added
-- This handles upgrades from older schema versions
ALTER TABLE mason_api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_github_repositories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_pm_analysis_runs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_remote_execution_runs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_ai_provider_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;

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
CREATE INDEX IF NOT EXISTS idx_mason_pm_filtered_items_repository_id ON mason_pm_filtered_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_runs_status ON mason_pm_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_runs_created_at ON mason_pm_execution_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_tasks_run_id ON mason_pm_execution_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_tasks_item_id ON mason_pm_execution_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_tasks_status ON mason_pm_execution_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mason_pm_execution_tasks_wave ON mason_pm_execution_tasks(run_id, wave_number);

-- Enable Row Level Security
ALTER TABLE mason_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_remote_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_ai_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_filtered_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_execution_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (BYOD model - users own their database, allow all operations)
-- Users table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_users' AND policyname = 'Allow all on users') THEN
    CREATE POLICY "Allow all on users" ON mason_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- API Keys table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_api_keys' AND policyname = 'Allow all on api_keys') THEN
    CREATE POLICY "Allow all on api_keys" ON mason_api_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- GitHub Repositories table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_github_repositories' AND policyname = 'Allow all on github_repositories') THEN
    CREATE POLICY "Allow all on github_repositories" ON mason_github_repositories FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Analysis Runs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_analysis_runs' AND policyname = 'Allow all on pm_analysis_runs') THEN
    CREATE POLICY "Allow all on pm_analysis_runs" ON mason_pm_analysis_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Backlog Items table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_backlog_items' AND policyname = 'Allow all on pm_backlog_items') THEN
    CREATE POLICY "Allow all on pm_backlog_items" ON mason_pm_backlog_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Remote Execution Runs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_remote_execution_runs' AND policyname = 'Allow all on remote_execution_runs') THEN
    CREATE POLICY "Allow all on remote_execution_runs" ON mason_remote_execution_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Execution Logs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_execution_logs' AND policyname = 'Allow all on execution_logs') THEN
    CREATE POLICY "Allow all on execution_logs" ON mason_execution_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- AI Provider Keys table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_ai_provider_keys' AND policyname = 'Allow all on ai_provider_keys') THEN
    CREATE POLICY "Allow all on ai_provider_keys" ON mason_ai_provider_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Filtered Items table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_filtered_items' AND policyname = 'Allow all on pm_filtered_items') THEN
    CREATE POLICY "Allow all on pm_filtered_items" ON mason_pm_filtered_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Execution Runs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_execution_runs' AND policyname = 'Allow all on pm_execution_runs') THEN
    CREATE POLICY "Allow all on pm_execution_runs" ON mason_pm_execution_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Execution Tasks table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_execution_tasks' AND policyname = 'Allow all on pm_execution_tasks') THEN
    CREATE POLICY "Allow all on pm_execution_tasks" ON mason_pm_execution_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1';

/**
 * Extract project reference from Supabase URL
 * e.g., https://xyz.supabase.co -> xyz
 */
function extractProjectRefFromUrl(url: string): string | null {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

/**
 * Run migrations via Supabase Management API (for OAuth users)
 */
async function runMigrationsViaManagementApi(
  projectRef: string,
  accessToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${MANAGEMENT_API_BASE}/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: MIGRATION_SQL,
          read_only: false,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.message ||
          errorData.error ||
          `Management API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication before processing any migration request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      supabaseUrl,
      databasePassword,
      connectionString,
      projectRef,
      accessToken,
    } = body;

    // Method 1: OAuth-based migrations (preferred for OAuth users)
    if (projectRef && accessToken) {
      // Validate projectRef matches configured supabaseUrl (if provided)
      const requestSupabaseUrl = body.supabaseUrl as string | undefined;
      if (requestSupabaseUrl) {
        const expectedRef = extractProjectRefFromUrl(requestSupabaseUrl);
        if (expectedRef && expectedRef !== projectRef) {
          return NextResponse.json(
            {
              error:
                'Security validation failed: Project reference does not match your configured Supabase URL. This may indicate a configuration issue.',
              code: 'PROJECT_MISMATCH',
            },
            { status: 400 },
          );
        }
      }

      const result = await runMigrationsViaManagementApi(
        projectRef,
        accessToken,
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Method 2: Direct PostgreSQL connection (fallback)
    if (!connectionString && (!supabaseUrl || !databasePassword)) {
      return NextResponse.json(
        { error: 'Missing Supabase URL or Database Password' },
        { status: 400 },
      );
    }

    const result = await runMigrations(
      supabaseUrl || '',
      databasePassword || '',
      MIGRATION_SQL,
      connectionString,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorType: result.errorType },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 },
    );
  }
}
