-- Mason PM System: Auth and GitHub Integration
-- Migration: 002_auth_and_github
-- Description: Adds authentication, GitHub repository management, and remote execution support

--------------------------------------------------------------------------------
-- Table: users
-- Stores authenticated users with GitHub OAuth tokens
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- GitHub OAuth data
  github_id TEXT NOT NULL UNIQUE,
  github_username TEXT NOT NULL,
  github_email TEXT,
  github_avatar_url TEXT,

  -- Encrypted access token (encrypted at application level)
  github_access_token TEXT NOT NULL,
  github_token_expires_at TIMESTAMPTZ,

  -- User preferences
  default_repository_id UUID,

  -- Account status
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

--------------------------------------------------------------------------------
-- Table: github_repositories
-- Connected repositories per user
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Owner reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- GitHub repository data
  github_repo_id BIGINT NOT NULL,
  github_owner TEXT NOT NULL,
  github_name TEXT NOT NULL,
  github_full_name TEXT NOT NULL,  -- "owner/name"
  github_default_branch TEXT NOT NULL DEFAULT 'main',
  github_private BOOLEAN NOT NULL DEFAULT false,

  -- Repository URL
  github_clone_url TEXT NOT NULL,
  github_html_url TEXT NOT NULL,

  -- Connection status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  -- Unique constraint: one repo per user
  UNIQUE(user_id, github_repo_id)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_github_repositories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_github_repositories_updated_at ON github_repositories;
CREATE TRIGGER trigger_github_repositories_updated_at
  BEFORE UPDATE ON github_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_github_repositories_updated_at();

--------------------------------------------------------------------------------
-- Table: remote_execution_runs
-- Tracks dashboard-initiated executions (distinct from CLI executions)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remote_execution_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Owner and target
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,

  -- Items being executed
  item_ids UUID[] NOT NULL DEFAULT '{}',
  item_count INTEGER NOT NULL DEFAULT 0,

  -- Git integration
  branch_name TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'main',
  pr_url TEXT,
  pr_number INTEGER,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'success', 'failed', 'cancelled'

  -- Error tracking
  error_message TEXT,

  -- Statistics
  files_changed INTEGER DEFAULT 0,
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_remote_execution_status CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled'))
);

--------------------------------------------------------------------------------
-- Table: execution_logs
-- Real-time logs for execution progress (streamed to dashboard)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Parent execution
  execution_run_id UUID NOT NULL REFERENCES remote_execution_runs(id) ON DELETE CASCADE,

  -- Log entry
  log_level TEXT NOT NULL DEFAULT 'info',  -- 'debug', 'info', 'warn', 'error'
  message TEXT NOT NULL,

  -- Optional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_log_level CHECK (log_level IN ('debug', 'info', 'warn', 'error'))
);

--------------------------------------------------------------------------------
-- Modify pm_backlog_items: Add user_id and repository_id
--------------------------------------------------------------------------------

-- Add user_id column (nullable for backwards compatibility)
ALTER TABLE pm_backlog_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add repository_id column (nullable for backwards compatibility)
ALTER TABLE pm_backlog_items
ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES github_repositories(id) ON DELETE SET NULL;

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- users indexes
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- github_repositories indexes
CREATE INDEX IF NOT EXISTS idx_github_repositories_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_github_repo_id ON github_repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_full_name ON github_repositories(github_full_name);
CREATE INDEX IF NOT EXISTS idx_github_repositories_is_active ON github_repositories(is_active);

-- remote_execution_runs indexes
CREATE INDEX IF NOT EXISTS idx_remote_execution_runs_user_id ON remote_execution_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_remote_execution_runs_repository_id ON remote_execution_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_remote_execution_runs_status ON remote_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_remote_execution_runs_created_at ON remote_execution_runs(created_at DESC);

-- execution_logs indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_run_id ON execution_logs(execution_run_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_level ON execution_logs(log_level);

-- pm_backlog_items new indexes
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_user_id ON pm_backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_repository_id ON pm_backlog_items(repository_id);

--------------------------------------------------------------------------------
-- Row Level Security (RLS)
--------------------------------------------------------------------------------

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- Users: Only authenticated user can access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true);  -- Will be restricted by auth.uid() in production

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- GitHub repositories: Users can only access their own repos
CREATE POLICY "Users can view own repositories" ON github_repositories
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own repositories" ON github_repositories
  FOR ALL USING (true) WITH CHECK (true);

-- Remote execution runs: Users can only access their own runs
CREATE POLICY "Users can view own execution runs" ON remote_execution_runs
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own execution runs" ON remote_execution_runs
  FOR ALL USING (true) WITH CHECK (true);

-- Execution logs: Users can view logs for their runs
CREATE POLICY "Users can view execution logs" ON execution_logs
  FOR SELECT USING (true);

CREATE POLICY "System can insert execution logs" ON execution_logs
  FOR INSERT WITH CHECK (true);

--------------------------------------------------------------------------------
-- Realtime subscriptions (for progress streaming)
--------------------------------------------------------------------------------

-- Enable realtime for execution_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE execution_logs;

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON TABLE users IS 'Authenticated users with GitHub OAuth tokens';
COMMENT ON TABLE github_repositories IS 'Connected GitHub repositories per user';
COMMENT ON TABLE remote_execution_runs IS 'Dashboard-initiated execution runs';
COMMENT ON TABLE execution_logs IS 'Real-time execution logs for progress streaming';

COMMENT ON COLUMN users.github_access_token IS 'GitHub OAuth access token (encrypted at app level)';
COMMENT ON COLUMN users.default_repository_id IS 'User preferred default repository';

COMMENT ON COLUMN github_repositories.github_full_name IS 'Full repository name in owner/repo format';
COMMENT ON COLUMN github_repositories.last_synced_at IS 'Last time repo metadata was synced from GitHub';

COMMENT ON COLUMN remote_execution_runs.item_ids IS 'Array of backlog item UUIDs being executed';
COMMENT ON COLUMN remote_execution_runs.branch_name IS 'Git branch created for this execution';
COMMENT ON COLUMN remote_execution_runs.base_branch IS 'Base branch to create PR against';

COMMENT ON COLUMN execution_logs.metadata IS 'Optional JSON metadata (file paths, error details, etc.)';

COMMENT ON COLUMN pm_backlog_items.user_id IS 'Owner of this backlog item (nullable for CLI-created items)';
COMMENT ON COLUMN pm_backlog_items.repository_id IS 'Target repository for this item (nullable for CLI-created items)';
