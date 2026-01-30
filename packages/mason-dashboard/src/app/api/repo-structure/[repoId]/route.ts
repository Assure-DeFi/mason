import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { createGitHubClient } from '@/lib/github/client';
import { createServiceClient } from '@/lib/supabase/client';

interface AreaSuggestion {
  label: string;
  path: string;
  description: string;
}

// Common directory patterns and their human-readable labels
const DIRECTORY_PATTERNS: Record<
  string,
  { label: string; description: string }
> = {
  auth: {
    label: 'Authentication flow',
    description: 'Login, signup, session management',
  },
  login: {
    label: 'Login flow',
    description: 'User authentication and sign-in',
  },
  api: { label: 'API endpoints', description: 'Backend routes and handlers' },
  routes: { label: 'API routes', description: 'Server endpoints and handlers' },
  components: {
    label: 'UI components',
    description: 'Reusable React components',
  },
  dashboard: { label: 'Dashboard', description: 'Admin and user dashboards' },
  admin: { label: 'Admin panel', description: 'Administrative features' },
  settings: { label: 'Settings', description: 'User and app configuration' },
  lib: { label: 'Utilities', description: 'Helper functions and libraries' },
  utils: { label: 'Utilities', description: 'Helper functions and tools' },
  hooks: { label: 'React hooks', description: 'Custom React hooks' },
  services: {
    label: 'Services',
    description: 'Business logic and API clients',
  },
  store: { label: 'State management', description: 'Global state and stores' },
  context: { label: 'React context', description: 'Context providers' },
  types: {
    label: 'Type definitions',
    description: 'TypeScript types and interfaces',
  },
  tests: { label: 'Tests', description: 'Test files and fixtures' },
  __tests__: { label: 'Tests', description: 'Test files and fixtures' },
  supabase: {
    label: 'Database queries',
    description: 'Supabase client and queries',
  },
  db: { label: 'Database', description: 'Database models and queries' },
  prisma: { label: 'Database', description: 'Prisma schema and migrations' },
  pages: { label: 'Pages', description: 'Page components and routing' },
  app: { label: 'App router', description: 'Next.js app directory' },
  middleware: {
    label: 'Middleware',
    description: 'Request/response middleware',
  },
  actions: { label: 'Server actions', description: 'Server-side actions' },
};

// GET /api/repo-structure/[repoId] - Get repository structure suggestions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repoId } = await params;

    if (!repoId) {
      return NextResponse.json(
        { error: 'Missing repository ID' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Get repository details
    const { data: repo, error: repoError } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .select('*')
      .eq('id', repoId)
      .eq('user_id', session.user.id)
      .single();

    if (repoError || !repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 },
      );
    }

    // Try to get GitHub token from session
    const githubToken = (session as { accessToken?: string }).accessToken;

    if (!githubToken) {
      // Return default suggestions if no token available
      return NextResponse.json({
        suggestions: getDefaultSuggestions(),
      });
    }

    // Fetch repository tree from GitHub
    const octokit = createGitHubClient(githubToken);

    try {
      const { data: tree } = await octokit.rest.git.getTree({
        owner: repo.github_owner,
        repo: repo.github_name,
        tree_sha: repo.github_default_branch,
        recursive: 'false', // Only top-level directories
      });

      const suggestions = analyzeRepoStructure(tree.tree);
      return NextResponse.json({ suggestions });
    } catch (githubError) {
      console.error('GitHub API error:', githubError);
      // Return default suggestions on GitHub API error
      return NextResponse.json({
        suggestions: getDefaultSuggestions(),
      });
    }
  } catch (error) {
    console.error('Error fetching repo structure:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function analyzeRepoStructure(
  tree: { path?: string; type?: string }[],
): AreaSuggestion[] {
  const suggestions: AreaSuggestion[] = [];
  const seen = new Set<string>();

  // Filter to directories and significant files
  const directories = tree.filter((item) => item.type === 'tree' && item.path);

  for (const dir of directories) {
    const path = dir.path || '';
    const dirName = path.split('/').pop()?.toLowerCase() || '';

    // Check if this directory matches a known pattern
    const pattern = DIRECTORY_PATTERNS[dirName];
    if (pattern && !seen.has(pattern.label)) {
      seen.add(pattern.label);
      suggestions.push({
        label: pattern.label,
        path: path,
        description: pattern.description,
      });
    }

    // Also check for nested patterns (e.g., src/components)
    for (const [key, value] of Object.entries(DIRECTORY_PATTERNS)) {
      if (path.includes(`/${key}`) && !seen.has(value.label)) {
        seen.add(value.label);
        suggestions.push({
          label: value.label,
          path: path,
          description: value.description,
        });
      }
    }
  }

  // Sort by label and limit to 8 suggestions
  return suggestions.sort((a, b) => a.label.localeCompare(b.label)).slice(0, 8);
}

function getDefaultSuggestions(): AreaSuggestion[] {
  return [
    {
      label: 'Authentication flow',
      path: 'auth/',
      description: 'Login, signup, session management',
    },
    {
      label: 'Dashboard components',
      path: 'components/dashboard/',
      description: 'Admin and user dashboard UI',
    },
    {
      label: 'API endpoints',
      path: 'api/',
      description: 'Backend routes and handlers',
    },
    {
      label: 'Database queries',
      path: 'lib/db/',
      description: 'Database models and queries',
    },
  ];
}
