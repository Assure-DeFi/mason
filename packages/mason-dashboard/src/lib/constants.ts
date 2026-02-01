/**
 * Centralized constants for Mason Dashboard
 *
 * Single source of truth for storage keys, table names, and API routes.
 * Import from here instead of hardcoding strings throughout the codebase.
 */

/**
 * localStorage keys used throughout the application
 */
export const STORAGE_KEYS = {
  /** User's Supabase configuration (url, anon key) */
  CONFIG: 'mason_config',
  /** Last selected repository ID */
  LAST_REPOSITORY: 'mason-last-repository',
  /** User's preferred execution method (cli or remote) */
  EXECUTE_PREFERENCE: 'mason_execute_preference',
  /** GitHub access token for API calls */
  GITHUB_TOKEN: 'mason_github_token',
  /** Supabase OAuth session data (PKCE state/verifier) */
  SUPABASE_OAUTH_SESSION: 'mason_supabase_oauth_session',
  /** Backlog table column width preferences */
  COLUMN_WIDTHS: 'mason_backlog_column_widths',
} as const;

/**
 * Supabase table names
 */
export const TABLES = {
  // Core user tables
  USERS: 'mason_users',
  API_KEYS: 'mason_api_keys',
  GITHUB_REPOSITORIES: 'mason_github_repositories',

  // PM backlog tables
  PM_BACKLOG_ITEMS: 'mason_pm_backlog_items',
  PM_ANALYSIS_RUNS: 'mason_pm_analysis_runs',
  PM_FILTERED_ITEMS: 'mason_pm_filtered_items',

  // Execution progress (CLI writes here, dashboard subscribes for realtime updates)
  EXECUTION_PROGRESS: 'mason_execution_progress',

  // Feedback tracking
  PM_RESTORE_FEEDBACK: 'mason_pm_restore_feedback',

  // Risk analysis
  DEPENDENCY_ANALYSIS: 'mason_dependency_analysis',

  // Autopilot tables
  AUTOPILOT_CONFIG: 'mason_autopilot_config',
  AUTOPILOT_RUNS: 'mason_autopilot_runs',

  // Security/Audit tables
  AUDIT_LOGS: 'mason_audit_logs',

  // Item event history tracking
  ITEM_EVENTS: 'mason_item_events',
} as const;

/**
 * Internal API routes
 */
export const API_ROUTES = {
  // GitHub
  GITHUB_REPOSITORIES: '/api/github/repositories',

  // Setup
  SETUP_MIGRATIONS: '/api/setup/migrations',

  // Backlog
  BACKLOG_RESTORE: '/api/backlog/restore',

  // Auth
  VALIDATE_ANALYSIS: '/api/v1/analysis',
} as const;

/**
 * Realtime channel names for Supabase subscriptions
 */
export const REALTIME_CHANNELS = {
  BACKLOG_CHANGES: 'mason_pm_backlog_changes',
} as const;

/**
 * Type helpers for using constants
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type TableName = (typeof TABLES)[keyof typeof TABLES];
