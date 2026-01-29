-- Mason PM System: Add repository_id to PM tables
-- Migration: 011_add_repository_id_to_pm_tables
-- Description: Adds repository_id to analysis runs and filtered items for multi-repo support

--------------------------------------------------------------------------------
-- Add repository_id to mason_pm_analysis_runs
-- Enables tracking which repository an analysis was run against
--------------------------------------------------------------------------------
ALTER TABLE mason_pm_analysis_runs
ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL;

-- Index for efficient filtering by repository
CREATE INDEX IF NOT EXISTS idx_mason_pm_analysis_runs_repository_id
ON mason_pm_analysis_runs(repository_id);

--------------------------------------------------------------------------------
-- Add repository_id to mason_pm_filtered_items
-- Enables filtering false positives by repository
--------------------------------------------------------------------------------
ALTER TABLE mason_pm_filtered_items
ADD COLUMN IF NOT EXISTS repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL;

-- Index for efficient filtering by repository
CREATE INDEX IF NOT EXISTS idx_mason_pm_filtered_items_repository_id
ON mason_pm_filtered_items(repository_id);

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------
COMMENT ON COLUMN mason_pm_analysis_runs.repository_id IS 'Target repository for this analysis run (enables multi-repo support)';
COMMENT ON COLUMN mason_pm_filtered_items.repository_id IS 'Repository this filtered item belongs to (enables multi-repo filtering)';
