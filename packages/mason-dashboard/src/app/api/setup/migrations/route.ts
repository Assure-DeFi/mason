import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { runMigrations } from '@/lib/supabase/pg-migrate';

/**
 * Mason Database Migrations
 *
 * IMPORTANT: See /.claude/rules/database-migrations.md for maintenance rules.
 *
 * This SQL runs:
 *   - AUTOMATICALLY on page load via useAutoMigrations hook (once per browser session)
 *   - MANUALLY when users click "Update Database Schema" in Settings
 *
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
 *   - mason_execution_progress (realtime status updates)
 *   - mason_pm_restore_feedback
 *   - mason_dependency_analysis
 *   - mason_autopilot_config
 *   - mason_autopilot_runs
 *   - mason_audit_logs
 *
 * Realtime-enabled tables (for dashboard live updates):
 *   - mason_execution_progress (ExecutionStatusModal visualization)
 *   - mason_pm_backlog_items (item status changes from CLI)
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
-- NOTE: type column uses new 8-category system (v2.0):
--   feature, ui, ux, api, data, security, performance, code-quality
-- Legacy values (dashboard, discovery, auth, backend) are still accepted for backwards compatibility
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
  type TEXT NOT NULL CHECK (type IN ('feature', 'ui', 'ux', 'api', 'data', 'security', 'performance', 'code-quality', 'dashboard', 'discovery', 'auth', 'backend')),
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

-- Mason Execution Progress table (real-time progress for dashboard updates)
-- This is the ONLY execution table needed - dashboard subscribes to this for live updates
CREATE TABLE IF NOT EXISTS mason_execution_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  run_id TEXT, -- Groups multiple items in a batch execution (nullable for single-item executions)

  -- Execution phase
  current_phase TEXT DEFAULT 'site_review' CHECK (current_phase IN ('site_review', 'foundation', 'building', 'inspection', 'complete')),

  -- Wave progress
  current_wave INTEGER DEFAULT 1,
  total_waves INTEGER DEFAULT 4,
  wave_status TEXT DEFAULT 'pending' CHECK (wave_status IN ('pending', 'in_progress', 'completed')),

  -- Task progress within wave
  current_task TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,

  -- Checkpoint-based progress tracking (replaces unreliable log streaming)
  checkpoint_index INTEGER DEFAULT 0,
  checkpoint_total INTEGER DEFAULT 0,
  checkpoint_message TEXT,
  checkpoints_completed JSONB DEFAULT '[]'::jsonb,

  -- File-level progress
  current_file TEXT,
  files_touched TEXT[] DEFAULT '{}',
  lines_changed INTEGER DEFAULT 0,

  -- Validation status
  validation_typescript TEXT DEFAULT 'pending' CHECK (validation_typescript IN ('pending', 'running', 'pass', 'fail')),
  validation_eslint TEXT DEFAULT 'pending' CHECK (validation_eslint IN ('pending', 'running', 'pass', 'fail')),
  validation_build TEXT DEFAULT 'pending' CHECK (validation_build IN ('pending', 'running', 'pass', 'fail')),
  validation_tests TEXT DEFAULT 'pending' CHECK (validation_tests IN ('pending', 'running', 'pass', 'fail')),
  validation_smoke_test TEXT DEFAULT 'skipped' CHECK (validation_smoke_test IN ('pending', 'running', 'pass', 'fail', 'skipped')),

  -- Inspector findings (for fix iterations)
  inspector_findings TEXT[] DEFAULT '{}',

  -- Fix iterations
  fix_iteration INTEGER DEFAULT 0,
  max_iterations INTEGER DEFAULT 5,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  UNIQUE(item_id)
);

-- Mason PM Restore Feedback table (tracks restored items for confidence decay)
-- Used by pm-validator to learn which filter patterns are too aggressive
CREATE TABLE IF NOT EXISTS mason_pm_restore_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filtered_item_id UUID REFERENCES mason_pm_filtered_items(id) ON DELETE CASCADE,
  filter_tier TEXT NOT NULL,
  filter_reason TEXT NOT NULL,
  restored_at TIMESTAMPTZ NOT NULL
);

-- Mason Dependency Analysis table (detailed risk analysis for backlog items)
-- Stores import graph, test coverage gaps, and breaking change detection
CREATE TABLE IF NOT EXISTS mason_dependency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,

  -- Files identified in solution
  target_files TEXT[] DEFAULT '{}',
  -- Files that import target files (cascade risk)
  affected_files TEXT[] DEFAULT '{}',
  -- Files that target files import (upstream dependencies)
  upstream_dependencies TEXT[] DEFAULT '{}',

  -- Risk score breakdown (1-10 each)
  file_count_score INTEGER DEFAULT 1 CHECK (file_count_score BETWEEN 1 AND 10),
  dependency_depth_score INTEGER DEFAULT 1 CHECK (dependency_depth_score BETWEEN 1 AND 10),
  test_coverage_score INTEGER DEFAULT 1 CHECK (test_coverage_score BETWEEN 1 AND 10),
  cascade_potential_score INTEGER DEFAULT 1 CHECK (cascade_potential_score BETWEEN 1 AND 10),
  api_surface_score INTEGER DEFAULT 1 CHECK (api_surface_score BETWEEN 1 AND 10),

  -- Computed overall risk score (weighted average)
  overall_risk_score INTEGER GENERATED ALWAYS AS (
    (file_count_score * 20 +
     dependency_depth_score * 25 +
     test_coverage_score * 25 +
     cascade_potential_score * 20 +
     api_surface_score * 10) / 100
  ) STORED,

  -- Breaking changes detection
  breaking_changes JSONB DEFAULT '[]'::jsonb,
  has_breaking_changes BOOLEAN GENERATED ALWAYS AS (jsonb_array_length(breaking_changes) > 0) STORED,

  -- Test coverage gaps
  files_without_tests TEXT[] DEFAULT '{}',

  -- Database/external API impact
  migration_needed BOOLEAN DEFAULT false,
  api_changes_detected BOOLEAN DEFAULT false,

  UNIQUE(item_id)
);

-- Mason Autopilot Config table (one per repo)
-- Stores autopilot configuration: schedule, rules, limits
CREATE TABLE IF NOT EXISTS mason_autopilot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  schedule_cron TEXT,                    -- e.g., "0 2 * * *" for daily at 2am
  auto_approval_rules JSONB DEFAULT '{"maxComplexity": 2, "minImpact": 7, "excludedCategories": []}'::jsonb,
  guardian_rails JSONB DEFAULT '{"maxItemsPerDay": 3, "pauseOnFailure": true, "requireHumanReviewComplexity": 5}'::jsonb,
  execution_window JSONB DEFAULT '{"startHour": 22, "endHour": 6}'::jsonb,
  last_heartbeat TIMESTAMPTZ,            -- Daemon pings this to show it's alive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repository_id)
);

-- Mason Autopilot Runs table (execution history)
-- Tracks each autopilot run (analysis or execution)
CREATE TABLE IF NOT EXISTS mason_autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('analysis', 'execution')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  items_analyzed INTEGER DEFAULT 0,
  items_auto_approved INTEGER DEFAULT 0,
  items_executed INTEGER DEFAULT 0,
  prs_created INTEGER DEFAULT 0,
  error_message TEXT,
  skip_reason TEXT,                          -- Reason for skipped runs (e.g., backlog at capacity)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Mason Item Events table (status change history tracking)
-- Records actual status change events with timestamps for audit trail
CREATE TABLE IF NOT EXISTS mason_item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('status_changed', 'prd_generated', 'branch_created', 'pr_created', 'note_added')),
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES mason_users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Mason Audit Logs table (security event tracking)
-- Captures authentication events, API key lifecycle, and sensitive operations
CREATE TABLE IF NOT EXISTS mason_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES mason_users(id) ON DELETE SET NULL,
  -- Event categorization
  event_type TEXT NOT NULL CHECK (event_type IN (
    'auth.login', 'auth.logout', 'auth.login_failed',
    'api_key.created', 'api_key.deleted', 'api_key.used',
    'account.deleted', 'account.updated',
    'repository.connected', 'repository.disconnected',
    'data.export', 'data.delete',
    'admin.action'
  )),
  -- Resource being acted upon
  resource_type TEXT,
  resource_id TEXT,
  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  -- Action details
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  -- Outcome
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Mason Migrations table (tracks applied schema migrations)
CREATE TABLE IF NOT EXISTS mason_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Ensure user_id columns exist in tables that might have been created before user_id was added
-- This handles upgrades from older schema versions
ALTER TABLE mason_api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_github_repositories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_pm_analysis_runs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE CASCADE;

-- Add risk analysis summary columns to backlog items (for quick access without joins)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score IS NULL OR risk_score BETWEEN 1 AND 10);
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS risk_analyzed_at TIMESTAMPTZ;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS files_affected_count INTEGER DEFAULT 0;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS has_breaking_changes BOOLEAN DEFAULT false;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS test_coverage_gaps INTEGER DEFAULT 0;

-- Add feature classification columns (for Features + Banger Idea feature)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS is_new_feature BOOLEAN DEFAULT false;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS is_banger_idea BOOLEAN DEFAULT false;

-- Add tags column for categorization (e.g., "banger" tag for rotated banger ideas)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add evidence validation columns (for false positive prevention via codebase evidence checking)
-- Values: 'verified' (evidence confirms problem), 'refuted' (evidence shows problem doesn't exist), 'inconclusive' (unclear)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS evidence_status TEXT CHECK (evidence_status IS NULL OR evidence_status IN ('verified', 'refuted', 'inconclusive'));
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS evidence_summary TEXT;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS evidence_checked_at TIMESTAMPTZ;

-- Add skip reason for items that were skipped during execution (e.g., re-evaluation determined no benefit)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Add risk rationale for pm-review risk explanation
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS risk_rationale TEXT;

-- Add source tracking for autopilot visibility
-- Values: 'manual' (human ran /pm-review) or 'autopilot' (daemon ran it)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS autopilot_run_id UUID REFERENCES mason_autopilot_runs(id) ON DELETE SET NULL;

-- Add checkpoint-based progress tracking columns (for existing databases)
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS checkpoint_index INTEGER DEFAULT 0;
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS checkpoint_total INTEGER DEFAULT 0;
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS checkpoint_message TEXT;
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS checkpoints_completed JSONB DEFAULT '[]'::jsonb;

-- Add smoke test validation column (for optional --smoke-test flag)
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS validation_smoke_test TEXT DEFAULT 'skipped';

-- Add skip_reason column to autopilot_runs (for existing databases)
ALTER TABLE mason_autopilot_runs ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Add error_details and last_activity columns to autopilot_runs (for better error visibility)
ALTER TABLE mason_autopilot_runs ADD COLUMN IF NOT EXISTS error_details TEXT;
ALTER TABLE mason_autopilot_runs ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- Create autopilot_errors table for tracking daemon errors (helps debug recurring failures)
CREATE TABLE IF NOT EXISTS mason_autopilot_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for autopilot_errors
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_errors_occurred_at ON mason_autopilot_errors(occurred_at DESC);

-- Enable RLS on autopilot_errors
ALTER TABLE mason_autopilot_errors ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for autopilot_errors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_autopilot_errors' AND policyname = 'Allow all on autopilot_errors') THEN
    CREATE POLICY "Allow all on autopilot_errors" ON mason_autopilot_errors FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Update autopilot_runs status constraint to include 'skipped' (for existing databases)
DO $$ BEGIN
  ALTER TABLE mason_autopilot_runs DROP CONSTRAINT IF EXISTS mason_autopilot_runs_status_check;
  ALTER TABLE mason_autopilot_runs ADD CONSTRAINT mason_autopilot_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed', 'skipped'));
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists with correct values
END $$;

-- Add run_id column for batch execution grouping (for existing databases)
ALTER TABLE mason_execution_progress ADD COLUMN IF NOT EXISTS run_id TEXT;

-- Update type CHECK constraint to include new 8-category system (v2.0)
-- This migration updates existing databases to accept new category values
-- New categories: feature, ui, ux, api, data, security, performance, code-quality
-- Legacy categories: dashboard->ui, discovery->code-quality, auth->security, backend->api
DO $$ BEGIN
  -- Drop old constraints if they exist (covers both auto-named and custom-named)
  ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS mason_pm_backlog_items_type_check;
  ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS valid_type;
  -- Add new constraint with all categories (new + legacy for backwards compat)
  ALTER TABLE mason_pm_backlog_items ADD CONSTRAINT mason_pm_backlog_items_type_check
    CHECK (type IN ('feature', 'ui', 'ux', 'api', 'data', 'security', 'performance', 'code-quality', 'dashboard', 'discovery', 'auth', 'backend'));
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraint already exists with correct values
END $$;

-- Also update filtered items table to accept new category values
DO $$ BEGIN
  ALTER TABLE mason_pm_filtered_items DROP CONSTRAINT IF EXISTS mason_pm_filtered_items_type_check;
  -- No constraint was originally defined for filtered_items, just ensure it accepts new values
EXCEPTION WHEN undefined_object THEN
  NULL; -- No constraint to drop
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mason_api_keys_user_id ON mason_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_api_keys_key_hash ON mason_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mason_github_repositories_user_id ON mason_github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_id ON mason_pm_backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_status ON mason_pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_repository_id ON mason_pm_backlog_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_analysis_runs_user_id ON mason_pm_analysis_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_filtered_items_repository_id ON mason_pm_filtered_items(repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_execution_progress_item ON mason_execution_progress(item_id);
CREATE INDEX IF NOT EXISTS idx_mason_execution_progress_run ON mason_execution_progress(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mason_pm_restore_feedback_tier ON mason_pm_restore_feedback(filter_tier);
CREATE INDEX IF NOT EXISTS idx_mason_pm_restore_feedback_filtered_item ON mason_pm_restore_feedback(filtered_item_id);
CREATE INDEX IF NOT EXISTS idx_mason_dependency_analysis_item ON mason_dependency_analysis(item_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_risk_score ON mason_pm_backlog_items(risk_score) WHERE risk_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_features ON mason_pm_backlog_items(is_new_feature, is_banger_idea) WHERE is_new_feature = true OR is_banger_idea = true;
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_tags ON mason_pm_backlog_items USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_source ON mason_pm_backlog_items(source);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_autopilot_run ON mason_pm_backlog_items(autopilot_run_id) WHERE autopilot_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_evidence_status ON mason_pm_backlog_items(evidence_status) WHERE evidence_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_type ON mason_pm_backlog_items(type);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_complexity ON mason_pm_backlog_items(complexity);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_area ON mason_pm_backlog_items(area);
CREATE INDEX IF NOT EXISTS idx_mason_execution_progress_started_at ON mason_execution_progress(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_config_user_repo ON mason_autopilot_config(user_id, repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_config_enabled ON mason_autopilot_config(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_runs_user_id ON mason_autopilot_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_runs_repository_id ON mason_autopilot_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_runs_status ON mason_autopilot_runs(status);
CREATE INDEX IF NOT EXISTS idx_mason_autopilot_runs_started_at ON mason_autopilot_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mason_audit_logs_user_id ON mason_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_audit_logs_event_type ON mason_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_mason_audit_logs_created_at ON mason_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mason_item_events_item_id ON mason_item_events(item_id);
CREATE INDEX IF NOT EXISTS idx_mason_item_events_created_at ON mason_item_events(created_at DESC);

-- Composite index for backlog item filtering (user + status + priority for common dashboard query)
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_status_priority ON mason_pm_backlog_items(user_id, status, priority_score DESC);

-- Enable Row Level Security
ALTER TABLE mason_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_filtered_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_execution_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_restore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_dependency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_autopilot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_autopilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_migrations ENABLE ROW LEVEL SECURITY;

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

-- PM Filtered Items table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_filtered_items' AND policyname = 'Allow all on pm_filtered_items') THEN
    CREATE POLICY "Allow all on pm_filtered_items" ON mason_pm_filtered_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Execution Progress table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_execution_progress' AND policyname = 'Allow all on execution_progress') THEN
    CREATE POLICY "Allow all on execution_progress" ON mason_execution_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- PM Restore Feedback table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_pm_restore_feedback' AND policyname = 'Allow all on pm_restore_feedback') THEN
    CREATE POLICY "Allow all on pm_restore_feedback" ON mason_pm_restore_feedback FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Dependency Analysis table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_dependency_analysis' AND policyname = 'Allow all on dependency_analysis') THEN
    CREATE POLICY "Allow all on dependency_analysis" ON mason_dependency_analysis FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Autopilot Config table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_autopilot_config' AND policyname = 'Allow all on autopilot_config') THEN
    CREATE POLICY "Allow all on autopilot_config" ON mason_autopilot_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Autopilot Runs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_autopilot_runs' AND policyname = 'Allow all on autopilot_runs') THEN
    CREATE POLICY "Allow all on autopilot_runs" ON mason_autopilot_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Audit Logs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_audit_logs' AND policyname = 'Allow all on audit_logs') THEN
    CREATE POLICY "Allow all on audit_logs" ON mason_audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Item Events table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_item_events' AND policyname = 'Allow all on item_events') THEN
    CREATE POLICY "Allow all on item_events" ON mason_item_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Migrations table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_migrations' AND policyname = 'Allow all on migrations') THEN
    CREATE POLICY "Allow all on migrations" ON mason_migrations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable REPLICA IDENTITY FULL for realtime tables (REQUIRED for postgres_changes)
-- Without this, Postgres only tracks primary key changes, not full row data
-- This ensures realtime subscriptions receive complete row data on INSERT/UPDATE
ALTER TABLE mason_execution_progress REPLICA IDENTITY FULL;
ALTER TABLE mason_pm_backlog_items REPLICA IDENTITY FULL;

-- Enable realtime for execution progress table (CRITICAL for ExecutionStatusModal auto-show)
-- This allows the dashboard to receive real-time INSERT events when CLI execution starts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mason_execution_progress;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Table already in publication
END $$;

-- Enable realtime for backlog items table (CRITICAL for dashboard status updates)
-- This allows the dashboard to receive real-time UPDATE events when CLI changes item status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mason_pm_backlog_items;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Table already in publication
END $$;

-- Enable realtime for autopilot runs table (for notification toasts when autopilot completes)
ALTER TABLE mason_autopilot_runs REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mason_autopilot_runs;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Table already in publication
END $$;

--------------------------------------------------------------------------------
-- DLQ METRICS AND HEALTH MONITORING
-- Provides aggregate DLQ metrics for the health endpoint and dashboard
--------------------------------------------------------------------------------

-- Add DLQ tracking columns to autopilot_errors
ALTER TABLE mason_autopilot_errors ADD COLUMN IF NOT EXISTS retried_at TIMESTAMPTZ;
ALTER TABLE mason_autopilot_errors ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Function to get DLQ metrics (count, oldest, growth rate)
CREATE OR REPLACE FUNCTION get_dlq_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_count', (SELECT COUNT(*) FROM mason_autopilot_errors),
    'last_24h_count', (SELECT COUNT(*) FROM mason_autopilot_errors WHERE occurred_at > now() - interval '24 hours'),
    'last_hour_count', (SELECT COUNT(*) FROM mason_autopilot_errors WHERE occurred_at > now() - interval '1 hour'),
    'oldest_entry', (SELECT MIN(occurred_at) FROM mason_autopilot_errors),
    'newest_entry', (SELECT MAX(occurred_at) FROM mason_autopilot_errors),
    'max_consecutive_failures', (SELECT COALESCE(MAX(consecutive_failures), 0) FROM mason_autopilot_errors),
    'error_types', (
      SELECT COALESCE(json_agg(json_build_object('type', error_type, 'count', cnt)), '[]'::json)
      FROM (
        SELECT error_type, COUNT(*) as cnt
        FROM mason_autopilot_errors
        GROUP BY error_type
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dlq_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dlq_metrics() TO anon;

-- Function to bulk retry failed items (mark errors as retried)
CREATE OR REPLACE FUNCTION bulk_retry_dlq(
  error_ids UUID[] DEFAULT NULL,
  max_age_hours INTEGER DEFAULT 24
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  IF error_ids IS NOT NULL THEN
    UPDATE mason_autopilot_errors
    SET retried_at = now(), retry_count = retry_count + 1
    WHERE id = ANY(error_ids) AND retried_at IS NULL;
  ELSE
    UPDATE mason_autopilot_errors
    SET retried_at = now(), retry_count = retry_count + 1
    WHERE retried_at IS NULL
      AND occurred_at > now() - (max_age_hours || ' hours')::interval;
  END IF;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN json_build_object(
    'retried_count', affected_count,
    'retried_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_retry_dlq(UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_retry_dlq(UUID[], INTEGER) TO anon;

-- Add indexes for DLQ queries
CREATE INDEX IF NOT EXISTS idx_autopilot_errors_retried ON mason_autopilot_errors(retried_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_errors_type ON mason_autopilot_errors(error_type);

--------------------------------------------------------------------------------
-- AI PROVIDER KEYS (BYOAK - Bring Your Own API Key)
-- Stored in user's OWN Supabase database. Never touches Mason's servers.
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mason_ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google')),
  api_key TEXT NOT NULL,
  model TEXT,
  label TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Add columns for existing databases BEFORE creating indexes that reference them
ALTER TABLE mason_ai_provider_keys ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE mason_ai_provider_keys ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE mason_ai_provider_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Expand provider CHECK constraint for existing databases (add 'google')
DO $$ BEGIN
  ALTER TABLE mason_ai_provider_keys DROP CONSTRAINT IF EXISTS mason_ai_provider_keys_provider_check;
  ALTER TABLE mason_ai_provider_keys ADD CONSTRAINT mason_ai_provider_keys_provider_check
    CHECK (provider IN ('anthropic', 'openai', 'google'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_mason_ai_provider_keys_user_id ON mason_ai_provider_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mason_ai_provider_keys_active ON mason_ai_provider_keys(is_active) WHERE is_active = true;

ALTER TABLE mason_ai_provider_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_ai_provider_keys' AND policyname = 'Allow all on ai_provider_keys') THEN
    CREATE POLICY "Allow all on ai_provider_keys" ON mason_ai_provider_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add active provider tracking to autopilot_config (daemon writes each cycle)
ALTER TABLE mason_autopilot_config ADD COLUMN IF NOT EXISTS active_provider TEXT;
ALTER TABLE mason_autopilot_config ADD COLUMN IF NOT EXISTS active_model TEXT;
ALTER TABLE mason_autopilot_config ADD COLUMN IF NOT EXISTS provider_source TEXT;
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

/**
 * Verification SQL to check realtime is properly configured.
 * Returns status for each critical realtime requirement.
 */
const VERIFICATION_SQL = `
SELECT
  -- Check REPLICA IDENTITY FULL for execution_progress
  (SELECT
    CASE WHEN relreplident = 'f' THEN true ELSE false END
    FROM pg_class
    WHERE relname = 'mason_execution_progress'
  ) as execution_progress_replica_identity_full,

  -- Check if table is in supabase_realtime publication
  (SELECT
    EXISTS(
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND tablename = 'mason_execution_progress'
    )
  ) as execution_progress_in_publication,

  -- Check RLS policy exists
  (SELECT
    EXISTS(
      SELECT 1 FROM pg_policies
      WHERE tablename = 'mason_execution_progress'
      AND policyname = 'Allow all on execution_progress'
    )
  ) as execution_progress_rls_policy_exists;
`;

interface RealtimeVerification {
  execution_progress_replica_identity_full: boolean;
  execution_progress_in_publication: boolean;
  execution_progress_rls_policy_exists: boolean;
}

/**
 * Run verification query via Management API
 */
async function verifyRealtimeViaManagementApi(
  projectRef: string,
  accessToken: string,
): Promise<{
  success: boolean;
  verification?: RealtimeVerification;
  error?: string;
}> {
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
          query: VERIFICATION_SQL,
          read_only: true,
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
          `Verification failed: ${response.status}`,
      };
    }

    const data = await response.json();
    // The response contains an array of results, we want the first row
    if (data && Array.isArray(data) && data.length > 0) {
      return { success: true, verification: data[0] as RealtimeVerification };
    }

    return { success: true, verification: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication before processing any migration request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
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
          return badRequest(
            'Security validation failed: Project reference does not match your configured Supabase URL. This may indicate a configuration issue.',
          );
        }
      }

      const result = await runMigrationsViaManagementApi(
        projectRef,
        accessToken,
      );

      if (!result.success) {
        return serverError(result.error);
      }

      // Run verification to check realtime is properly configured
      const verification = await verifyRealtimeViaManagementApi(
        projectRef,
        accessToken,
      );

      return apiSuccess({
        realtime: verification.success
          ? {
              verified: true,
              status: verification.verification,
              allChecksPass: verification.verification
                ? verification.verification
                    .execution_progress_replica_identity_full &&
                  verification.verification.execution_progress_in_publication &&
                  verification.verification.execution_progress_rls_policy_exists
                : false,
            }
          : {
              verified: false,
              error: verification.error,
            },
      });
    }

    // Method 2: Direct PostgreSQL connection (fallback)
    if (!connectionString && (!supabaseUrl || !databasePassword)) {
      return badRequest('Missing Supabase URL or Database Password');
    }

    const result = await runMigrations(
      supabaseUrl || '',
      databasePassword || '',
      MIGRATION_SQL,
      connectionString,
    );

    if (!result.success) {
      return serverError(result.error);
    }

    // Note: For direct connection, we can't easily verify realtime without the Management API
    // The verification would require parsing pg connection string and running the verification query
    return apiSuccess({
      realtime: {
        verified: false,
        note: 'Realtime verification requires OAuth authentication. Migrations applied successfully.',
      },
    });
  } catch (error) {
    console.error('Migration error:', error);
    return serverError(
      error instanceof Error ? error.message : 'Migration failed',
    );
  }
}
