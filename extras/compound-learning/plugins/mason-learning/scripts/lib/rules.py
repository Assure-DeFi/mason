#!/usr/bin/env python3
"""
Rules File Management

Manages the learned patterns rules file:
- Read existing patterns
- Write new patterns
- Check for duplicates
- Archive old patterns
"""

import re
from pathlib import Path
from typing import Optional


def get_rules_file() -> Path:
    """Get the path to the learned patterns rules file."""
    # Search upward for .claude directory
    current = Path.cwd()
    while current != current.parent:
        rules_dir = current / '.claude' / 'rules'
        if rules_dir.exists():
            return rules_dir / 'learned-patterns.md'
        current = current.parent

    # Fall back to current directory
    rules_dir = Path.cwd() / '.claude' / 'rules'
    rules_dir.mkdir(parents=True, exist_ok=True)
    return rules_dir / 'learned-patterns.md'


def ensure_rules_file_exists(rules_path: Optional[Path] = None) -> Path:
    """Ensure the rules file exists with proper header."""
    if rules_path is None:
        rules_path = get_rules_file()

    if not rules_path.exists():
        rules_path.parent.mkdir(parents=True, exist_ok=True)
        with open(rules_path, 'w') as f:
            f.write("""# Learned Patterns

Automatically extracted from observed retry patterns. Updated after each session.

These patterns help Claude avoid common mistakes by learning from previous errors.

---
""")

    return rules_path


def read_patterns(rules_path: Optional[Path] = None) -> str:
    """
    Read the current contents of the rules file.

    Args:
        rules_path: Path to rules file (uses default if None)

    Returns:
        File contents as string
    """
    if rules_path is None:
        rules_path = get_rules_file()

    rules_path = ensure_rules_file_exists(rules_path)

    with open(rules_path, 'r') as f:
        return f.read()


def extract_pattern_titles(content: str) -> list[str]:
    """
    Extract pattern titles from rules file content.

    Args:
        content: Rules file content

    Returns:
        List of pattern titles (e.g., ['Git: Verify Remote Before Push'])
    """
    # Match ### Category: Title
    pattern = r'^### ([^:]+): (.+)$'
    matches = re.findall(pattern, content, re.MULTILINE)
    return [f'{cat}: {title}' for cat, title in matches]


def is_duplicate(
    category: str,
    title: str,
    rules_path: Optional[Path] = None
) -> bool:
    """
    Check if a pattern already exists in the rules file.

    Args:
        category: Pattern category
        title: Pattern title
        rules_path: Path to rules file

    Returns:
        True if pattern exists, False otherwise
    """
    content = read_patterns(rules_path)
    pattern_id = f'{category}: {title}'
    existing = extract_pattern_titles(content)
    return pattern_id in existing


def write_pattern(
    pattern_entry: str,
    rules_path: Optional[Path] = None
) -> bool:
    """
    Append a new pattern to the rules file.

    Args:
        pattern_entry: Formatted pattern markdown
        rules_path: Path to rules file

    Returns:
        True if written successfully
    """
    if rules_path is None:
        rules_path = get_rules_file()

    rules_path = ensure_rules_file_exists(rules_path)

    with open(rules_path, 'a') as f:
        f.write(pattern_entry)

    return True


def count_patterns(rules_path: Optional[Path] = None) -> int:
    """
    Count the number of patterns in the rules file.

    Args:
        rules_path: Path to rules file

    Returns:
        Number of patterns
    """
    content = read_patterns(rules_path)
    return len(extract_pattern_titles(content))


def update_pattern_triggers(
    category: str,
    title: str,
    rules_path: Optional[Path] = None
) -> bool:
    """
    Update the trigger count for an existing pattern.

    Args:
        category: Pattern category
        title: Pattern title
        rules_path: Path to rules file

    Returns:
        True if updated, False if pattern not found
    """
    if rules_path is None:
        rules_path = get_rules_file()

    content = read_patterns(rules_path)
    pattern_id = f'{category}: {title}'

    # Find and update the pattern
    # Pattern format: **Confidence**: XX% | **Triggers**: N
    pattern = rf'(### {re.escape(pattern_id)}.*?Triggers\*\*: )(\d+)'

    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return False

    current_triggers = int(match.group(2))
    new_triggers = current_triggers + 1

    updated_content = content[:match.start(2)] + str(new_triggers) + content[match.end(2):]

    with open(rules_path, 'w') as f:
        f.write(updated_content)

    return True


def clear_patterns(rules_path: Optional[Path] = None, confirm: bool = True) -> bool:
    """
    Clear all patterns from the rules file.

    Args:
        rules_path: Path to rules file
        confirm: Whether to require confirmation (unused, for API compatibility)

    Returns:
        True if cleared successfully
    """
    if rules_path is None:
        rules_path = get_rules_file()

    # Recreate with just the header
    with open(rules_path, 'w') as f:
        f.write("""# Learned Patterns

Automatically extracted from observed retry patterns. Updated after each session.

These patterns help Claude avoid common mistakes by learning from previous errors.

---
""")

    return True


def get_patterns_summary(rules_path: Optional[Path] = None) -> dict:
    """
    Get a summary of patterns in the rules file.

    Args:
        rules_path: Path to rules file

    Returns:
        Dict with pattern counts by category
    """
    content = read_patterns(rules_path)
    titles = extract_pattern_titles(content)

    categories: dict[str, int] = {}
    for title in titles:
        if ':' in title:
            category = title.split(':')[0].strip()
            categories[category] = categories.get(category, 0) + 1

    return {
        'total': len(titles),
        'by_category': categories,
        'patterns': titles
    }
