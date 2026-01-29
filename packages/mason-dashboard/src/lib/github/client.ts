import { Octokit } from '@octokit/rest';

// Create an authenticated Octokit instance
export function createGitHubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

// Repository types
export interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  default_branch: string;
  clone_url: string;
  html_url: string;
}

// List repositories accessible to the user
export async function listRepositories(
  octokit: Octokit,
): Promise<GitHubRepoResponse[]> {
  const repos: GitHubRepoResponse[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      visibility: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    });

    if (data.length === 0) {break;}

    repos.push(
      ...data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login,
        },
        private: repo.private,
        default_branch: repo.default_branch,
        clone_url: repo.clone_url,
        html_url: repo.html_url,
      })),
    );

    if (data.length < perPage) {break;}
    page++;
  }

  return repos;
}

// Get a single repository
export async function getRepository(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GitHubRepoResponse> {
  const { data } = await octokit.repos.get({
    owner,
    repo,
  });

  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    owner: {
      login: data.owner.login,
    },
    private: data.private,
    default_branch: data.default_branch,
    clone_url: data.clone_url,
    html_url: data.html_url,
  };
}

// Create a branch from default branch
export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string,
): Promise<void> {
  // Get the SHA of the base branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });

  // Create the new branch
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha,
  });
}

// Get file content from repository
export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && typeof data.content === 'string') {
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
      };
    }

    return null;
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

// Create or update a file in the repository
export async function createOrUpdateFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha?: string,
): Promise<void> {
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha: existingSha,
  });
}

// Create a pull request
export interface CreatePROptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface PRResponse {
  number: number;
  html_url: string;
  title: string;
  state: string;
}

export async function createPullRequest(
  octokit: Octokit,
  options: CreatePROptions,
): Promise<PRResponse> {
  const { data } = await octokit.pulls.create({
    owner: options.owner,
    repo: options.repo,
    title: options.title,
    body: options.body,
    head: options.head,
    base: options.base,
  });

  return {
    number: data.number,
    html_url: data.html_url,
    title: data.title,
    state: data.state,
  };
}

// Get repository tree (for context gathering)
export async function getRepositoryTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref?: string,
): Promise<Array<{ path: string; type: string; size?: number }>> {
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref ?? 'HEAD',
    recursive: 'true',
  });

  return data.tree.map((item) => ({
    path: item.path ?? '',
    type: item.type ?? 'blob',
    size: item.size,
  }));
}

// Commit multiple files at once (more efficient for batch operations)
export interface FileChange {
  path: string;
  content: string;
  mode?: '100644' | '100755' | '040000' | '160000' | '120000';
}

export async function commitMultipleFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileChange[],
): Promise<string> {
  // Get the current commit SHA
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const currentCommitSha = refData.object.sha;

  // Get the current tree SHA
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  });
  const currentTreeSha = commitData.tree.sha;

  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blobData } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: file.mode ?? '100644',
        type: 'blob' as const,
        sha: blobData.sha,
      };
    }),
  );

  // Create a new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentTreeSha,
    tree: blobs,
  });

  // Create a new commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [currentCommitSha],
  });

  // Update the branch reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return newCommit.sha;
}
