-- Migration 016: Add error_message column to mason_pm_backlog_items
-- Previously, error messages from failed executions were stored by overwriting
-- the solution field with '[EXECUTION FAILED: ...]' prefix, destroying original text.
-- This migration adds a dedicated column to preserve both solution and error message.

ALTER TABLE mason_pm_backlog_items
ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN mason_pm_backlog_items.error_message IS 'Error message from failed execution attempts. Stored separately to preserve original solution text.';
