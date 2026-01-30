import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  parsePaginationParams,
  createPaginationMeta,
  PAGINATION_LIMITS,
} from '@/lib/api/pagination';
import {
  validateQueryParams,
  formatValidationErrors,
  CommonSchemas,
} from '@/lib/api/validation';
import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  ErrorCodes,
  apiError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import {
  formatDatabaseError,
  getUserFriendlyDatabaseError,
} from '@/lib/errors';
import { createGitHubClient, getRepository } from '@/lib/github/client';
import { createServiceClient } from '@/lib/supabase/client';
import type { GitHubRepository } from '@/types/auth';

// GET /api/github/repositories - List connected repositories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePaginationParams(
      searchParams,
      PAGINATION_LIMITS.REPOSITORIES,
      PAGINATION_LIMITS.REPOSITORIES,
    );

    const { data: repos, error } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('github_full_name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(formatDatabaseError('fetch repositories', error));
      return apiError(
        ErrorCodes.DATABASE_ERROR,
        getUserFriendlyDatabaseError('fetch repositories', error),
        500,
      );
    }

    const meta = createPaginationMeta(limit, offset, repos?.length ?? 0);

    return apiSuccess({
      repositories: repos as GitHubRepository[],
      pagination: meta,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return serverError();
  }
}

// POST /api/github/repositories - Connect a repository
// Privacy: GitHub token is passed from client (stored in localStorage, not server)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const { owner, name, githubToken } = body;

    if (!owner || !name) {
      return badRequest('Missing owner or name');
    }

    if (!githubToken) {
      return badRequest('Missing GitHub token');
    }

    // Use token from client request (stored in their localStorage)
    const octokit = createGitHubClient(githubToken);

    // Fetch repository details from GitHub
    const repo = await getRepository(octokit, owner, name);

    const supabase = createServiceClient();

    // Insert or update the repository
    const { data: savedRepo, error } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .upsert(
        {
          user_id: session.user.id,
          github_repo_id: repo.id,
          github_owner: repo.owner.login,
          github_name: repo.name,
          github_full_name: repo.full_name,
          github_default_branch: repo.default_branch,
          github_private: repo.private,
          github_clone_url: repo.clone_url,
          github_html_url: repo.html_url,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,github_repo_id',
        },
      )
      .select()
      .single();

    if (error) {
      console.error(formatDatabaseError('save repository', error));
      return apiError(
        ErrorCodes.DATABASE_ERROR,
        getUserFriendlyDatabaseError('connect repository', error),
        500,
      );
    }

    return apiSuccess({ repository: savedRepo as GitHubRepository });
  } catch (error) {
    console.error('Error connecting repository:', error);

    if ((error as { status?: number }).status === 404) {
      return notFound('Repository not found or no access');
    }

    return serverError();
  }
}

// DELETE /api/github/repositories - Disconnect a repository
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters with schema
    const validation = validateQueryParams(searchParams, {
      id: CommonSchemas.uuid(true),
    });

    if (!validation.success) {
      return badRequest(formatValidationErrors(validation.errors));
    }

    const { id: repositoryId } = validation.data;
    const supabase = createServiceClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .update({ is_active: false })
      .eq('id', repositoryId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error(formatDatabaseError('disconnect repository', error));
      return apiError(
        ErrorCodes.DATABASE_ERROR,
        getUserFriendlyDatabaseError('disconnect repository', error),
        500,
      );
    }

    return apiSuccess({ disconnected: true });
  } catch (error) {
    console.error('Error disconnecting repository:', error);
    return serverError();
  }
}
