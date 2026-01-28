-- Mason PM System: Execution Tasks Table
-- Migration: 003_pm_execution_tasks
-- Description: Creates table for tracking individual tasks within execution runs

-- Table: pm_execution_tasks
-- Tracks individual tasks within an execution run
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_run_id ON pm_execution_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_item_id ON pm_execution_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_status ON pm_execution_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_execution_tasks_wave ON pm_execution_tasks(run_id, wave_number);

-- Row Level Security
ALTER TABLE pm_execution_tasks ENABLE ROW LEVEL SECURITY;

-- Default policy (allow all - customize for production)
CREATE POLICY "Allow all access to pm_execution_tasks" ON pm_execution_tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE pm_execution_tasks IS 'Individual tasks within an execution run';
COMMENT ON COLUMN pm_execution_tasks.wave_number IS 'Wave number for parallel execution (1, 2, 3...)';
COMMENT ON COLUMN pm_execution_tasks.task_number IS 'Task number within wave';
COMMENT ON COLUMN pm_execution_tasks.subagent_type IS 'Type of Claude Code subagent to use';
COMMENT ON COLUMN pm_execution_tasks.result_summary IS 'Brief summary of task result for debugging';

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
  r.status AS run_status
FROM pm_execution_tasks t
JOIN pm_backlog_items i ON t.item_id = i.id
JOIN pm_execution_runs r ON t.run_id = r.id;

COMMENT ON VIEW pm_execution_tasks_detail IS 'Tasks with joined item and run information';
