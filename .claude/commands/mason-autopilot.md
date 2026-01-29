# Mason Auto-Pilot Command

Execute approved backlog items autonomously, creating PRs for review.

## Usage

```
/mason auto-pilot [options]
```

## Options

| Option      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `--dry-run` | Preview what would be executed without making changes |
| `--single`  | Execute only the highest-priority approved item       |
| `--max N`   | Execute up to N items (default: 3, max: 10)           |

## Examples

```
/mason auto-pilot --dry-run     # Preview execution plan
/mason auto-pilot --single      # Execute one item
/mason auto-pilot               # Execute up to 3 items
/mason auto-pilot --max 5       # Execute up to 5 items
```

## What Happens

When you run auto-pilot, Claude will:

1. **Fetch approved items** from your Mason backlog (highest priority first)
2. **For each item**:
   - Mark it as "in progress"
   - Create a feature branch
   - Generate implementation tasks from the PRD
   - Execute tasks wave by wave
   - Run quality checks (typecheck, tests)
   - Commit and push changes
   - Create a PR
   - Mark item as "completed"
3. **Output a summary** with PR links

## Required Configuration

Auto-pilot reads from `mason.config.json`:

```json
{
  "apiKey": "mason_xxx",
  "autoPilot": {
    "enabled": true,
    "maxItemsPerRun": 3,
    "branchPrefix": "work/mason-",
    "qualityChecks": ["npm run typecheck", "npm test"]
  }
}
```

## Prerequisites

- Python 3.9+ installed
- Git configured with push access
- Items approved in the Mason backlog
- Optional: `gh` CLI for automatic PR creation

## Error Handling

- **No approved items**: Prompts to approve items in dashboard
- **Quality check fails**: Attempts auto-fix up to 5 times
- **Network error**: Retries with backoff
- **PR creation fails**: Preserves branch for manual PR creation

## Skill Reference

This command uses the `mason-autopilot` skill defined in:
`.claude/skills/mason-autopilot/SKILL.md`

## Related Commands

- `/pm-review` - Generate improvement suggestions
- `/execute-approved` - Manual execution with more control
- `/mason patterns` - View learned patterns
