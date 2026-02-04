-- Migration 014: External notification channels for autopilot events
--
-- Adds tables for configuring notification channels (Slack, email, webhook)
-- and logging delivery results for debugging and auditing.

-- ============================================================================
-- 1. Notification channels configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES mason_users(id) ON DELETE CASCADE,
  -- NULL = applies to all repos for this user
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE CASCADE,

  -- Channel type and configuration
  channel_type TEXT NOT NULL CHECK (channel_type IN ('slack', 'email', 'webhook')),
  enabled BOOLEAN DEFAULT true,

  -- Channel-specific config stored as JSONB
  -- Slack: { "webhookUrl": "...", "channelName": "..." }
  -- Email: { "email": "...", "frequency": "instant"|"daily" }
  -- Webhook: { "url": "...", "secret": "...", "headers": {...} }
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Event type filter (empty array = all events)
  -- Valid values: 'analysis_completed', 'high_priority_finding',
  --              'execution_completed', 'execution_failed', 'daily_digest'
  event_filter TEXT[] DEFAULT '{}',

  -- Human-readable label
  name TEXT DEFAULT 'Default'
);

-- ============================================================================
-- 2. Notification delivery logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS mason_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivered_at TIMESTAMPTZ DEFAULT now(),

  -- References
  channel_id UUID NOT NULL REFERENCES mason_notification_channels(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  repository_id UUID REFERENCES mason_github_repositories(id) ON DELETE SET NULL,

  -- Delivery result
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  status_code INTEGER
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id
  ON mason_notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_repo
  ON mason_notification_channels(user_id, repository_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled
  ON mason_notification_channels(enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_id
  ON mason_notification_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_delivered_at
  ON mason_notification_logs(delivered_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type
  ON mason_notification_logs(event_type);

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================
ALTER TABLE mason_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mason_notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow all access (BYOD model - user owns their database)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mason_notification_channels'
    AND policyname = 'Allow all operations on mason_notification_channels'
  ) THEN
    CREATE POLICY "Allow all operations on mason_notification_channels"
      ON mason_notification_channels FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mason_notification_logs'
    AND policyname = 'Allow all operations on mason_notification_logs'
  ) THEN
    CREATE POLICY "Allow all operations on mason_notification_logs"
      ON mason_notification_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 5. Comments
-- ============================================================================
COMMENT ON TABLE mason_notification_channels IS 'Configurable notification channels for autopilot events (Slack, email, webhook)';
COMMENT ON TABLE mason_notification_logs IS 'Delivery log for notification audit trail and debugging';
COMMENT ON COLUMN mason_notification_channels.event_filter IS 'Array of event types to receive. Empty = all events.';
COMMENT ON COLUMN mason_notification_channels.config IS 'Channel-specific configuration (webhook URL, email address, etc.)';
