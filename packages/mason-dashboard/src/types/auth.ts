// Authentication types

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  github_id: string;
  github_username: string;
  github_email: string | null;
  github_avatar_url: string | null;
  // github_access_token removed - stored in localStorage only for privacy
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

export interface Checkpoint {
  id: number;
  name: string;
  timestamp?: string;
  completed_at?: string;
}

// NextAuth session extension
export interface SessionUser {
  id: string;
  github_id: string;
  github_username: string;
  github_email: string | null;
  github_avatar_url: string | null;
  // github_access_token is NOT stored in session for privacy
  // It's stored in localStorage only, access via useGitHubToken hook
  // tempAccessToken is only present during initial sign-in for client storage
  tempAccessToken?: string;
}
