#!/usr/bin/env python3
"""
Analyze Session Hook (Stop)

This hook runs when a Claude Code session ends.
It analyzes the session for learning opportunities and updates the rules file.

Input: None (reads from state file)
Output: Prints summary to stderr (non-blocking)
"""

import sys
from pathlib import Path

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from state import load_state, delete_state, cleanup_old_sessions
from patterns import match_template, generate_pattern_entry
from rules import (
    is_duplicate,
    write_pattern,
    update_pattern_triggers,
    count_patterns,
    ensure_rules_file_exists
)


# Configuration
MIN_CONFIDENCE = 0.6  # Minimum confidence to create a pattern
MAX_PATTERNS_PER_SESSION = 5  # Maximum new patterns per session


def main():
    """Analyze session and extract learned patterns."""
    try:
        # Load session state
        state = load_state()

        if not state.learning_opportunities:
            # No learning opportunities, nothing to do
            cleanup_old_sessions(24)
            sys.exit(0)

        # Ensure rules file exists
        ensure_rules_file_exists()

        # Process learning opportunities
        patterns_created = 0
        patterns_updated = 0

        # Sort by confidence (highest first)
        opportunities = sorted(
            state.learning_opportunities,
            key=lambda x: x.confidence,
            reverse=True
        )

        for opp in opportunities:
            # Skip low-confidence opportunities
            if opp.confidence < MIN_CONFIDENCE:
                continue

            # Stop if we've created enough patterns this session
            if patterns_created >= MAX_PATTERNS_PER_SESSION:
                break

            # Try to match against a pattern template
            template_match = None
            for error_msg in opp.error_messages:
                template_match = match_template(error_msg)
                if template_match:
                    break

            if template_match:
                category = template_match['category']
                title = template_match['title']
                lesson = template_match['lesson']
            else:
                # Generate a generic pattern
                # Use the goal hash to determine category
                if opp.goal_hash.startswith('git_'):
                    category = 'Git'
                elif opp.goal_hash.startswith('npm_'):
                    category = 'NPM'
                elif opp.goal_hash.startswith('read_') or opp.goal_hash.startswith('write_'):
                    category = 'FileSystem'
                else:
                    category = 'General'

                title = f'Retry Pattern: {opp.goal_hash}'
                lesson = (
                    f'This operation required {opp.failures} retries to succeed. '
                    f'Consider verifying prerequisites before attempting this operation.'
                )

            # Check if pattern already exists
            if is_duplicate(category, title):
                # Update trigger count
                if update_pattern_triggers(category, title):
                    patterns_updated += 1
            else:
                # Create new pattern
                pattern_entry = generate_pattern_entry(
                    category=category,
                    title=title,
                    lesson=lesson,
                    confidence=opp.confidence,
                    triggers=opp.failures
                )

                if write_pattern(pattern_entry):
                    patterns_created += 1

        # Clean up state file
        delete_state(state.session_id)

        # Clean up old state files
        cleanup_old_sessions(24)

        # Print summary to stderr (informational only)
        total_patterns = count_patterns()
        if patterns_created > 0 or patterns_updated > 0:
            print(
                f'\n\u26a1 Mason learned {patterns_created} new pattern(s) this session.',
                file=sys.stderr
            )
            if patterns_updated > 0:
                print(
                    f'   Updated {patterns_updated} existing pattern(s).',
                    file=sys.stderr
                )
            print(
                f'   Total patterns: {total_patterns}',
                file=sys.stderr
            )
            print(
                '   Run /mason patterns to view.',
                file=sys.stderr
            )

    except Exception as e:
        # Log errors but don't fail
        print(f'Pattern learning analyze error: {e}', file=sys.stderr)
        sys.exit(0)


if __name__ == '__main__':
    main()
