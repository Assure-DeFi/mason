-- Migration 012: Add missing table definitions
-- These 8 tables are referenced in application code but had no CREATE TABLE migrations.
-- Uses IF NOT EXISTS for idempotency (safe for existing deployments).

-- ============================================================================
-- 1. mason_execution_progress - Tracks real-time execution status for dashboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_execution_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  run_id UUID REFERENCES mason_pm_execution_runs(id) ON DELETE SET NULL,
  current_phase TEXT CHECK (current_phase IN ('site_review', 'foundation', 'building', 'inspection', 'complete', 'failed')),
  current_wave INTEGER DEFAULT 0,
  total_waves INTEGER DEFAULT 4,
  wave_status TEXT DEFAULT 'pending' CHECK (wave_status IN ('pending', 'in_progress', 'completed')),
  current_task TEXT,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  checkpoint_index INTEGER DEFAULT 0,
  checkpoint_total INTEGER DEFAULT 12,
  checkpoint_message TEXT,
  checkpoints_completed JSONB DEFAULT '[]'::jsonb,
  current_file TEXT,
  files_touched TEXT[] DEFAULT '{}',
  lines_changed INTEGER DEFAULT 0,
  validation_typescript TEXT DEFAULT 'pending' CHECK (validation_typescript IN ('pending', 'running', 'pass', 'fail')),
  validation_eslint TEXT DEFAULT 'pending' CHECK (validation_eslint IN ('pending', 'running', 'pass', 'fail')),
  validation_build TEXT DEFAULT 'pending' CHECK (validation_build IN ('pending', 'running', 'pass', 'fail')),
  validation_tests TEXT DEFAULT 'pending' CHECK (validation_tests IN ('pending', 'running', 'pass', 'fail')),
  validation_smoke_test TEXT DEFAULT 'skipped' CHECK (validation_smoke_test IN ('pending', 'running', 'pass', 'fail', 'skipped')),
  inspector_findings TEXT[] DEFAULT '{}',
  fix_iteration INTEGER DEFAULT 0,
  max_iterations INTEGER DEFAULT 5,
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. mason_item_events - Timeline/audit trail for backlog item status changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('status_changed', 'prd_generated', 'branch_created', 'pr_created', 'note_added')),
  old_value TEXT,
  new_value TEXT,
  user_id UUID REFERENCES mason_users(id) ON DELETE SET NULL,
  notes TEXT
);

-- ============================================================================
-- 3. mason_audit_logs - Security and compliance audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES mason_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- ============================================================================
-- 4. mason_autopilot_config - Per-repo autopilot daemon configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_autopilot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES mason_github_repositories(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  schedule_cron TEXT,
  auto_approval_rules JSONB DEFAULT '{"maxComplexity": 3, "minImpact": 5, "excludedCategories": []}'::jsonb,
  guardian_rails JSONB DEFAULT '{"maxItemsPerDay": 10, "pauseOnFailure": true}'::jsonb,
  execution_window JSONB DEFAULT '{"startHour": 9, "endHour": 17}'::jsonb,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, repository_id)
);

-- ============================================================================
-- 5. mason_autopilot_runs - Tracks each autopilot analysis/execution cycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES mason_github_repositories(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('analysis', 'execution')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  items_analyzed INTEGER,
  items_auto_approved INTEGER,
  items_executed INTEGER,
  prs_created INTEGER,
  error_message TEXT,
  error_details TEXT,
  skip_reason TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
);

-- ============================================================================
-- 6. mason_autopilot_errors - Daemon-level error tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_autopilot_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  consecutive_failures INTEGER DEFAULT 1,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. mason_pm_restore_feedback - Tracks items restored from filtered state
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_pm_restore_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  filtered_item_id UUID NOT NULL REFERENCES mason_pm_filtered_items(id) ON DELETE CASCADE,
  filter_tier TEXT CHECK (filter_tier IN ('tier1', 'tier2', 'tier3')),
  filter_reason TEXT,
  restored_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. mason_dependency_analysis - Stores dependency/risk analysis results
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_dependency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  item_id UUID NOT NULL REFERENCES mason_pm_backlog_items(id) ON DELETE CASCADE,
  analysis_data JSONB DEFAULT '{}'::jsonb,
  risk_score INTEGER,
  dependencies JSONB DEFAULT '[]'::jsonb
);

-- ============================================================================
-- Indexes for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_execution_progress_item_id ON mason_execution_progress(item_id);
CREATE INDEX IF NOT EXISTS idx_execution_progress_run_id ON mason_execution_progress(run_id);
CREATE INDEX IF NOT EXISTS idx_item_events_item_id ON mason_item_events(item_id);
CREATE INDEX IF NOT EXISTS idx_item_events_created_at ON mason_item_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON mason_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON mason_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON mason_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_config_user_repo ON mason_autopilot_config(user_id, repository_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_runs_user_id ON mason_autopilot_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_runs_repository_id ON mason_autopilot_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_runs_status ON mason_autopilot_runs(status);
CREATE INDEX IF NOT EXISTS idx_autopilot_errors_occurred_at ON mason_autopilot_errors(occurred_at);
CREATE INDEX IF NOT EXISTS idx_pm_restore_feedback_item ON mason_pm_restore_feedback(filtered_item_id);
CREATE INDEX IF NOT EXISTS idx_dependency_analysis_item ON mason_dependency_analysis(item_id);

-- ============================================================================
-- RLS Policies (enable row-level security on user-scoped tables)
-- ============================================================================
ALTER TABLE mason_execution_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_autopilot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_autopilot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_autopilot_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_restore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_dependency_analysis ENABLE ROW LEVEL SECURITY;
