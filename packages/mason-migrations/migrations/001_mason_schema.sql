-- Mason PM System: Complete Schema
-- Migration: 001_mason_schema
-- Description: Creates all Mason PM tables in a single migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- Table: pm_analysis_runs
-- Tracks each analysis run (when /pm-review is executed)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_analysis_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Run metadata
  mode TEXT NOT NULL DEFAULT 'full',  -- 'full', 'area:<name>', 'quick'
  items_found INTEGER NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress',  -- 'in_progress', 'completed', 'failed'
  error_message TEXT
);

--------------------------------------------------------------------------------
-- Table: pm_backlog_items
-- Stores individual improvement items identified during analysis
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core fields
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,

  -- Classification
  area TEXT NOT NULL,           -- 'frontend', 'backend'
  type TEXT NOT NULL,           -- 'dashboard', 'discovery', 'auth', 'backend'
  complexity INTEGER NOT NULL CHECK (complexity >= 1 AND complexity <= 5),  -- 1-5 scale

  -- Scoring (1-10 scale)
  impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  effort_score INTEGER NOT NULL CHECK (effort_score >= 1 AND effort_score <= 10),

  -- Priority: calculated as (impact * 2) - effort
  -- Range: -8 (impact=1, effort=10) to 19 (impact=10, effort=1)
  priority_score INTEGER GENERATED ALWAYS AS ((impact_score * 2) - effort_score) STORED,

  -- Benefits (stored as JSON array with structured benefit objects)
  -- Format: [{"category": "user_experience", "icon": "...", "title": "...", "description": "..."}]
  benefits JSONB DEFAULT '[]'::jsonb,

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'new',  -- 'new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected'

  -- Git integration
  branch_name TEXT,
  pr_url TEXT,

  -- PRD content (generated on demand)
  prd_content TEXT,
  prd_generated_at TIMESTAMPTZ,

  -- Link to analysis run
  analysis_run_id UUID REFERENCES pm_analysis_runs(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_area CHECK (area IN ('frontend', 'backend')),
  CONSTRAINT valid_type CHECK (type IN ('dashboard', 'discovery', 'auth', 'backend')),
  CONSTRAINT valid_status CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected'))
);

--------------------------------------------------------------------------------
-- Table: pm_execution_runs
-- Tracks each execution run (when /execute-approved is run)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_execution_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Run metadata
  item_count INTEGER NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'success', 'failed', 'cancelled'

  -- Error tracking
  error_message TEXT,

  -- Statistics (populated on completion)
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_execution_status CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled'))
);

--------------------------------------------------------------------------------
-- Table: pm_execution_tasks
-- Tracks individual tasks within an execution run
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pm_execution_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Parent references
  run_id UUID NOT NULL REFERENCES pm_execution_runs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES pm_backlog_items(id) ON DELETE CASCADE,

  -- Task identification
  wave_number INTEGER NOT NULL,  -- 1, 2, 3, etc.
  task_number INTEGER NOT NULL,  -- Task within wave (1.1, 1.2, etc.)

  -- Task details
  description TEXT NOT NULL,
  subagent_type TEXT NOT NULL,  -- 'Explore', 'general-purpose', 'Bash', 'code-reviewer', 'frontend-design'

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed', 'skipped'

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  -- Output/result (optional, for debugging)
  result_summary TEXT,

  -- Constraints
  CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  CONSTRAINT valid_subagent_type CHECK (subagent_type IN ('Explore', 'general-purpose', 'Bash', 'code-reviewer', 'frontend-design', 'Plan'))
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- pm_backlog_items indexes
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_status ON pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_priority ON pm_backlog_items(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_area ON pm_backlog_items(area);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_type ON pm_backlog_items(type);
CREATE INDEX IF NOT EXISTS idx_pm_backlog_items_analysis_run ON pm_backlog_items(analysis_run_id);

-- pm_analysis_runs indexes
CREATE INDEX IF NOT EXISTS idx_pm_analysis_runs_status ON pm_analysis_runs(status);

-- pm_execution_runs indexes
CREATE INDEX IF NOT EXISTS idx_pm_execution_runs_status ON pm_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_pm_execution_runs_created_at ON pm_execution_runs(created_at DESC);

-- pm_execution_tasks indexes
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_run_id ON pm_execution_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_item_id ON pm_execution_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_status ON pm_execution_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_wave ON pm_execution_tasks(run_id, wave_number);

--------------------------------------------------------------------------------
-- Triggers
--------------------------------------------------------------------------------

-- Trigger to update updated_at timestamp on pm_backlog_items
CREATE OR REPLACE FUNCTION update_pm_backlog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pm_backlog_items_updated_at ON pm_backlog_items;
CREATE TRIGGER trigger_pm_backlog_items_updated_at
  BEFORE UPDATE ON pm_backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_backlog_items_updated_at();

--------------------------------------------------------------------------------
-- Row Level Security (RLS)
--------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_execution_tasks ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- WARNING: DEVELOPMENT-ONLY POLICIES
-- These permissive policies are for local development and testing only.
-- For production deployments, replace with restrictive policies like:
--   USING (auth.uid() = user_id)
-- See: https://supabase.com/docs/guides/auth/row-level-security
--------------------------------------------------------------------------------
CREATE POLICY "Allow all access to pm_analysis_runs" ON pm_analysis_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to pm_backlog_items" ON pm_backlog_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to pm_execution_runs" ON pm_execution_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to pm_execution_tasks" ON pm_execution_tasks
  FOR ALL USING (true) WITH CHECK (true);

--------------------------------------------------------------------------------
-- Views
--------------------------------------------------------------------------------

-- Helpful view: Tasks with item and run details
CREATE OR REPLACE VIEW pm_execution_tasks_detail AS
SELECT
  t.id,
  t.run_id,
  t.item_id,
  t.wave_number,
  t.task_number,
  t.description,
  t.subagent_type,
  t.status,
  t.started_at,
  t.completed_at,
  t.error_message,
  i.title AS item_title,
  i.area AS item_area,
  i.type AS item_type,
  r.status AS run_status
FROM pm_execution_tasks t
JOIN pm_backlog_items i ON t.item_id = i.id
JOIN pm_execution_runs r ON t.run_id = r.id;

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON TABLE pm_analysis_runs IS 'Tracks each PM review analysis run';
COMMENT ON TABLE pm_backlog_items IS 'Improvement items identified during PM analysis';
COMMENT ON TABLE pm_execution_runs IS 'Tracks execution runs when approved items are implemented';
COMMENT ON TABLE pm_execution_tasks IS 'Individual tasks within an execution run';

COMMENT ON COLUMN pm_backlog_items.priority_score IS 'Auto-calculated: (impact_score * 2) - effort_score';
COMMENT ON COLUMN pm_backlog_items.benefits IS 'JSON array of benefit objects with category, icon, title, description';
COMMENT ON COLUMN pm_backlog_items.complexity IS 'Complexity rating 1-5 (1=trivial, 5=very complex)';
COMMENT ON COLUMN pm_backlog_items.type IS 'Type category: dashboard, discovery, auth, backend';
COMMENT ON COLUMN pm_backlog_items.area IS 'Area: frontend or backend';

COMMENT ON COLUMN pm_execution_runs.item_count IS 'Number of backlog items included in this run';
COMMENT ON COLUMN pm_execution_runs.tasks_completed IS 'Count of successfully completed tasks';
COMMENT ON COLUMN pm_execution_runs.tasks_failed IS 'Count of failed tasks';

COMMENT ON COLUMN pm_execution_tasks.wave_number IS 'Wave number for parallel execution (1, 2, 3...)';
COMMENT ON COLUMN pm_execution_tasks.task_number IS 'Task number within wave';
COMMENT ON COLUMN pm_execution_tasks.subagent_type IS 'Type of Claude Code subagent to use';
COMMENT ON COLUMN pm_execution_tasks.result_summary IS 'Brief summary of task result for debugging';

COMMENT ON VIEW pm_execution_tasks_detail IS 'Tasks with joined item and run information';
