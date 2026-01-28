-- Mason PM System: Production Row Level Security
-- Migration: 004_production_rls
-- Description: Replaces permissive development RLS policies with secure production policies
--
-- IMPORTANT: Run this migration AFTER verifying:
--   1. Application authentication is working
--   2. Users can sign in via GitHub OAuth
--   3. Service role key is configured for backend operations
--
-- This migration will restrict all data access to authenticated users only.
-- Ensure you have a valid session before testing.

--------------------------------------------------------------------------------
-- Drop development policies from 001_pm_backlog_tables.sql
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all access to mason_pm_analysis_runs" ON mason_pm_analysis_runs;
DROP POLICY IF EXISTS "Allow all access to mason_pm_backlog_items" ON mason_pm_backlog_items;

--------------------------------------------------------------------------------
-- Drop development policies from 002_auth_and_github.sql
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own profile" ON mason_users;
DROP POLICY IF EXISTS "Users can update own profile" ON mason_users;
DROP POLICY IF EXISTS "Users can view own repositories" ON mason_github_repositories;
DROP POLICY IF EXISTS "Users can manage own repositories" ON mason_github_repositories;
DROP POLICY IF EXISTS "Users can view own execution runs" ON mason_remote_execution_runs;
DROP POLICY IF EXISTS "Users can manage own execution runs" ON mason_remote_execution_runs;
DROP POLICY IF EXISTS "Users can view execution logs" ON mason_execution_logs;
DROP POLICY IF EXISTS "System can insert execution logs" ON mason_execution_logs;

--------------------------------------------------------------------------------
-- Drop development policies from 003_api_keys.sql
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own API keys" ON mason_api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON mason_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON mason_api_keys;
DROP POLICY IF EXISTS "System can update API keys" ON mason_api_keys;

--------------------------------------------------------------------------------
-- Production policies: mason_users table
-- Note: auth.uid() returns the authenticated user's ID from Supabase Auth
-- For GitHub OAuth, we match against github_id
--------------------------------------------------------------------------------

CREATE POLICY "Users can view own profile" ON mason_users
  FOR SELECT USING (auth.uid()::text = github_id);

CREATE POLICY "Users can update own profile" ON mason_users
  FOR UPDATE USING (auth.uid()::text = github_id)
  WITH CHECK (auth.uid()::text = github_id);

-- Service role bypass for user creation during OAuth
CREATE POLICY "Service role can manage users" ON mason_users
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_github_repositories table
--------------------------------------------------------------------------------

CREATE POLICY "Users can view own repositories" ON mason_github_repositories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own repositories" ON mason_github_repositories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own repositories" ON mason_github_repositories
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own repositories" ON mason_github_repositories
  FOR DELETE USING (user_id = auth.uid());

-- Service role bypass for backend operations
CREATE POLICY "Service role can manage repositories" ON mason_github_repositories
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_remote_execution_runs table
--------------------------------------------------------------------------------

CREATE POLICY "Users can view own execution runs" ON mason_remote_execution_runs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own execution runs" ON mason_remote_execution_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own execution runs" ON mason_remote_execution_runs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role bypass for execution management
CREATE POLICY "Service role can manage execution runs" ON mason_remote_execution_runs
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_execution_logs table
-- Users can view logs for their own execution runs
-- Service role can insert logs during execution
--------------------------------------------------------------------------------

CREATE POLICY "Users can view own execution logs" ON mason_execution_logs
  FOR SELECT USING (
    execution_run_id IN (
      SELECT id FROM mason_remote_execution_runs WHERE user_id = auth.uid()
    )
  );

-- Service role can insert execution logs during automated runs
CREATE POLICY "Service role can insert execution logs" ON mason_execution_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role can manage all logs
CREATE POLICY "Service role can manage execution logs" ON mason_execution_logs
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_api_keys table
--------------------------------------------------------------------------------

CREATE POLICY "Users can view own api keys" ON mason_api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own api keys" ON mason_api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api keys" ON mason_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- Service role can update last_used_at during API key validation
CREATE POLICY "Service role can manage api keys" ON mason_api_keys
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_pm_analysis_runs table
-- Analysis runs are created by the service role via API
--------------------------------------------------------------------------------

-- Users can view analysis runs (public read for now - could restrict to user's runs)
CREATE POLICY "Users can view analysis runs" ON mason_pm_analysis_runs
  FOR SELECT USING (true);

-- Service role manages analysis runs
CREATE POLICY "Service role can manage analysis runs" ON mason_pm_analysis_runs
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Production policies: mason_pm_backlog_items table
--------------------------------------------------------------------------------

-- Users can view their own backlog items (items they created or are assigned to their repos)
CREATE POLICY "Users can view own backlog items" ON mason_pm_backlog_items
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IS NULL  -- Allow legacy items without user_id
  );

-- Users can update their own backlog items
CREATE POLICY "Users can update own backlog items" ON mason_pm_backlog_items
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role manages backlog items (created via API)
CREATE POLICY "Service role can manage backlog items" ON mason_pm_backlog_items
  FOR ALL USING (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON POLICY "Users can view own profile" ON mason_users IS
  'Production: Users can only view their own profile data';

COMMENT ON POLICY "Service role can manage users" ON mason_users IS
  'Allows service role to create/update users during OAuth flow';

COMMENT ON POLICY "Users can view own execution logs" ON mason_execution_logs IS
  'Production: Users can only view logs for their own execution runs';

COMMENT ON POLICY "Service role can manage api keys" ON mason_api_keys IS
  'Allows service role to update last_used_at during API key validation';
