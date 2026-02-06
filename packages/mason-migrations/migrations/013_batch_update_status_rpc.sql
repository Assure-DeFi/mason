-- Migration 013: Add batch_update_backlog_status RPC function
-- Replaces N individual UPDATE calls with a single batch operation
-- Performance: Approving 20 items goes from 20 sequential round trips to 1

CREATE OR REPLACE FUNCTION batch_update_backlog_status(
  item_ids UUID[],
  new_status TEXT
)
RETURNS SETOF mason_pm_backlog_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate status value
  IF new_status NOT IN ('new', 'approved', 'in_progress', 'completed', 'rejected', 'deferred') THEN
    RAISE EXCEPTION 'Invalid status: %', new_status;
  END IF;

  -- Batch update all items in a single query (transactional by default)
  RETURN QUERY
  UPDATE mason_pm_backlog_items
  SET
    status = new_status,
    updated_at = now()
  WHERE id = ANY(item_ids)
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_backlog_status(UUID[], TEXT) TO authenticated;
-- Also grant to anon for client-side usage (BYOD model)
GRANT EXECUTE ON FUNCTION batch_update_backlog_status(UUID[], TEXT) TO anon;
