/**
 * Client-Side GitHub API Helper
 *
 * Makes GitHub API calls directly from the browser using the user's
 * access token stored in localStorage. This implements the privacy
 * architecture where the token never touches our servers.
 *
 * Privacy Model:
 * - GitHub token stored in localStorage only
 * - API calls go directly from browser to GitHub
 * - Central server never sees the token
 */

import { getGitHubToken } from '@/lib/supabase/user-client';

export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface GitHubApiError {
  message: string;
  status: number;
}

/**
 * List repositories accessible to the authenticated user
 * Calls GitHub API directly from the browser
 */
export async function listUserRepositories(): Promise<{
  repositories: GitHubRepo[];
  error?: GitHubApiError;
}> {
  const token = getGitHubToken();

  if (!token) {
    return {
      repositories: [],
      error: {
        message: 'GitHub token not found. Please sign in again.',
        status: 401,
      },
    };
  }

  try {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?visibility=all&sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        return {
          repositories: [],
          error: {
            message:
              errorBody.message || `GitHub API error: ${response.status}`,
            status: response.status,
          },
        };
      }

      const data = await response.json();

      if (data.length === 0) break;

      repos.push(
        ...data.map((repo: Record<string, unknown>) => ({
          id: repo.id as number,
          owner: (repo.owner as { login: string }).login,
          name: repo.name as string,
          full_name: repo.full_name as string,
          private: repo.private as boolean,
          default_branch: repo.default_branch as string,
          html_url: repo.html_url as string,
        })),
      );

      if (data.length < perPage) break;
      page++;
    }

    return { repositories: repos };
  } catch (err) {
    return {
      repositories: [],
      error: {
        message:
          err instanceof Error ? err.message : 'Failed to fetch repositories',
        status: 500,
      },
    };
  }
}

/**
 * Get a single repository by owner and name
 */
export async function getRepository(
  owner: string,
  repo: string,
): Promise<{ repository: GitHubRepo | null; error?: GitHubApiError }> {
  const token = getGitHubToken();

  if (!token) {
    return {
      repository: null,
      error: {
        message: 'GitHub token not found. Please sign in again.',
        status: 401,
      },
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        repository: null,
        error: {
          message: errorBody.message || `GitHub API error: ${response.status}`,
          status: response.status,
        },
      };
    }

    const data = await response.json();

    return {
      repository: {
        id: data.id,
        owner: data.owner.login,
        name: data.name,
        full_name: data.full_name,
        private: data.private,
        default_branch: data.default_branch,
        html_url: data.html_url,
      },
    };
  } catch (err) {
    return {
      repository: null,
      error: {
        message:
          err instanceof Error ? err.message : 'Failed to fetch repository',
        status: 500,
      },
    };
  }
}

/**
 * Validate that the stored GitHub token is still valid
 */
export async function validateGitHubToken(): Promise<{
  valid: boolean;
  username?: string;
  error?: string;
}> {
  const token = getGitHubToken();

  if (!token) {
    return { valid: false, error: 'No token stored' };
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return { valid: false, error: `Token invalid: ${response.status}` };
    }

    const data = await response.json();
    return { valid: true, username: data.login };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Validation failed',
    };
  }
}
