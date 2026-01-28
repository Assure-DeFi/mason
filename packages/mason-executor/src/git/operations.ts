import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Git state validation result
 */
export interface GitState {
  isRepo: boolean;
  isDirty: boolean;
  hasUntracked: boolean;
  currentBranch: string | null;
  isDetached: boolean;
  isMerging: boolean;
  isRebasing: boolean;
  headCommit: string | null;
}

/**
 * Git state validation issue
 */
export interface GitStateIssue {
  type:
    | 'not_repo'
    | 'dirty'
    | 'untracked'
    | 'detached'
    | 'merging'
    | 'rebasing';
  message: string;
  suggestion: string;
}

/**
 * Run a git command in the repo
 */
async function git(
  repoPath: string,
  args: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(`git ${args}`, { cwd: repoPath });
}

/**
 * Check if path is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  return existsSync(join(repoPath, '.git'));
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(
  repoPath: string,
): Promise<string | null> {
  try {
    const { stdout } = await git(repoPath, 'rev-parse --abbrev-ref HEAD');
    const branch = stdout.trim();
    return branch === 'HEAD' ? null : branch;
  } catch {
    return null;
  }
}

/**
 * Get current HEAD commit SHA
 */
export async function getHeadCommit(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await git(repoPath, 'rev-parse HEAD');
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(
  repoPath: string,
): Promise<boolean> {
  try {
    const { stdout } = await git(repoPath, 'status --porcelain');
    // Look for modified or staged files (not untracked)
    const lines = stdout.split('\n').filter((l) => l.trim());
    return lines.some((l) => !l.startsWith('??'));
  } catch {
    return false;
  }
}

/**
 * Check if there are untracked files
 */
export async function hasUntrackedFiles(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await git(repoPath, 'status --porcelain');
    const lines = stdout.split('\n').filter((l) => l.trim());
    return lines.some((l) => l.startsWith('??'));
  } catch {
    return false;
  }
}

/**
 * Check if in detached HEAD state
 */
export async function isDetachedHead(repoPath: string): Promise<boolean> {
  const branch = await getCurrentBranch(repoPath);
  return branch === null;
}

/**
 * Check if merge is in progress
 */
export async function isMergeInProgress(repoPath: string): Promise<boolean> {
  return existsSync(join(repoPath, '.git', 'MERGE_HEAD'));
}

/**
 * Check if rebase is in progress
 */
export async function isRebaseInProgress(repoPath: string): Promise<boolean> {
  return (
    existsSync(join(repoPath, '.git', 'rebase-merge')) ||
    existsSync(join(repoPath, '.git', 'rebase-apply'))
  );
}

/**
 * Get full git state
 */
export async function getGitState(repoPath: string): Promise<GitState> {
  const isRepo = await isGitRepo(repoPath);

  if (!isRepo) {
    return {
      isRepo: false,
      isDirty: false,
      hasUntracked: false,
      currentBranch: null,
      isDetached: false,
      isMerging: false,
      isRebasing: false,
      headCommit: null,
    };
  }

  const [
    isDirty,
    hasUntracked,
    currentBranch,
    isMerging,
    isRebasing,
    headCommit,
  ] = await Promise.all([
    hasUncommittedChanges(repoPath),
    hasUntrackedFiles(repoPath),
    getCurrentBranch(repoPath),
    isMergeInProgress(repoPath),
    isRebaseInProgress(repoPath),
    getHeadCommit(repoPath),
  ]);

  return {
    isRepo: true,
    isDirty,
    hasUntracked,
    currentBranch,
    isDetached: currentBranch === null,
    isMerging,
    isRebasing,
    headCommit,
  };
}

/**
 * Validate git state for execution
 */
export async function validateGitState(
  repoPath: string,
): Promise<{ valid: boolean; issues: GitStateIssue[] }> {
  const state = await getGitState(repoPath);
  const issues: GitStateIssue[] = [];

  if (!state.isRepo) {
    issues.push({
      type: 'not_repo',
      message: 'Not a git repository',
      suggestion: 'Run `git init` to initialize a git repository',
    });
    return { valid: false, issues };
  }

  if (state.isDirty) {
    issues.push({
      type: 'dirty',
      message: 'Working tree has uncommitted changes',
      suggestion:
        'Commit or stash your changes: `git stash` or `git commit -am "WIP"`',
    });
  }

  if (state.isDetached) {
    issues.push({
      type: 'detached',
      message: 'In detached HEAD state',
      suggestion: 'Checkout a branch: `git checkout main`',
    });
  }

  if (state.isMerging) {
    issues.push({
      type: 'merging',
      message: 'Merge in progress',
      suggestion:
        'Complete the merge: `git merge --continue` or abort: `git merge --abort`',
    });
  }

  if (state.isRebasing) {
    issues.push({
      type: 'rebasing',
      message: 'Rebase in progress',
      suggestion:
        'Complete the rebase: `git rebase --continue` or abort: `git rebase --abort`',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Create a new branch
 */
export async function createBranch(
  repoPath: string,
  branchName: string,
): Promise<void> {
  await git(repoPath, `checkout -b ${branchName}`);
}

/**
 * Switch to a branch
 */
export async function checkoutBranch(
  repoPath: string,
  branchName: string,
): Promise<void> {
  await git(repoPath, `checkout ${branchName}`);
}

/**
 * Create a backup branch at current HEAD
 */
export async function createBackupBranch(repoPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const branchName = `mason-backup/${timestamp}`;
  await git(repoPath, `branch ${branchName}`);
  return branchName;
}

/**
 * Stage and commit changes
 */
export async function commitChanges(
  repoPath: string,
  message: string,
): Promise<void> {
  await git(repoPath, 'add -A');
  // Use HEREDOC-style for the commit message to handle special chars
  await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
    cwd: repoPath,
  });
}

/**
 * Generate a branch name from an item title
 */
export function generateBranchName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `mason/${slug}`;
}

/**
 * Check if a branch exists
 */
export async function branchExists(
  repoPath: string,
  branchName: string,
): Promise<boolean> {
  try {
    await git(repoPath, `rev-parse --verify ${branchName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a branch
 */
export async function deleteBranch(
  repoPath: string,
  branchName: string,
): Promise<void> {
  await git(repoPath, `branch -D ${branchName}`);
}
