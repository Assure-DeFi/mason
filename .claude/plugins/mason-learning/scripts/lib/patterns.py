#!/usr/bin/env python3
"""
Pattern Detection

Utilities for detecting and classifying retry patterns:
- Goal hash computation (groups related operations)
- Pattern template matching
- Confidence calculation
"""

import hashlib
import re
from typing import Optional


# Pattern templates for common error scenarios
PATTERN_TEMPLATES = {
    'git_push': {
        'indicators': [
            'origin', 'remote', 'does not appear',
            'permission denied', 'fatal:', 'rejected'
        ],
        'category': 'Git',
        'title_template': 'Verify Remote Before Push',
        'lesson_template': (
            'Before running `git push`, verify the remote is configured with '
            '`git remote -v`. If no remote exists, add one with '
            '`git remote add origin <url>`.'
        )
    },
    'git_auth': {
        'indicators': [
            'gh auth', 'credential', '401', 'authentication',
            'could not read Username', 'Permission denied'
        ],
        'category': 'Git',
        'title_template': 'Check GitHub Authentication',
        'lesson_template': (
            'Run `gh auth status` to verify GitHub CLI authentication before '
            'git operations that require credentials.'
        )
    },
    'git_branch': {
        'indicators': [
            'already exists', 'did not match any', 'not a valid ref',
            'cannot checkout', 'branch -d'
        ],
        'category': 'Git',
        'title_template': 'Verify Branch Status Before Checkout',
        'lesson_template': (
            'Before checking out or creating branches, run `git branch -a` to '
            'see existing local and remote branches.'
        )
    },
    'npm_install': {
        'indicators': [
            'EACCES', 'permission denied', 'ENOENT', 'npm ERR!',
            'could not resolve', 'peer dep'
        ],
        'category': 'NPM',
        'title_template': 'Check Node Modules Permissions',
        'lesson_template': (
            'If npm install fails, try: (1) Delete node_modules and '
            'package-lock.json, (2) Run `npm cache clean --force`, '
            '(3) Run `npm install` again.'
        )
    },
    'npm_script': {
        'indicators': [
            'npm run', 'script not found', 'missing script',
            'command not found', 'exit code'
        ],
        'category': 'NPM',
        'title_template': 'Verify npm Scripts Exist',
        'lesson_template': (
            'Before running `npm run <script>`, check available scripts with '
            '`npm run` or look at package.json scripts section.'
        )
    },
    'npm_typecheck': {
        'indicators': [
            'Property', 'does not exist on type', 'Type error',
            'Cannot find name', 'is not assignable', 'TS2'
        ],
        'category': 'TypeScript',
        'title_template': 'Check Type Definitions Before Property Access',
        'lesson_template': (
            'Before accessing properties on objects, verify the type definition '
            'includes that property. Use optional chaining (`?.`) for potentially '
            'undefined properties.'
        )
    },
    'file_not_found': {
        'indicators': [
            'no such file', 'ENOENT', 'file not found',
            'cannot open', 'does not exist'
        ],
        'category': 'FileSystem',
        'title_template': 'Verify File Exists Before Operations',
        'lesson_template': (
            'Before reading or modifying a file, verify it exists. Use `ls` or '
            'the Glob tool to check file paths.'
        )
    },
    'supabase_query': {
        'indicators': [
            'relation', 'does not exist', 'column', 'supabase',
            'PGRST', 'postgrest', 'row level security'
        ],
        'category': 'Supabase',
        'title_template': 'Verify Table Schema Before Queries',
        'lesson_template': (
            'Before querying Supabase tables, verify the table exists and '
            'check column names in the schema. Use `.select()` to specify '
            'only the columns you need.'
        )
    },
    'python_import': {
        'indicators': [
            'ModuleNotFoundError', 'ImportError', 'No module named',
            'cannot import'
        ],
        'category': 'Python',
        'title_template': 'Verify Python Dependencies',
        'lesson_template': (
            'Before importing Python modules, ensure they are installed. '
            'Check requirements.txt or run `pip list` to see installed packages.'
        )
    },
    'path_not_found': {
        'indicators': [
            'directory not found', 'no such directory',
            'mkdir', 'ENOENT', 'not a directory'
        ],
        'category': 'FileSystem',
        'title_template': 'Create Parent Directories First',
        'lesson_template': (
            'Before creating files in nested directories, ensure parent '
            'directories exist. Use `mkdir -p` to create parent directories.'
        )
    }
}


def compute_goal_hash(tool: str, command: str) -> str:
    """
    Compute a hash that groups related operations.

    This allows us to detect retry patterns by grouping operations
    that are attempting the same goal (e.g., multiple git push attempts).

    Args:
        tool: Tool name (e.g., 'Bash', 'Read')
        command: The command or operation

    Returns:
        A goal hash string
    """
    if tool == 'Bash':
        # Group git operations
        if 'git push' in command or 'git pull' in command:
            return 'git_push'
        if 'git remote' in command:
            return 'git_remote'
        if 'git checkout' in command or 'git branch' in command:
            return 'git_branch'
        if 'git clone' in command:
            return 'git_clone'

        # Group npm operations
        if 'npm install' in command or 'npm ci' in command:
            return 'npm_install'
        if 'npm test' in command or 'npm run test' in command:
            return 'npm_test'
        if 'npm run typecheck' in command or 'tsc' in command:
            return 'npm_typecheck'
        if 'npm run' in command:
            # Extract script name
            match = re.search(r'npm run (\S+)', command)
            if match:
                return f'npm_run_{match.group(1)}'

        # Group Python operations
        if 'python' in command or 'pip' in command:
            return 'python_exec'

        # Group file operations
        if any(cmd in command for cmd in ['mkdir', 'touch', 'rm', 'cp', 'mv']):
            return 'file_ops'

        # Default: hash the command
        cmd_hash = hashlib.md5(command.encode()).hexdigest()[:8]
        return f'bash_{cmd_hash}'

    if tool == 'Read':
        # Group reads by file path pattern
        path_hash = hashlib.md5(command.encode()).hexdigest()[:8]
        return f'read_{path_hash}'

    if tool == 'Write':
        path_hash = hashlib.md5(command.encode()).hexdigest()[:8]
        return f'write_{path_hash}'

    if tool == 'Edit':
        path_hash = hashlib.md5(command.encode()).hexdigest()[:8]
        return f'edit_{path_hash}'

    if tool == 'Glob':
        return 'glob_search'

    if tool == 'Grep':
        return 'grep_search'

    # Default: hash tool + command
    combined = f'{tool}:{command}'
    combined_hash = hashlib.md5(combined.encode()).hexdigest()[:8]
    return f'{tool.lower()}_{combined_hash}'


def match_template(error_message: str) -> Optional[dict]:
    """
    Match an error message against pattern templates.

    Args:
        error_message: The error output to match

    Returns:
        Matching template dict or None
    """
    if not error_message:
        return None

    error_lower = error_message.lower()

    for template_key, template in PATTERN_TEMPLATES.items():
        # Check if any indicators match
        matches = sum(
            1 for indicator in template['indicators']
            if indicator.lower() in error_lower
        )

        # Require at least 2 indicator matches for confidence
        if matches >= 2:
            return {
                'key': template_key,
                'category': template['category'],
                'title': template['title_template'],
                'lesson': template['lesson_template'],
                'match_count': matches
            }

    return None


def calculate_confidence(failures: int, error_messages: list[str]) -> float:
    """
    Calculate confidence score for a learning opportunity.

    Args:
        failures: Number of failures before success
        error_messages: List of error messages from failures

    Returns:
        Confidence score between 0.0 and 1.0
    """
    # Base confidence from failure count
    # 2 failures = 0.6, 3 = 0.7, 4+ = 0.8
    base_confidence = min(0.4 + (failures * 0.1), 0.8)

    # Bonus for pattern template match
    template_match = any(
        match_template(msg) for msg in error_messages
    )
    if template_match:
        base_confidence += 0.1

    # Bonus for consistent error messages
    if len(set(error_messages)) == 1 and len(error_messages) > 1:
        base_confidence += 0.05

    return min(base_confidence, 0.95)


def generate_pattern_entry(
    category: str,
    title: str,
    lesson: str,
    confidence: float,
    triggers: int = 1
) -> str:
    """
    Generate a markdown entry for the learned patterns file.

    Args:
        category: Pattern category (e.g., 'Git', 'TypeScript')
        title: Pattern title
        lesson: The lesson learned
        confidence: Confidence score (0.0-1.0)
        triggers: Number of times this pattern was triggered

    Returns:
        Markdown formatted pattern entry
    """
    confidence_pct = int(confidence * 100)

    return f"""
### {category}: {title}

**Confidence**: {confidence_pct}% | **Triggers**: {triggers} | **Learned**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}

{lesson}

---
"""
