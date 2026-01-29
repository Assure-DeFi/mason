#!/usr/bin/env python3
"""
Track Tool Hook (PostToolUse)

This hook runs after each tool invocation in Claude Code.
It tracks tool results to detect retry patterns.

Input (from stdin as JSON):
{
  "tool": "Bash",
  "result": "...",
  "error": "...",
  "success": true
}

Output: None (writes to state file)
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from state import load_state, save_state, ToolResult, LearningOpportunity
from patterns import compute_goal_hash, calculate_confidence


def main():
    """Track a tool result and update session state."""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            # No input, nothing to track
            sys.exit(0)

        try:
            event = json.loads(input_data)
        except json.JSONDecodeError:
            # Invalid JSON, skip silently
            sys.exit(0)

        # Extract tool information
        tool = event.get('tool', 'Unknown')
        result = event.get('result', '')
        error = event.get('error', '')
        success = event.get('success', True)

        # Some tools return structured results
        if isinstance(result, dict):
            result = json.dumps(result)

        # Determine the command/operation
        # For Bash, this is the command; for Read, the file path, etc.
        command = event.get('command', '') or event.get('input', '') or result[:100]

        # Load current session state
        state = load_state()

        # Compute goal hash for this operation
        goal_hash = compute_goal_hash(tool, command)

        # Create tool result record
        tool_result = ToolResult(
            tool=tool,
            command=command[:500],  # Limit command length
            success=success,
            error=error[:500] if error else None,
            goal_hash=goal_hash,
            timestamp=datetime.now().isoformat()
        )

        # Add to history
        state.tool_history.append(tool_result)

        # Check for learning opportunity
        # A learning opportunity is when we see:
        # 1. One or more failures with the same goal_hash
        # 2. Followed by a success with the same goal_hash
        if success:
            # Find recent failures with the same goal hash
            recent_failures = [
                t for t in state.tool_history[-20:]  # Look at last 20 operations
                if t.goal_hash == goal_hash and not t.success
            ]

            if len(recent_failures) >= 1:
                # We have a retry pattern!
                error_messages = [f.error for f in recent_failures if f.error]

                # Calculate confidence
                confidence = calculate_confidence(
                    len(recent_failures),
                    error_messages
                )

                # Check if we already have this learning opportunity
                existing = next(
                    (l for l in state.learning_opportunities
                     if l.goal_hash == goal_hash),
                    None
                )

                if existing:
                    # Update existing
                    existing.failures += len(recent_failures)
                    existing.success_command = command[:500]
                    existing.error_messages.extend(error_messages)
                    existing.confidence = max(existing.confidence, confidence)
                else:
                    # Create new learning opportunity
                    opportunity = LearningOpportunity(
                        goal_hash=goal_hash,
                        failures=len(recent_failures),
                        success_command=command[:500],
                        error_messages=error_messages[:5],  # Limit stored errors
                        confidence=confidence
                    )
                    state.learning_opportunities.append(opportunity)

        # Save updated state
        save_state(state)

    except Exception as e:
        # Log errors but don't fail the hook
        # Hooks should be non-blocking
        print(f'Pattern learning track error: {e}', file=sys.stderr)
        sys.exit(0)


if __name__ == '__main__':
    main()
