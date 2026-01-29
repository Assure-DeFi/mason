-- Migration: 010_composite_indexes.sql
-- Purpose: Add composite indexes for common query patterns on mason_pm_backlog_items
--
-- Problem: Single-column indexes on user_id, status, and repository_id are suboptimal
-- for combined filter queries, causing full table scans on multi-filter operations.
--
-- Solution: Add composite indexes that match common query patterns:
-- 1. (user_id, status) - Dashboard filtering by user and status
-- 2. (user_id, repository_id) - Repository-specific item lookups
-- 3. (user_id, status, priority_score DESC) - Sorted dashboard views

-- Composite index for user + status filtering (most common query pattern)
-- Supports queries like: WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_status
  ON mason_pm_backlog_items(user_id, status);

-- Composite index for user + repository filtering
-- Supports queries like: WHERE user_id = ? AND repository_id = ?
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_repo
  ON mason_pm_backlog_items(user_id, repository_id);

-- Composite index for sorted dashboard queries
-- Supports queries like: WHERE user_id = ? AND status = ? ORDER BY priority_score DESC
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_user_status_priority
  ON mason_pm_backlog_items(user_id, status, priority_score DESC);

-- Partial index for "active" items only (new, approved, in_progress)
-- More efficient for queries that only care about non-completed items
CREATE INDEX IF NOT EXISTS idx_mason_pm_backlog_items_active
  ON mason_pm_backlog_items(user_id, priority_score DESC)
  WHERE status IN ('new', 'approved', 'in_progress');
