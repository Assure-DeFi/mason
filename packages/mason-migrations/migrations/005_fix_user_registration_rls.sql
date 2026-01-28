-- Mason PM System: Fix User Registration RLS
-- Migration: 005_fix_user_registration_rls
-- Description: Adds INSERT policy for user self-registration during setup
--
-- Problem: The production RLS policies (004) only allow service_role to INSERT users.
-- The dashboard uses the anon key from user's own Supabase database, which cannot insert.
--
-- Solution: Add an INSERT policy that allows self-registration with required fields.
-- This is safe because:
--   1. This is the user's own isolated database
--   2. They control access to their Supabase keys
--   3. The policy requires all mandatory fields to be present

--------------------------------------------------------------------------------
-- Add INSERT policy for user self-registration
--------------------------------------------------------------------------------

-- Allow anon/authenticated users to register themselves
-- Requires github_id and github_access_token to be present
CREATE POLICY "Allow user self-registration" ON mason_users
  FOR INSERT WITH CHECK (
    github_id IS NOT NULL
    AND github_username IS NOT NULL
    AND github_access_token IS NOT NULL
  );

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON POLICY "Allow user self-registration" ON mason_users IS
  'Allows users to register themselves during setup. Safe for private architecture where user owns their database.';
