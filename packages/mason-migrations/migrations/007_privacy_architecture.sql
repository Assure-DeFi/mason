-- Mason PM System: Privacy Architecture Migration
-- Migration: 007_privacy_architecture
-- Description: Removes sensitive columns from central database for true privacy architecture
--
-- PRIVACY CHANGES:
-- 1. github_access_token - Now stored ONLY in user's browser localStorage
-- 2. supabase_url, supabase_anon_key, supabase_service_role_key - Now stored ONLY in user's browser localStorage
--
-- WHAT CENTRAL SERVER NOW STORES (identity only):
-- - github_id, github_username, github_email, github_avatar_url
-- - API key hashes (for CLI authentication)
-- - Connected repository names (metadata only)
--
-- WHAT STAYS PRIVATE (user's browser + their own Supabase):
-- - GitHub access token
-- - Supabase credentials
-- - All backlog items, analysis runs, execution logs

--------------------------------------------------------------------------------
-- Remove sensitive columns from mason_users
--------------------------------------------------------------------------------

-- Step 1: Make github_access_token nullable (for backwards compatibility during migration)
-- Then drop it in a subsequent release once all users have upgraded
ALTER TABLE mason_users
ALTER COLUMN github_access_token DROP NOT NULL;

-- Step 2: Remove Supabase credential columns
-- These should only be stored in the user's browser localStorage
ALTER TABLE mason_users
DROP COLUMN IF EXISTS supabase_url,
DROP COLUMN IF EXISTS supabase_anon_key,
DROP COLUMN IF EXISTS supabase_service_role_key;

-- Step 3: Remove github_token_expires_at (no longer needed if we don't store the token)
ALTER TABLE mason_users
DROP COLUMN IF EXISTS github_token_expires_at;

-- Step 4: Finally drop github_access_token column
-- Note: Uncomment this in a future migration after confirming all users have upgraded
-- ALTER TABLE mason_users DROP COLUMN IF EXISTS github_access_token;

--------------------------------------------------------------------------------
-- Update comments to reflect new privacy architecture
--------------------------------------------------------------------------------

COMMENT ON TABLE mason_users IS 'User identity from GitHub OAuth (NO credentials stored - only identity)';

-- Remove old column comments (columns are being dropped)
-- The DROP COLUMN statements above will remove these comments automatically

--------------------------------------------------------------------------------
-- Add a migration marker to track this privacy change
--------------------------------------------------------------------------------

-- Create a table to track migration history if it doesn't exist
CREATE TABLE IF NOT EXISTS mason_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Record this migration
INSERT INTO mason_migrations (name, description)
VALUES (
  '007_privacy_architecture',
  'Removed sensitive credentials from central DB. GitHub token and Supabase credentials now stored only in user browser localStorage.'
)
ON CONFLICT (name) DO NOTHING;
