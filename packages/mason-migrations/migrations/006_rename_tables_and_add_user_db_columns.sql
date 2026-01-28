-- Mason PM System: Table Rename Migration
-- Migration: 006_rename_tables_and_add_user_db_columns
-- Description: Renames existing tables to mason_ prefix and adds user DB columns
--
-- IMPORTANT: This migration is for EXISTING installations that were created
-- before the table prefix change. For NEW installations, run migrations 001-005.
--
-- This migration is SAFE to run multiple times (idempotent).
-- It uses IF EXISTS / IF NOT EXISTS to handle all cases.

--------------------------------------------------------------------------------
-- Rename tables to mason_ prefix (if old names exist)
--------------------------------------------------------------------------------

-- pm_analysis_runs -> mason_pm_analysis_runs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pm_analysis_runs')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_analysis_runs') THEN
    ALTER TABLE pm_analysis_runs RENAME TO mason_pm_analysis_runs;
  END IF;
END $$;

-- pm_backlog_items -> mason_pm_backlog_items
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pm_backlog_items')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_backlog_items') THEN
    ALTER TABLE pm_backlog_items RENAME TO mason_pm_backlog_items;
  END IF;
END $$;

-- pm_execution_runs -> mason_pm_execution_runs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pm_execution_runs')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_execution_runs') THEN
    ALTER TABLE pm_execution_runs RENAME TO mason_pm_execution_runs;
  END IF;
END $$;

-- pm_execution_tasks -> mason_pm_execution_tasks
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pm_execution_tasks')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_execution_tasks') THEN
    ALTER TABLE pm_execution_tasks RENAME TO mason_pm_execution_tasks;
  END IF;
END $$;

-- users -> mason_users
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_users') THEN
    ALTER TABLE users RENAME TO mason_users;
  END IF;
END $$;

-- github_repositories -> mason_github_repositories
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_repositories')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_github_repositories') THEN
    ALTER TABLE github_repositories RENAME TO mason_github_repositories;
  END IF;
END $$;

-- remote_execution_runs -> mason_remote_execution_runs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'remote_execution_runs')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_remote_execution_runs') THEN
    ALTER TABLE remote_execution_runs RENAME TO mason_remote_execution_runs;
  END IF;
END $$;

-- execution_logs -> mason_execution_logs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'execution_logs')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_execution_logs') THEN
    ALTER TABLE execution_logs RENAME TO mason_execution_logs;
  END IF;
END $$;

-- api_keys -> mason_api_keys
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_api_keys') THEN
    ALTER TABLE api_keys RENAME TO mason_api_keys;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Add user Supabase credential columns (for BYOD architecture)
--------------------------------------------------------------------------------

-- Add supabase_url column
ALTER TABLE mason_users
ADD COLUMN IF NOT EXISTS supabase_url TEXT;

-- Add supabase_anon_key column
ALTER TABLE mason_users
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

-- Add supabase_service_role_key column (encrypted at application level)
ALTER TABLE mason_users
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;

--------------------------------------------------------------------------------
-- Update indexes to use new table names
-- (Only needed if old indexes exist - PostgreSQL renames them with the table)
--------------------------------------------------------------------------------

-- Rename indexes for pm_backlog_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_status') THEN
    ALTER INDEX idx_pm_backlog_items_status RENAME TO idx_mason_pm_backlog_items_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_priority') THEN
    ALTER INDEX idx_pm_backlog_items_priority RENAME TO idx_mason_pm_backlog_items_priority;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_area') THEN
    ALTER INDEX idx_pm_backlog_items_area RENAME TO idx_mason_pm_backlog_items_area;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_type') THEN
    ALTER INDEX idx_pm_backlog_items_type RENAME TO idx_mason_pm_backlog_items_type;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_analysis_run') THEN
    ALTER INDEX idx_pm_backlog_items_analysis_run RENAME TO idx_mason_pm_backlog_items_analysis_run;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_user_id') THEN
    ALTER INDEX idx_pm_backlog_items_user_id RENAME TO idx_mason_pm_backlog_items_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_backlog_items_repository_id') THEN
    ALTER INDEX idx_pm_backlog_items_repository_id RENAME TO idx_mason_pm_backlog_items_repository_id;
  END IF;
END $$;

-- Rename indexes for pm_analysis_runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_analysis_runs_status') THEN
    ALTER INDEX idx_pm_analysis_runs_status RENAME TO idx_mason_pm_analysis_runs_status;
  END IF;
END $$;

-- Rename indexes for pm_execution_runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_runs_status') THEN
    ALTER INDEX idx_pm_execution_runs_status RENAME TO idx_mason_pm_execution_runs_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_runs_created_at') THEN
    ALTER INDEX idx_pm_execution_runs_created_at RENAME TO idx_mason_pm_execution_runs_created_at;
  END IF;
END $$;

-- Rename indexes for pm_execution_tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_tasks_run_id') THEN
    ALTER INDEX idx_pm_execution_tasks_run_id RENAME TO idx_mason_pm_execution_tasks_run_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_tasks_item_id') THEN
    ALTER INDEX idx_pm_execution_tasks_item_id RENAME TO idx_mason_pm_execution_tasks_item_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_tasks_status') THEN
    ALTER INDEX idx_pm_execution_tasks_status RENAME TO idx_mason_pm_execution_tasks_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pm_execution_tasks_wave') THEN
    ALTER INDEX idx_pm_execution_tasks_wave RENAME TO idx_mason_pm_execution_tasks_wave;
  END IF;
END $$;

-- Rename indexes for users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_github_id') THEN
    ALTER INDEX idx_users_github_id RENAME TO idx_mason_users_github_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_github_username') THEN
    ALTER INDEX idx_users_github_username RENAME TO idx_mason_users_github_username;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_is_active') THEN
    ALTER INDEX idx_users_is_active RENAME TO idx_mason_users_is_active;
  END IF;
END $$;

-- Rename indexes for github_repositories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_github_repositories_user_id') THEN
    ALTER INDEX idx_github_repositories_user_id RENAME TO idx_mason_github_repositories_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_github_repositories_github_repo_id') THEN
    ALTER INDEX idx_github_repositories_github_repo_id RENAME TO idx_mason_github_repositories_github_repo_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_github_repositories_full_name') THEN
    ALTER INDEX idx_github_repositories_full_name RENAME TO idx_mason_github_repositories_full_name;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_github_repositories_is_active') THEN
    ALTER INDEX idx_github_repositories_is_active RENAME TO idx_mason_github_repositories_is_active;
  END IF;
END $$;

-- Rename indexes for remote_execution_runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_remote_execution_runs_user_id') THEN
    ALTER INDEX idx_remote_execution_runs_user_id RENAME TO idx_mason_remote_execution_runs_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_remote_execution_runs_repository_id') THEN
    ALTER INDEX idx_remote_execution_runs_repository_id RENAME TO idx_mason_remote_execution_runs_repository_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_remote_execution_runs_status') THEN
    ALTER INDEX idx_remote_execution_runs_status RENAME TO idx_mason_remote_execution_runs_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_remote_execution_runs_created_at') THEN
    ALTER INDEX idx_remote_execution_runs_created_at RENAME TO idx_mason_remote_execution_runs_created_at;
  END IF;
END $$;

-- Rename indexes for execution_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_execution_logs_run_id') THEN
    ALTER INDEX idx_execution_logs_run_id RENAME TO idx_mason_execution_logs_run_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_execution_logs_created_at') THEN
    ALTER INDEX idx_execution_logs_created_at RENAME TO idx_mason_execution_logs_created_at;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_execution_logs_level') THEN
    ALTER INDEX idx_execution_logs_level RENAME TO idx_mason_execution_logs_level;
  END IF;
END $$;

-- Rename indexes for api_keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_key_hash') THEN
    ALTER INDEX idx_api_keys_key_hash RENAME TO idx_mason_api_keys_key_hash;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_user_id') THEN
    ALTER INDEX idx_api_keys_user_id RENAME TO idx_mason_api_keys_user_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_api_keys_prefix') THEN
    ALTER INDEX idx_api_keys_prefix RENAME TO idx_mason_api_keys_prefix;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Rename triggers and functions
--------------------------------------------------------------------------------

-- Rename trigger function for pm_backlog_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pm_backlog_items_updated_at') THEN
    ALTER FUNCTION update_pm_backlog_items_updated_at() RENAME TO update_mason_pm_backlog_items_updated_at;
  END IF;
END $$;

-- Rename trigger for pm_backlog_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_pm_backlog_items_updated_at') THEN
    ALTER TRIGGER trigger_pm_backlog_items_updated_at ON mason_pm_backlog_items
      RENAME TO trigger_mason_pm_backlog_items_updated_at;
  END IF;
END $$;

-- Rename trigger function for users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_users_updated_at') THEN
    ALTER FUNCTION update_users_updated_at() RENAME TO update_mason_users_updated_at;
  END IF;
END $$;

-- Rename trigger for users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_users_updated_at') THEN
    ALTER TRIGGER trigger_users_updated_at ON mason_users
      RENAME TO trigger_mason_users_updated_at;
  END IF;
END $$;

-- Rename trigger function for github_repositories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_github_repositories_updated_at') THEN
    ALTER FUNCTION update_github_repositories_updated_at() RENAME TO update_mason_github_repositories_updated_at;
  END IF;
END $$;

-- Rename trigger for github_repositories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_github_repositories_updated_at') THEN
    ALTER TRIGGER trigger_github_repositories_updated_at ON mason_github_repositories
      RENAME TO trigger_mason_github_repositories_updated_at;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Update or create the view with new table names
--------------------------------------------------------------------------------

-- Drop old view if it exists
DROP VIEW IF EXISTS pm_execution_tasks_detail;

-- Create view with new names (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_execution_tasks')
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_backlog_items')
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mason_pm_execution_runs') THEN

    CREATE OR REPLACE VIEW mason_pm_execution_tasks_detail AS
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
    FROM mason_pm_execution_tasks t
    JOIN mason_pm_backlog_items i ON t.item_id = i.id
    JOIN mason_pm_execution_runs r ON t.run_id = r.id;
  END IF;
END $$;

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON COLUMN mason_users.supabase_url IS 'User''s own Supabase project URL for BYOD architecture';
COMMENT ON COLUMN mason_users.supabase_anon_key IS 'User''s own Supabase anon key for BYOD architecture';
COMMENT ON COLUMN mason_users.supabase_service_role_key IS 'User''s own Supabase service role key (encrypted at application level)';
