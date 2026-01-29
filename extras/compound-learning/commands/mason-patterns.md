# Mason Patterns Command

View and manage learned patterns from retry detection.

## Usage

```
/mason patterns [options]
```

## Options

| Option    | Description                                    |
| --------- | ---------------------------------------------- |
| `--clear` | Clear all learned patterns (with confirmation) |
| `--stats` | Show pattern statistics                        |

## Examples

```
/mason patterns          # List all learned patterns
/mason patterns --stats  # Show statistics
/mason patterns --clear  # Clear all patterns
```

## What It Does

This command reads from `.claude/rules/learned-patterns.md` and displays:

1. **Pattern list**: All learned patterns with confidence scores
2. **Categories**: Patterns grouped by type (Git, NPM, TypeScript, etc.)
3. **Triggers**: How many times each pattern was encountered

## Pattern Structure

Each pattern includes:

- **Category**: The type of operation (Git, NPM, TypeScript, etc.)
- **Title**: A descriptive title for the pattern
- **Confidence**: How confident we are in this pattern (0-100%)
- **Triggers**: Number of times this pattern was detected
- **Lesson**: The instruction to avoid this mistake in the future

## How Patterns Are Learned

Patterns are automatically detected during Claude sessions:

1. **PostToolUse Hook**: After each tool use, results are tracked
2. **Retry Detection**: When a tool fails then succeeds with the same goal
3. **Pattern Matching**: Errors are matched against known templates
4. **Session End**: Patterns are extracted and saved to rules file

## Pattern File Location

```
.claude/rules/learned-patterns.md
```

This file is read by Claude at the start of each session, helping avoid repeated mistakes.

## Manual Pattern Management

You can manually edit `.claude/rules/learned-patterns.md` to:

- Remove patterns that are no longer relevant
- Add custom patterns for project-specific knowledge
- Adjust confidence scores

## Related

- `/execute-approved` - Executes approved items (uses learned patterns)
- `/pm-review` - Generates improvement suggestions
