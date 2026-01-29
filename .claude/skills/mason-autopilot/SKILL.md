# Mason Auto-Pilot Skill

Automatically execute approved backlog items, creating PRs for review. This skill enables autonomous improvement execution with quality gates and learning.

## Triggers

- `/mason auto-pilot` - Execute approved items
- `/mason auto-pilot --dry-run` - Preview without execution
- `/mason auto-pilot --single` - Execute only the highest-priority item
- `/mason auto-pilot --max N` - Execute up to N items (default: 3)

## Overview

Auto-Pilot fetches approved items from the Mason backlog, executes them one by one, and creates PRs. Each execution includes:

1. Branch creation
2. Task execution based on PRD
3. Quality checks (typecheck, tests)
4. PR creation

## Prerequisites

Before running auto-pilot, ensure:

1. `mason.config.json` exists with valid credentials
2. Items have been approved in the backlog
3. Git is configured with push access

## Usage Modes

### Dry Run (Recommended First)

```
/mason auto-pilot --dry-run
```

Shows what would be executed without making changes. Use this to verify the execution plan.

### Single Item Execution

```
/mason auto-pilot --single
```

Executes only the highest-priority approved item. Safest mode for building trust.

### Batch Execution

```
/mason auto-pilot
/mason auto-pilot --max 5
```

Executes multiple items (default: 3, max: 10). Each item gets its own branch and PR.

## Execution Process

### Step 1: Load Configuration

Read `mason.config.json` from the project root:

```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ...",
  "apiKey": "mason_xxx",
  "autoPilot": {
    "enabled": true,
    "maxItemsPerRun": 3,
    "branchPrefix": "work/mason-",
    "qualityChecks": ["npm run typecheck", "npm test"]
  }
}
```

### Step 2: Identify Current Repository

**CRITICAL: Auto-pilot MUST automatically detect and filter by the current repository.**

1. Get the git remote URL:

```bash
GIT_REMOTE=$(git remote get-url origin)
```

2. Query Supabase for the repository ID (uses credentials from mason.config.json):

```bash
# Extract Supabase URL and key from config
SUPABASE_URL=$(jq -r '.supabaseUrl' mason.config.json)
SUPABASE_KEY=$(jq -r '.supabaseAnonKey' mason.config.json)

# Query for repository by clone URL
REPO_ID=$(curl -s "${SUPABASE_URL}/rest/v1/mason_github_repositories?select=id&github_clone_url=eq.${GIT_REMOTE}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].id // empty')
```

3. If no matching repository is found:
   - Display error: "This repository is not connected to Mason"
   - Instruct user to connect the repository via the Mason dashboard
   - Exit the command

### Step 3: Fetch Approved Items

Call the Mason API to get approved items **for the current repository only**:

```bash
python .claude/skills/mason-autopilot/scripts/fetch_next_item.py --repo $REPO_ID
```

This returns items:

- Filtered to the current repository (prevents cross-repo execution)
- Sorted by priority_score (highest first)

### Step 4: For Each Item

#### 4.1 Mark as In Progress

Call the start API:

```bash
python .claude/skills/mason-autopilot/scripts/lib/mason_api.py start <item_id> <branch_name>
```

#### 4.2 Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b work/mason-<slug>
```

Branch naming convention:

- `work/mason-add-user-avatar` (feature)
- `work/mason-fix-login-error` (fix)
- `work/mason-refactor-api-calls` (refactor)

#### 4.3 Generate Implementation Tasks

Read the item's PRD or generate tasks from the problem/solution:

If PRD exists (`prd_content` is not null):

- Parse the PRD for task breakdown
- Execute tasks wave by wave

If no PRD:

- Generate tasks inline from problem/solution
- Use the standard wave pattern (Explore → Implement → Review)

#### 4.4 Execute Tasks

Use the Task tool with appropriate subagent types:

```
Wave 1: Exploration (parallel)
- Explore: Find existing patterns
- Explore: Understand architecture

Wave 2: Implementation (parallel)
- general-purpose: Implement the solution
- general-purpose: Write tests

Wave 3: Review
- code-reviewer: Review all changes
```

#### 4.5 Run Quality Checks

Execute all quality checks from config:

```bash
npm run typecheck  # Must pass
npm test          # Must pass
npm run build     # Should pass
```

**If quality checks fail:**

1. Analyze the error output
2. Fix the issues (up to 5 iterations)
3. Re-run quality checks
4. If still failing after 5 attempts, mark item as failed

#### 4.6 Commit Changes

```bash
git add .
git commit -m "feat: <item title>

<problem summary>

Implements: MASON-<item-id>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 4.7 Push and Create PR

```bash
git push origin HEAD
gh pr create --title "<item title>" --body "..."
```

PR body template:

```markdown
## Summary

<Brief description from item solution>

## Problem

<From item.problem>

## Solution

<From item.solution>

## Test Plan

- [ ] TypeScript check passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Manual verification

---

Generated with [Claude Code](https://claude.com/code)

Implements: MASON-<item-id>
```

#### 4.8 Mark as Completed

```bash
python .claude/skills/mason-autopilot/scripts/lib/mason_api.py complete <item_id> <pr_url>
```

### Step 5: Summary

After all items are processed, output a summary:

```
╔════════════════════════════════════════════════════════════════════╗
║  MASON AUTO-PILOT COMPLETE                                          ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ✓ 3 items executed successfully                                    ║
║  ✓ 3 PRs created                                                    ║
║                                                                     ║
║  PRs Ready for Review:                                              ║
║  • https://github.com/user/repo/pull/123                            ║
║  • https://github.com/user/repo/pull/124                            ║
║  • https://github.com/user/repo/pull/125                            ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

## Error Handling

### No Approved Items

```
No approved items to execute.
Approve items at: https://mason.assuredefi.com/admin/backlog
```

### Quality Check Failure

```
Quality check failed on item "Add user avatar":
  npm test exited with code 1

Fix iteration 1/5: Analyzing test failures...
[attempts to fix]

Fix iteration 2/5: Still failing, trying alternative approach...
[attempts to fix]

✓ Quality checks pass on iteration 2
```

### API Authentication Error

```
GitHub authentication required.
Run: gh auth login
```

### Network Error

```
Network error connecting to Mason API.
Check your internet connection and try again.
```

## Configuration Options

| Option                     | Type     | Default               | Description                  |
| -------------------------- | -------- | --------------------- | ---------------------------- |
| `autoPilot.enabled`        | boolean  | true                  | Enable/disable auto-pilot    |
| `autoPilot.maxItemsPerRun` | number   | 3                     | Max items to execute per run |
| `autoPilot.branchPrefix`   | string   | "work/mason-"         | Branch name prefix           |
| `autoPilot.qualityChecks`  | string[] | ["npm run typecheck"] | Commands to run              |
| `autoPilot.autoCreatePr`   | boolean  | true                  | Auto-create PRs              |

## Scripts

This skill uses the following helper scripts:

| Script               | Purpose                       |
| -------------------- | ----------------------------- |
| `fetch_next_item.py` | Fetch approved items from API |
| `lib/mason_api.py`   | Mason API client              |
| `lib/git_ops.py`     | Cross-platform git operations |
| `create_pr.py`       | Create GitHub PR              |

## Integration with Pattern Learning

Auto-pilot works alongside pattern learning. During execution:

1. PostToolUse hooks track tool results
2. Retry patterns are detected
3. Patterns are saved to `.claude/rules/learned-patterns.md`
4. Future sessions benefit from learned patterns

## Security Considerations

- Never commit secrets (check for .env, credentials)
- Validate API responses before using
- Use branch protection (no direct commits to main)
- Quality gates prevent broken PRs

## Troubleshooting

### "Item already in progress"

Another auto-pilot run may be active. Wait or manually reset the item status.

### "Python not found"

Install Python 3.9+:

- macOS: `brew install python@3.11`
- Windows: Download from python.org
- Linux: `sudo apt install python3`

### "gh CLI not found"

Install GitHub CLI:

- macOS: `brew install gh`
- Windows: `winget install --id GitHub.cli`
- Linux: See https://github.com/cli/cli#installation
