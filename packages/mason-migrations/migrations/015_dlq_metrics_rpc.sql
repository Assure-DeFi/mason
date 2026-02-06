-- Migration 015: DLQ metrics and health monitoring functions
-- Provides aggregate DLQ metrics for the health endpoint and dashboard

-- Function to get DLQ metrics (count, oldest, growth rate)
CREATE OR REPLACE FUNCTION get_dlq_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_count', (SELECT COUNT(*) FROM mason_autopilot_errors),
    'last_24h_count', (SELECT COUNT(*) FROM mason_autopilot_errors WHERE occurred_at > now() - interval '24 hours'),
    'last_hour_count', (SELECT COUNT(*) FROM mason_autopilot_errors WHERE occurred_at > now() - interval '1 hour'),
    'oldest_entry', (SELECT MIN(occurred_at) FROM mason_autopilot_errors),
    'newest_entry', (SELECT MAX(occurred_at) FROM mason_autopilot_errors),
    'max_consecutive_failures', (SELECT COALESCE(MAX(consecutive_failures), 0) FROM mason_autopilot_errors),
    'error_types', (
      SELECT COALESCE(json_agg(json_build_object('type', error_type, 'count', cnt)), '[]'::json)
      FROM (
        SELECT error_type, COUNT(*) as cnt
        FROM mason_autopilot_errors
        GROUP BY error_type
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dlq_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dlq_metrics() TO anon;

-- Function to bulk retry failed items (mark errors as retried)
-- Adds a 'retried_at' column for tracking
ALTER TABLE mason_autopilot_errors ADD COLUMN IF NOT EXISTS retried_at TIMESTAMPTZ;
ALTER TABLE mason_autopilot_errors ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION bulk_retry_dlq(
  error_ids UUID[] DEFAULT NULL,
  max_age_hours INTEGER DEFAULT 24
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  IF error_ids IS NOT NULL THEN
    -- Retry specific errors
    UPDATE mason_autopilot_errors
    SET retried_at = now(), retry_count = retry_count + 1
    WHERE id = ANY(error_ids) AND retried_at IS NULL;
  ELSE
    -- Retry all unretried errors within age window
    UPDATE mason_autopilot_errors
    SET retried_at = now(), retry_count = retry_count + 1
    WHERE retried_at IS NULL
      AND occurred_at > now() - (max_age_hours || ' hours')::interval;
  END IF;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN json_build_object(
    'retried_count', affected_count,
    'retried_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_retry_dlq(UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_retry_dlq(UUID[], INTEGER) TO anon;

-- Add index for DLQ queries
CREATE INDEX IF NOT EXISTS idx_autopilot_errors_retried ON mason_autopilot_errors(retried_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_errors_type ON mason_autopilot_errors(error_type);
