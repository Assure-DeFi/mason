-- Migration 013: Consolidate dual-schema conflict and column drift in mason_pm_backlog_items
--
-- Problem: Two conflicting CREATE TABLE definitions exist:
--   1. 001_pm_backlog_tables.sql - Original migration (complexity TEXT, 5 areas, 4 types)
--   2. 001_mason_schema.sql / management-api.ts - Dashboard schema (complexity INTEGER, 2 areas, legacy types)
--
-- Additionally, 10 columns used in TypeScript (BacklogItem type) have no SQL definition.
--
-- Resolution strategy:
--   - Keep column types as they exist in the live database (don't change complexity type)
--   - Widen all CHECK constraints to accept BOTH old and new values (additive, not breaking)
--   - Add all missing columns that TypeScript references
--   - Rename benefits_json -> benefits alias via computed column (if benefits_json exists)
--
-- This migration is idempotent (safe to re-run).

-- ============================================================================
-- 1. Widen CHECK constraints to accept all values from both schemas
-- ============================================================================

-- 1a. Area: Accept both original 5 domains AND simplified 2-area model
-- Old: ('frontend-ux', 'api-backend', 'reliability', 'security', 'code-quality')
-- New: ('frontend', 'backend')
-- Combined: all of the above
ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS valid_area;
ALTER TABLE mason_pm_backlog_items ADD CONSTRAINT valid_area
  CHECK (area IN ('frontend', 'backend', 'frontend-ux', 'api-backend', 'reliability', 'security', 'code-quality'));

-- 1b. Type: Accept original PM types AND legacy dashboard types AND new category types
-- Old PM: ('feature', 'fix', 'refactor', 'optimization')
-- Old Dashboard: ('dashboard', 'discovery', 'auth', 'backend')
-- New Categories: ('ui', 'ux', 'api', 'data', 'security', 'performance', 'code-quality')
ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS valid_type;
ALTER TABLE mason_pm_backlog_items ADD CONSTRAINT valid_type
  CHECK (type IN (
    -- New category system
    'feature', 'ui', 'ux', 'api', 'data', 'security', 'performance', 'code-quality',
    -- Legacy PM types
    'fix', 'refactor', 'optimization',
    -- Legacy dashboard types
    'dashboard', 'discovery', 'auth', 'backend'
  ));

-- 1c. Status: Accept all statuses including 'deferred' and 'failed'
ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE mason_pm_backlog_items ADD CONSTRAINT valid_status
  CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected', 'failed'));

-- 1d. Complexity: Remove TEXT-only constraint if present (support both TEXT and INTEGER)
-- If complexity is TEXT type, the CHECK for enum values may exist
ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT IF EXISTS valid_complexity;
-- Don't re-add a CHECK - the column accepts TEXT ('low','medium','high','very_high')
-- OR INTEGER (1-5) depending on which migration created the table.
-- TypeScript getComplexityValue() handles both formats.

-- ============================================================================
-- 2. Add missing columns referenced in TypeScript BacklogItem type
--    All nullable for backwards compatibility with existing rows.
-- ============================================================================

-- Risk analysis summary fields
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS risk_analyzed_at TIMESTAMPTZ;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS files_affected_count INTEGER;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS has_breaking_changes BOOLEAN;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS test_coverage_gaps INTEGER;

-- Feature classification
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS is_new_feature BOOLEAN DEFAULT false;
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS is_banger_idea BOOLEAN DEFAULT false;

-- Tags for categorization
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Source tracking for autopilot
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'autopilot'));
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS autopilot_run_id UUID;

-- Failure tracking (for 'failed' status - see Item 8)
ALTER TABLE mason_pm_backlog_items ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- ============================================================================
-- 3. Ensure user_id and repository_id exist (may already exist from migration 002)
-- ============================================================================
ALTER TABLE mason_pm_backlog_items
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES mason_users(id) ON DELETE SET NULL;

ALTER TABLE mason_pm_backlog_items
  ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. Handle benefits_json vs benefits column name mismatch
--    001_pm_backlog_tables uses 'benefits_json', 001_mason_schema uses 'benefits'
--    If benefits_json exists but benefits doesn't, rename it.
--    If both exist, keep benefits (the newer convention).
-- ============================================================================
DO $$
BEGIN
  -- If benefits_json exists but benefits does NOT exist, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_backlog_items' AND column_name = 'benefits_json'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_backlog_items' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE mason_pm_backlog_items RENAME COLUMN benefits_json TO benefits;
  END IF;

  -- If benefits doesn't exist at all (shouldn't happen, but be safe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_backlog_items' AND column_name = 'benefits'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mason_pm_backlog_items' AND column_name = 'benefits_json'
  ) THEN
    ALTER TABLE mason_pm_backlog_items ADD COLUMN benefits JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- 5. Indexes for new columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_backlog_items_source ON mason_pm_backlog_items(source);
CREATE INDEX IF NOT EXISTS idx_backlog_items_is_new_feature ON mason_pm_backlog_items(is_new_feature) WHERE is_new_feature = true;
CREATE INDEX IF NOT EXISTS idx_backlog_items_is_banger_idea ON mason_pm_backlog_items(is_banger_idea) WHERE is_banger_idea = true;
CREATE INDEX IF NOT EXISTS idx_backlog_items_risk_score ON mason_pm_backlog_items(risk_score) WHERE risk_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backlog_items_autopilot_run ON mason_pm_backlog_items(autopilot_run_id) WHERE autopilot_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backlog_items_tags ON mason_pm_backlog_items USING gin(tags);

-- ============================================================================
-- 6. Update analysis_runs table to include validation tracking columns
--    (referenced in TypeScript AnalysisRun type but may not exist)
-- ============================================================================
ALTER TABLE mason_pm_analysis_runs ADD COLUMN IF NOT EXISTS items_validated INTEGER DEFAULT 0;
ALTER TABLE mason_pm_analysis_runs ADD COLUMN IF NOT EXISTS items_filtered INTEGER DEFAULT 0;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN mason_pm_backlog_items.risk_score IS 'Computed risk score from dependency analysis (1-10)';
COMMENT ON COLUMN mason_pm_backlog_items.is_new_feature IS 'True if item represents net-new functionality';
COMMENT ON COLUMN mason_pm_backlog_items.is_banger_idea IS 'True if item is a high-impact "banger" idea';
COMMENT ON COLUMN mason_pm_backlog_items.source IS 'Whether item was created manually or by autopilot';
COMMENT ON COLUMN mason_pm_backlog_items.autopilot_run_id IS 'Reference to autopilot run that created this item';
COMMENT ON COLUMN mason_pm_backlog_items.failure_reason IS 'Error message when execution fails (status=failed)';
COMMENT ON COLUMN mason_pm_backlog_items.tags IS 'Array of categorization tags';
