#!/usr/bin/env python3
"""
Git Operations Library

Cross-platform git operations for Mason Auto-Pilot:
- create_branch(): Create and checkout a new branch
- commit(): Stage and commit changes
- push(): Push to remote
- get_current_branch(): Get the current branch name
- ensure_clean(): Check for uncommitted changes
"""

import re
import subprocess
import sys
from pathlib import Path
from typing import Optional, Tuple


class GitError(Exception):
    """Custom exception for git operation errors."""
    def __init__(self, message: str, returncode: int = 1):
        super().__init__(message)
        self.returncode = returncode


def run_git(
    args: list[str],
    cwd: Optional[Path] = None,
    capture_output: bool = True
) -> Tuple[str, str, int]:
    """
    Run a git command.

    Args:
        args: Git command arguments (without 'git' prefix)
        cwd: Working directory (default: current)
        capture_output: Whether to capture stdout/stderr

    Returns:
        Tuple of (stdout, stderr, returncode)
    """
    cmd = ['git'] + args

    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture_output,
        text=True,
        shell=False  # Security: never use shell=True
    )

    return result.stdout.strip(), result.stderr.strip(), result.returncode


def get_current_branch(cwd: Optional[Path] = None) -> str:
    """Get the name of the current git branch."""
    stdout, stderr, code = run_git(['branch', '--show-current'], cwd)

    if code != 0:
        raise GitError(f'Failed to get current branch: {stderr}', code)

    return stdout


def ensure_clean(cwd: Optional[Path] = None) -> bool:
    """
    Check if the working directory is clean (no uncommitted changes).

    Returns:
        True if clean, raises GitError if dirty
    """
    stdout, stderr, code = run_git(['status', '--porcelain'], cwd)

    if code != 0:
        raise GitError(f'Failed to check git status: {stderr}', code)

    if stdout:
        raise GitError('Working directory has uncommitted changes. Commit or stash them first.')

    return True


def fetch(remote: str = 'origin', cwd: Optional[Path] = None) -> None:
    """Fetch from remote."""
    stdout, stderr, code = run_git(['fetch', remote], cwd)

    if code != 0:
        raise GitError(f'Failed to fetch from {remote}: {stderr}', code)


def checkout(branch: str, cwd: Optional[Path] = None) -> None:
    """Checkout an existing branch."""
    stdout, stderr, code = run_git(['checkout', branch], cwd)

    if code != 0:
        raise GitError(f'Failed to checkout {branch}: {stderr}', code)


def pull(remote: str = 'origin', branch: Optional[str] = None, cwd: Optional[Path] = None) -> None:
    """Pull from remote."""
    args = ['pull', remote]
    if branch:
        args.append(branch)

    stdout, stderr, code = run_git(args, cwd)

    if code != 0:
        raise GitError(f'Failed to pull from {remote}: {stderr}', code)


def create_branch(name: str, base: str = 'main', cwd: Optional[Path] = None) -> str:
    """
    Create and checkout a new branch.

    Args:
        name: Branch name (will be sanitized)
        base: Base branch to create from
        cwd: Working directory

    Returns:
        The actual branch name created
    """
    # Sanitize branch name
    safe_name = sanitize_branch_name(name)

    # First, make sure we have latest base
    try:
        fetch('origin', cwd)
    except GitError:
        pass  # Fetch failure is not fatal

    # Checkout base branch
    checkout(base, cwd)

    # Pull latest
    try:
        pull('origin', base, cwd)
    except GitError:
        pass  # Pull failure is not fatal (might be new repo)

    # Create new branch
    stdout, stderr, code = run_git(['checkout', '-b', safe_name], cwd)

    if code != 0:
        # Branch might already exist
        if 'already exists' in stderr:
            # Checkout existing branch
            stdout, stderr, code = run_git(['checkout', safe_name], cwd)
            if code != 0:
                raise GitError(f'Failed to checkout existing branch {safe_name}: {stderr}', code)
        else:
            raise GitError(f'Failed to create branch {safe_name}: {stderr}', code)

    return safe_name


def sanitize_branch_name(name: str) -> str:
    """
    Sanitize a string for use as a git branch name.

    Args:
        name: Raw branch name

    Returns:
        Sanitized branch name
    """
    # Convert to lowercase
    name = name.lower()

    # Replace spaces and special chars with dashes
    name = re.sub(r'[^a-z0-9/-]', '-', name)

    # Collapse multiple dashes
    name = re.sub(r'-+', '-', name)

    # Remove leading/trailing dashes
    name = name.strip('-')

    # Limit length
    if len(name) > 50:
        name = name[:50].rstrip('-')

    return name


def stage_all(cwd: Optional[Path] = None) -> None:
    """Stage all changes."""
    stdout, stderr, code = run_git(['add', '-A'], cwd)

    if code != 0:
        raise GitError(f'Failed to stage changes: {stderr}', code)


def commit(message: str, cwd: Optional[Path] = None) -> str:
    """
    Create a commit with the given message.

    Args:
        message: Commit message
        cwd: Working directory

    Returns:
        The commit SHA
    """
    # Stage all changes first
    stage_all(cwd)

    # Create commit
    stdout, stderr, code = run_git(['commit', '-m', message], cwd)

    if code != 0:
        if 'nothing to commit' in stderr or 'nothing to commit' in stdout:
            raise GitError('Nothing to commit', code)
        raise GitError(f'Failed to commit: {stderr}', code)

    # Get the commit SHA
    stdout, stderr, code = run_git(['rev-parse', 'HEAD'], cwd)

    if code != 0:
        raise GitError(f'Failed to get commit SHA: {stderr}', code)

    return stdout


def push(
    remote: str = 'origin',
    branch: Optional[str] = None,
    set_upstream: bool = True,
    cwd: Optional[Path] = None
) -> None:
    """
    Push to remote.

    Args:
        remote: Remote name
        branch: Branch to push (default: current)
        set_upstream: Set upstream tracking
        cwd: Working directory
    """
    if not branch:
        branch = get_current_branch(cwd)

    args = ['push']
    if set_upstream:
        args.extend(['-u', remote, branch])
    else:
        args.extend([remote, branch])

    stdout, stderr, code = run_git(args, cwd)

    if code != 0:
        raise GitError(f'Failed to push to {remote}/{branch}: {stderr}', code)


def get_remote_url(remote: str = 'origin', cwd: Optional[Path] = None) -> Optional[str]:
    """Get the URL of a remote."""
    stdout, stderr, code = run_git(['remote', 'get-url', remote], cwd)

    if code != 0:
        return None

    return stdout


def parse_github_repo(remote_url: str) -> Optional[Tuple[str, str]]:
    """
    Parse owner and repo from a GitHub remote URL.

    Args:
        remote_url: Git remote URL

    Returns:
        Tuple of (owner, repo) or None if not a GitHub URL
    """
    # Handle SSH URLs: git@github.com:owner/repo.git
    ssh_match = re.match(r'git@github\.com:([^/]+)/(.+?)(?:\.git)?$', remote_url)
    if ssh_match:
        return ssh_match.group(1), ssh_match.group(2)

    # Handle HTTPS URLs: https://github.com/owner/repo.git
    https_match = re.match(r'https://github\.com/([^/]+)/(.+?)(?:\.git)?$', remote_url)
    if https_match:
        return https_match.group(1), https_match.group(2)

    return None


def main():
    """CLI interface for git operations."""
    if len(sys.argv) < 2:
        print('Usage: git_ops.py <command> [args]')
        print('Commands:')
        print('  branch <name> [base]    Create and checkout new branch')
        print('  commit <message>        Stage all and commit')
        print('  push [remote] [branch]  Push to remote')
        print('  current                 Show current branch')
        print('  clean                   Check if working directory is clean')
        sys.exit(1)

    try:
        command = sys.argv[1]

        if command == 'branch':
            if len(sys.argv) < 3:
                print('Usage: git_ops.py branch <name> [base]')
                sys.exit(1)
            name = sys.argv[2]
            base = sys.argv[3] if len(sys.argv) > 3 else 'main'
            result = create_branch(name, base)
            print(f'Created and checked out branch: {result}')

        elif command == 'commit':
            if len(sys.argv) < 3:
                print('Usage: git_ops.py commit <message>')
                sys.exit(1)
            message = sys.argv[2]
            sha = commit(message)
            print(f'Created commit: {sha}')

        elif command == 'push':
            remote = sys.argv[2] if len(sys.argv) > 2 else 'origin'
            branch = sys.argv[3] if len(sys.argv) > 3 else None
            push(remote, branch)
            print(f'Pushed to {remote}')

        elif command == 'current':
            branch = get_current_branch()
            print(branch)

        elif command == 'clean':
            ensure_clean()
            print('Working directory is clean')

        else:
            print(f'Unknown command: {command}')
            sys.exit(1)

    except GitError as e:
        print(f'Git error: {e}', file=sys.stderr)
        sys.exit(e.returncode)


if __name__ == '__main__':
    main()
