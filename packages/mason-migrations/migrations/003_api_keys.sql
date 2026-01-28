-- Mason PM System: API Keys for Hosted Service
-- Migration: 003_api_keys
-- Description: Adds API key authentication for CLI-to-dashboard communication

--------------------------------------------------------------------------------
-- Table: api_keys
-- Stores API keys for CLI authentication (keys are hashed, never stored plain)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Owner reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key identification
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,      -- SHA-256 hash of the full key
  key_prefix TEXT NOT NULL,    -- First 8 chars for display (e.g., "mason_ab")

  -- Usage tracking
  last_used_at TIMESTAMPTZ,

  -- Ensure no duplicate keys
  UNIQUE(key_hash)
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

-- Fast lookup by key hash (used for authentication)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- List keys by user
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Find by prefix (for admin/display purposes)
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

--------------------------------------------------------------------------------
-- Row Level Security (RLS)
--------------------------------------------------------------------------------

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- WARNING: DEVELOPMENT-ONLY POLICIES
-- These permissive policies are for local development and testing only.
-- For production deployments, replace with restrictive policies like:
--   USING (auth.uid() = user_id)
-- See: https://supabase.com/docs/guides/auth/row-level-security
--------------------------------------------------------------------------------

-- Users can view their own API keys
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (true);  -- Production: USING (user_id = auth.uid())

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (true);  -- Production: WITH CHECK (user_id = auth.uid())

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (true);  -- Production: USING (user_id = auth.uid())

-- System can update last_used_at (via service role)
CREATE POLICY "System can update API keys" ON api_keys
  FOR UPDATE USING (true) WITH CHECK (true);

--------------------------------------------------------------------------------
-- Comments
--------------------------------------------------------------------------------

COMMENT ON TABLE api_keys IS 'API keys for CLI authentication to hosted dashboard';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key (never store plain keys)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of key for display (e.g., mason_ab12)';
COMMENT ON COLUMN api_keys.last_used_at IS 'Last time this key was used for authentication';
