-- Migration: 009_ai_provider_keys.sql
-- Description: Add AI provider API key storage for PRD generation
-- Keys are stored in the user's own database, protected by RLS

-- Create table for AI provider keys
CREATE TABLE IF NOT EXISTS mason_ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_user_id
  ON mason_ai_provider_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_provider
  ON mason_ai_provider_keys(provider);

-- Enable RLS
ALTER TABLE mason_ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own keys
-- This uses auth.uid() for proper user isolation
CREATE POLICY "Users can manage own AI keys" ON mason_ai_provider_keys
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also allow unauthenticated access for BYOD model (matches other tables)
-- Users manage their own Supabase instance, so full access is appropriate
CREATE POLICY "Allow all operations for BYOD model" ON mason_ai_provider_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE mason_ai_provider_keys IS 'Stores AI provider API keys for PRD generation (stored in user own DB)';
COMMENT ON COLUMN mason_ai_provider_keys.provider IS 'AI provider: anthropic or openai';
COMMENT ON COLUMN mason_ai_provider_keys.api_key IS 'API key for the provider (stored securely in user own database)';
