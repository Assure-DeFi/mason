import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MIGRATION_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  github_email TEXT,
  github_avatar_url TEXT,
  github_access_token TEXT NOT NULL,
  github_token_expires_at TIMESTAMPTZ,
  default_repository_id UUID,
  is_active BOOLEAN DEFAULT true
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ
);

-- GitHub Repositories table
CREATE TABLE IF NOT EXISTS github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- PM Analysis Runs table
CREATE TABLE IF NOT EXISTS pm_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES github_repositories(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'full',
  items_found INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  error_message TEXT
);

-- PM Backlog Items table
CREATE TABLE IF NOT EXISTS pm_backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES github_repositories(id) ON DELETE SET NULL,
  analysis_run_id UUID REFERENCES pm_analysis_runs(id) ON DELETE SET NULL,
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

-- Remote Execution Runs table
CREATE TABLE IF NOT EXISTS remote_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
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

-- Execution Logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  execution_run_id UUID NOT NULL REFERENCES remote_execution_runs(id) ON DELETE CASCADE,
  log_level TEXT DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_github_repositories_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_user_id ON pm_backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_status ON pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_repository_id ON pm_backlog_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_pm_analysis_runs_user_id ON pm_analysis_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_execution_runs_user_id ON remote_execution_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_run_id ON execution_logs(execution_run_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
`;

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseServiceKey } = await request.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase URL or Service Key' },
        { status: 400 },
      );
    }

    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const statements = MIGRATION_SQL.split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      const { error } = await client.rpc('exec_sql', {
        sql: statement + ';',
      });

      if (error && !error.message.includes('already exists')) {
        const { error: directError } = await client
          .from('_migrations')
          .select('*')
          .limit(1);

        if (
          directError &&
          directError.code !== '42P01' &&
          !directError.message.includes('does not exist')
        ) {
          throw new Error(`Migration failed: ${error.message}`);
        }
      }
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
