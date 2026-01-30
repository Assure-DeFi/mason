import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import {
  formatDatabaseError,
  getUserFriendlyDatabaseError,
} from '@/lib/errors';
import { createGitHubClient, getRepository } from '@/lib/github/client';
import { createServiceClient } from '@/lib/supabase/client';
import type { GitHubRepository } from '@/types/auth';

// GET /api/github/repositories - List connected repositories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: repos, error } = await supabase
      .from('mason_github_repositories')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('github_full_name', { ascending: true });

    if (error) {
      console.error(formatDatabaseError('fetch repositories', error));
      return NextResponse.json(
        { error: getUserFriendlyDatabaseError('fetch repositories', error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ repositories: repos as GitHubRepository[] });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/github/repositories - Connect a repository
// Privacy: GitHub token is passed from client (stored in localStorage, not server)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, name, githubToken } = body;

    if (!owner || !name) {
      return NextResponse.json(
        { error: 'Missing owner or name' },
        { status: 400 },
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { error: 'Missing GitHub token' },
        { status: 400 },
      );
    }

    // Use token from client request (stored in their localStorage)
    const octokit = createGitHubClient(githubToken);

    // Fetch repository details from GitHub
    const repo = await getRepository(octokit, owner, name);

    const supabase = createServiceClient();

    // Insert or update the repository
    const { data: savedRepo, error } = await supabase
      .from('mason_github_repositories')
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
      return NextResponse.json(
        { error: getUserFriendlyDatabaseError('connect repository', error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ repository: savedRepo as GitHubRepository });
  } catch (error) {
    console.error('Error connecting repository:', error);

    if ((error as { status?: number }).status === 404) {
      return NextResponse.json(
        { error: 'Repository not found or no access' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/github/repositories - Disconnect a repository
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('id');

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Missing repository ID' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('mason_github_repositories')
      .update({ is_active: false })
      .eq('id', repositoryId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error(formatDatabaseError('disconnect repository', error));
      return NextResponse.json(
        {
          error: getUserFriendlyDatabaseError('disconnect repository', error),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting repository:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
