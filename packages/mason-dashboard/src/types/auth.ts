// Authentication types

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  github_id: string;
  github_username: string;
  github_email: string | null;
  github_avatar_url: string | null;
  github_access_token: string;
  github_token_expires_at: string | null;
  default_repository_id: string | null;
  is_active: boolean;
}

export interface GitHubRepository {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  github_repo_id: number;
  github_owner: string;
  github_name: string;
  github_full_name: string;
  github_default_branch: string;
  github_private: boolean;
  github_clone_url: string;
  github_html_url: string;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface RemoteExecutionRun {
  id: string;
  created_at: string;
  user_id: string;
  repository_id: string;
  item_ids: string[];
  item_count: number;
  branch_name: string;
  base_branch: string;
  pr_url: string | null;
  pr_number: number | null;
  started_at: string;
  completed_at: string | null;
  status: RemoteExecutionStatus;
  error_message: string | null;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
}

export type RemoteExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface ExecutionLog {
  id: string;
  created_at: string;
  execution_run_id: string;
  log_level: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// NextAuth session extension
export interface SessionUser {
  id: string;
  github_id: string;
  github_username: string;
  github_email: string | null;
  github_avatar_url: string | null;
  github_access_token: string;
}
