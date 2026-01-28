-- Migration: 008_validation_layer.sql
-- Description: Add validation layer support for PM review system
-- This migration adds filtered items tracking and validation metadata

-- Create table for filtered (false positive) items
CREATE TABLE IF NOT EXISTS mason_pm_filtered_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Original suggestion fields (mirrors backlog_items)
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL,
  impact_score INTEGER NOT NULL,
  effort_score INTEGER NOT NULL,
  complexity INTEGER DEFAULT 2,
  benefits JSONB DEFAULT '[]',

  -- Validation result
  filter_reason TEXT NOT NULL,
  filter_tier TEXT NOT NULL CHECK (filter_tier IN ('tier1', 'tier2', 'tier3')),
  filter_confidence DECIMAL(3,2) NOT NULL CHECK (filter_confidence >= 0 AND filter_confidence <= 1),
  evidence TEXT,

  -- Context
  analysis_run_id UUID REFERENCES mason_pm_analysis_runs(id) ON DELETE CASCADE,

  -- User override capability
  override_status TEXT DEFAULT 'filtered' CHECK (override_status IN ('filtered', 'restored'))
);

-- Add validation tracking columns to analysis_runs
-- Note: Using separate statements for compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_analysis_runs' AND column_name = 'items_validated'
  ) THEN
    ALTER TABLE mason_pm_analysis_runs ADD COLUMN items_validated INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_analysis_runs' AND column_name = 'items_filtered'
  ) THEN
    ALTER TABLE mason_pm_analysis_runs ADD COLUMN items_filtered INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_filtered_items_analysis_run
  ON mason_pm_filtered_items(analysis_run_id);

CREATE INDEX IF NOT EXISTS idx_filtered_items_override_status
  ON mason_pm_filtered_items(override_status);

CREATE INDEX IF NOT EXISTS idx_filtered_items_filter_tier
  ON mason_pm_filtered_items(filter_tier);

-- Enable RLS
ALTER TABLE mason_pm_filtered_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations (privacy via separate databases per user)
-- This mirrors the pattern used in other mason tables
CREATE POLICY "Allow all operations on filtered items" ON mason_pm_filtered_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE mason_pm_filtered_items IS 'Stores PM suggestions that were filtered out as false positives during validation';
COMMENT ON COLUMN mason_pm_filtered_items.filter_tier IS 'Validation tier that caught this: tier1 (pattern), tier2 (contextual), tier3 (impact)';
COMMENT ON COLUMN mason_pm_filtered_items.filter_confidence IS 'Confidence score from 0.0 to 1.0 that this is a false positive';
COMMENT ON COLUMN mason_pm_filtered_items.override_status IS 'Allows users to restore filtered items to backlog if they disagree';
