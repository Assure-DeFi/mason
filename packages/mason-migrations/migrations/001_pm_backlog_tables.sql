-- Mason PM System: Backlog Tables
-- Migration: 001_pm_backlog_tables
-- Description: Creates the core PM backlog tables for storing improvement items and analysis runs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: mason_pm_analysis_runs
-- Tracks each analysis run (when /pm-review is executed)
CREATE TABLE IF NOT EXISTS mason_pm_analysis_runs (
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

-- Table: mason_pm_backlog_items
-- Stores individual improvement items identified during analysis
CREATE TABLE IF NOT EXISTS mason_pm_backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core fields
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,

  -- Classification
  area TEXT NOT NULL,  -- 'frontend-ux', 'api-backend', 'reliability', 'security', 'code-quality'
  type TEXT NOT NULL,  -- 'feature', 'fix', 'refactor', 'optimization'
  complexity TEXT NOT NULL,  -- 'low', 'medium', 'high', 'very_high'

  -- Scoring (1-10 scale)
  impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  effort_score INTEGER NOT NULL CHECK (effort_score >= 1 AND effort_score <= 10),

  -- Priority: calculated as (impact * 2) - effort
  -- Range: -8 (impact=1, effort=10) to 19 (impact=10, effort=1)
  priority_score INTEGER GENERATED ALWAYS AS ((impact_score * 2) - effort_score) STORED,

  -- Benefits (stored as JSON array)
  benefits_json JSONB DEFAULT '[]'::jsonb,

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'new',  -- 'new', 'approved', 'in_progress', 'completed', 'rejected'

  -- Git integration
  branch_name TEXT,
  pr_url TEXT,

  -- PRD content (generated on demand)
  prd_content TEXT,
  prd_generated_at TIMESTAMPTZ,

  -- Link to analysis run
  analysis_run_id UUID REFERENCES mason_pm_analysis_runs(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_area CHECK (area IN ('frontend-ux', 'api-backend', 'reliability', 'security', 'code-quality')),
  CONSTRAINT valid_type CHECK (type IN ('feature', 'fix', 'refactor', 'optimization')),
  CONSTRAINT valid_complexity CHECK (complexity IN ('low', 'medium', 'high', 'very_high')),
  CONSTRAINT valid_status CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'rejected'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_status ON mason_pm_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_priority ON mason_pm_backlog_items(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_area ON mason_pm_backlog_items(area);
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_analysis_run ON mason_pm_backlog_items(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_mason_pm_analysis_runs_status ON mason_pm_analysis_runs(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mason_pm_backlog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mason_pm_backlog_items_updated_at ON mason_pm_backlog_items;
CREATE TRIGGER trigger_mason_pm_backlog_items_updated_at
  BEFORE UPDATE ON mason_pm_backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_mason_pm_backlog_items_updated_at();

-- Row Level Security (RLS) - Enable but allow all for now
-- Users should customize these policies based on their auth setup
ALTER TABLE mason_pm_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_pm_backlog_items ENABLE ROW LEVEL SECURITY;

-- Default policies (allow all - customize for production)
CREATE POLICY "Allow all access to mason_pm_analysis_runs" ON mason_pm_analysis_runs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to mason_pm_backlog_items" ON mason_pm_backlog_items
  FOR ALL USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE mason_pm_analysis_runs IS 'Tracks each PM review analysis run';
COMMENT ON TABLE mason_pm_backlog_items IS 'Improvement items identified during PM analysis';
COMMENT ON COLUMN mason_pm_backlog_items.priority_score IS 'Auto-calculated: (impact_score * 2) - effort_score';
COMMENT ON COLUMN mason_pm_backlog_items.benefits_json IS 'JSON array of benefit strings';
