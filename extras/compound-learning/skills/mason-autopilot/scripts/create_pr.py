#!/usr/bin/env python3
"""
Create PR Script

Creates a GitHub PR for the current branch using gh CLI.
Falls back to providing a manual URL if gh is not available.

Usage:
    python create_pr.py --title "PR Title" --body "PR Body" [--base main]

Options:
    --title   PR title (required)
    --body    PR body/description (required)
    --base    Base branch (default: main)
    --draft   Create as draft PR
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional, Tuple

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from git_ops import get_current_branch, get_remote_url, parse_github_repo, GitError


def check_gh_available() -> bool:
    """Check if gh CLI is available and authenticated."""
    try:
        result = subprocess.run(
            ['gh', 'auth', 'status'],
            capture_output=True,
            text=True,
            shell=False
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def create_pr_with_gh(
    title: str,
    body: str,
    base: str = 'main',
    draft: bool = False
) -> Tuple[str, str]:
    """
    Create a PR using gh CLI.

    Returns:
        Tuple of (pr_url, pr_number)
    """
    args = [
        'gh', 'pr', 'create',
        '--title', title,
        '--body', body,
        '--base', base,
    ]

    if draft:
        args.append('--draft')

    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        shell=False
    )

    if result.returncode != 0:
        error_msg = result.stderr or result.stdout
        raise RuntimeError(f'Failed to create PR: {error_msg}')

    # gh pr create outputs the PR URL
    pr_url = result.stdout.strip()

    # Extract PR number from URL
    pr_number = pr_url.split('/')[-1] if '/' in pr_url else ''

    return pr_url, pr_number


def get_manual_pr_url(owner: str, repo: str, branch: str, base: str = 'main') -> str:
    """Generate a URL for creating a PR manually via GitHub web UI."""
    return f'https://github.com/{owner}/{repo}/compare/{base}...{branch}?expand=1'


def main():
    """Create a PR or provide manual URL."""
    # Parse arguments
    title = None
    body = None
    base = 'main'
    draft = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--title' and i + 1 < len(args):
            title = args[i + 1]
            i += 2
        elif args[i] == '--body' and i + 1 < len(args):
            body = args[i + 1]
            i += 2
        elif args[i] == '--base' and i + 1 < len(args):
            base = args[i + 1]
            i += 2
        elif args[i] == '--draft':
            draft = True
            i += 1
        elif args[i] in ('-h', '--help'):
            print(__doc__)
            sys.exit(0)
        else:
            print(f'Unknown argument: {args[i]}', file=sys.stderr)
            sys.exit(1)

    if not title:
        print('Error: --title is required', file=sys.stderr)
        sys.exit(1)

    if not body:
        print('Error: --body is required', file=sys.stderr)
        sys.exit(1)

    try:
        # Get current branch
        current_branch = get_current_branch()

        # Get remote URL
        remote_url = get_remote_url('origin')
        if not remote_url:
            raise RuntimeError('Could not get remote URL for origin')

        # Parse GitHub repo info
        repo_info = parse_github_repo(remote_url)
        if not repo_info:
            raise RuntimeError(f'Could not parse GitHub repo from URL: {remote_url}')

        owner, repo = repo_info

        # Check if gh is available
        if check_gh_available():
            # Create PR using gh
            pr_url, pr_number = create_pr_with_gh(title, body, base, draft)

            result = {
                'success': True,
                'pr_url': pr_url,
                'pr_number': pr_number,
                'method': 'gh_cli'
            }
        else:
            # Fall back to manual URL
            manual_url = get_manual_pr_url(owner, repo, current_branch, base)

            result = {
                'success': False,
                'manual_url': manual_url,
                'method': 'manual',
                'message': 'gh CLI not available. Open the URL above to create the PR manually.'
            }

        print(json.dumps(result, indent=2))
        sys.exit(0 if result['success'] else 0)  # Both are "successful" outcomes

    except GitError as e:
        error_result = {
            'success': False,
            'error': f'Git error: {e}',
            'method': 'none'
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'method': 'none'
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
