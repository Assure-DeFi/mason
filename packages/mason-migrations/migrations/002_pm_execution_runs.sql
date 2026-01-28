-- Mason PM System: Execution Runs Table
-- Migration: 002_pm_execution_runs
-- Description: Creates table for tracking execution runs (when /execute-approved is run)

-- Table: pm_execution_runs
-- Tracks each execution run (when approved items are being implemented)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pm_execution_runs_status ON pm_execution_runs(status);
CREATE INDEX IF NOT EXISTS idx_pm_execution_runs_created_at ON pm_execution_runs(created_at DESC);

-- Row Level Security
ALTER TABLE pm_execution_runs ENABLE ROW LEVEL SECURITY;

-- Default policy (allow all - customize for production)
CREATE POLICY "Allow all access to pm_execution_runs" ON pm_execution_runs
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE pm_execution_runs IS 'Tracks execution runs when approved items are implemented';
COMMENT ON COLUMN pm_execution_runs.item_count IS 'Number of backlog items included in this run';
COMMENT ON COLUMN pm_execution_runs.tasks_completed IS 'Count of successfully completed tasks';
COMMENT ON COLUMN pm_execution_runs.tasks_failed IS 'Count of failed tasks';
