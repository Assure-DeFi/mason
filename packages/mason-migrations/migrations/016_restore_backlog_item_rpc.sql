-- Migration 016: Add RPC function for atomic backlog item restore
--
-- This function wraps the 3-step restore operation in a single transaction:
-- 1. INSERT into mason_pm_backlog_items (without priority_score - it's GENERATED ALWAYS)
-- 2. UPDATE mason_pm_filtered_items to mark as 'restored'
-- 3. INSERT into mason_pm_restore_feedback for confidence decay tracking
--
-- If any step fails, the entire transaction is rolled back automatically.

CREATE OR REPLACE FUNCTION restore_filtered_item(
  p_filtered_item_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filtered_item RECORD;
  v_new_item RECORD;
BEGIN
  -- Fetch the filtered item
  SELECT * INTO v_filtered_item
  FROM mason_pm_filtered_items
  WHERE id = p_filtered_item_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Filtered item not found');
  END IF;

  -- Check if already restored
  IF v_filtered_item.override_status = 'restored' THEN
    RETURN json_build_object('success', false, 'error', 'Item has already been restored');
  END IF;

  -- Step 1: Create the backlog item
  -- Note: priority_score is GENERATED ALWAYS AS ((impact_score * 2) - effort_score) STORED
  -- so it must NOT be included in the INSERT
  INSERT INTO mason_pm_backlog_items (
    title,
    problem,
    solution,
    type,
    area,
    impact_score,
    effort_score,
    complexity,
    benefits,
    status,
    analysis_run_id
  ) VALUES (
    v_filtered_item.title,
    v_filtered_item.problem,
    v_filtered_item.solution,
    v_filtered_item.type,
    v_filtered_item.area,
    v_filtered_item.impact_score,
    v_filtered_item.effort_score,
    COALESCE(v_filtered_item.complexity, 2),
    COALESCE(v_filtered_item.benefits, '[]'::jsonb),
    'new',
    v_filtered_item.analysis_run_id
  )
  RETURNING * INTO v_new_item;

  -- Step 2: Mark filtered item as restored
  UPDATE mason_pm_filtered_items
  SET override_status = 'restored'
  WHERE id = p_filtered_item_id;

  -- Step 3: Track restore feedback for confidence decay system
  INSERT INTO mason_pm_restore_feedback (
    filtered_item_id,
    filter_tier,
    filter_reason,
    restored_at
  ) VALUES (
    p_filtered_item_id,
    v_filtered_item.filter_tier,
    v_filtered_item.filter_reason,
    NOW()
  );

  -- Return the created backlog item
  RETURN json_build_object(
    'success', true,
    'backlog_item', row_to_json(v_new_item)
  );
END;
$$;
