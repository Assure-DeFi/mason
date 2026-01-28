import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createGitHubClient, listRepositories } from '@/lib/github/client';

// GET /api/github/repositories/available - List available GitHub repositories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.github_access_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const octokit = createGitHubClient(session.user.github_access_token);
    const repos = await listRepositories(octokit);

    return NextResponse.json({
      repositories: repos.map((repo) => ({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        html_url: repo.html_url,
      })),
    });
  } catch (error) {
    console.error('Error listing GitHub repositories:', error);
    return NextResponse.json(
      { error: 'Failed to list repositories' },
      { status: 500 },
    );
  }
}
