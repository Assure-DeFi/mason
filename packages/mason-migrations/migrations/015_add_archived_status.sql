-- Migration 015: Add 'archived' to mason_pm_backlog_items status constraint
--
-- The autopilot daemon's archiveStaleAutopilotItems() writes status='archived'
-- but the database CHECK constraint only allows 6 statuses. This causes silent
-- PostgreSQL constraint violations. Stale items never get archived, creating a
-- snowball effect where old items are repeatedly executed cycle after cycle.
--
-- This migration:
-- 1. Drops the existing valid_status constraint
-- 2. Re-adds it with 'archived' included
-- 3. Is idempotent (safe to run multiple times)

-- Drop and recreate the CHECK constraint to include 'archived'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_status'
    AND conrelid = 'mason_pm_backlog_items'::regclass
  ) THEN
    ALTER TABLE mason_pm_backlog_items DROP CONSTRAINT valid_status;
  END IF;

  -- Add updated constraint with 'archived'
  ALTER TABLE mason_pm_backlog_items
    ADD CONSTRAINT valid_status
    CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected', 'archived'));
END $$;
