# Execute Approved Command

Execute approved items from the PM backlog using wave-based parallel execution.

## Overview

This command implements approved improvements from the backlog. It uses the Task tool with appropriate subagent types to execute work in parallel waves for maximum efficiency.

## Usage

```
/execute-approved [options]
```

Options:

- `--item <id>`: Execute a specific item by ID
- `--limit <n>`: Maximum number of items to execute (default: 5)
- `--dry-run`: Show execution plan without making changes

Examples:

- `/execute-approved` - Execute up to 5 approved items
- `/execute-approved --item abc123` - Execute specific item
- `/execute-approved --limit 3` - Execute top 3 approved items
- `/execute-approved --dry-run` - Preview execution plan

## Process

### Step 1: Fetch Approved Items

Query Supabase for approved items:

```sql
SELECT * FROM pm_backlog_items
WHERE status = 'approved'
ORDER BY priority_score DESC
LIMIT $limit;
```

### Step 2: Verify PRDs Exist

For each approved item, verify it has a PRD:

- If `prd_content` is NULL, prompt user to generate PRD first
- PRD should contain wave-based task breakdown

### Step 3: Create Execution Run

```sql
INSERT INTO pm_execution_runs (
  status,
  item_count,
  started_at
) VALUES (
  'in_progress',
  $count,
  now()
) RETURNING id;
```

### Step 4: Build Wave-Based Execution Plan

Parse each PRD to extract waves and tasks. Structure:

```markdown
## Execution Plan

### Wave 1: Foundation (Parallel)

| Task | Subagent | Description                  |
| ---- | -------- | ---------------------------- |
| 1.1  | Explore  | Understand existing patterns |
| 1.2  | Explore  | Find related files           |

### Wave 2: Implementation (Parallel)

Blocked by: Wave 1
| Task | Subagent | Description |
|------|----------|-------------|
| 2.1 | general-purpose | Implement feature A |
| 2.2 | general-purpose | Implement feature B |

### Wave 3: Validation

Blocked by: Wave 2
| Task | Subagent | Description |
|------|----------|-------------|
| 3.1 | code-reviewer | Review all changes |
```

### Step 5: Create Feature Branch

For each item, create a feature branch:

```bash
git checkout -b mason/<item-slug>
```

Naming convention:

- `mason/add-user-avatar-upload`
- `mason/fix-login-validation`
- `mason/refactor-api-error-handling`

### Step 5.1: Mark Item In Progress (MANDATORY)

**Before beginning implementation**, update the item status to `in_progress` via Supabase REST API. This enables real-time status updates in the dashboard.

```bash
# Read config
SUPABASE_URL=$(jq -r '.supabaseUrl' mason.config.json)
SUPABASE_KEY=$(jq -r '.supabaseAnonKey' mason.config.json)

# Update status to in_progress
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "in_progress", "branch_name": "mason/<slug>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
```

This update will appear **immediately** in the dashboard via real-time subscription. The item moves from "Approved" tab to "In Progress" tab.

### Step 6: Execute Waves

Execute each wave using the Task tool:

```typescript
// Wave 1 - All tasks in parallel
await Promise.all([
  Task({ subagent_type: 'Explore', prompt: '...' }),
  Task({ subagent_type: 'Explore', prompt: '...' }),
]);

// Wave 2 - Blocked by Wave 1, run in parallel
await Promise.all([
  Task({ subagent_type: 'general-purpose', prompt: '...' }),
  Task({ subagent_type: 'general-purpose', prompt: '...' }),
]);

// Wave 3 - Blocked by Wave 2
await Task({ subagent_type: 'code-reviewer', prompt: '...' });
```

**Subagent Types:**

| Type              | Use When                                     |
| ----------------- | -------------------------------------------- |
| `Explore`         | Finding patterns, understanding architecture |
| `general-purpose` | Implementation, complex multi-step work      |
| `Bash`            | Running commands, tests, builds              |
| `code-reviewer`   | Reviewing changes, checking standards        |
| `frontend-design` | UI/UX work, component styling                |

### Step 7: Track Task Progress

For each task, create a record:

```sql
INSERT INTO pm_execution_tasks (
  run_id,
  item_id,
  wave_number,
  task_number,
  description,
  subagent_type,
  status
) VALUES (
  $runId,
  $itemId,
  1,
  1,
  'Understand existing patterns',
  'Explore',
  'pending'
);
```

Update status as tasks complete:

```sql
UPDATE pm_execution_tasks
SET status = 'completed', completed_at = now()
WHERE id = $taskId;
```

### Step 8: Commit Changes

After each item is complete:

```bash
git add .
git commit -m "feat: [item title]

[Brief description of changes]

Implements: PM-<item-id>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 8.1: Mark Item Completed (MANDATORY)

**After successful commit**, update the item status to `completed` via Supabase REST API:

```bash
# Update status to completed
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "completed", "pr_url": "<pr_url_if_created>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
```

This update will appear **immediately** in the dashboard. The item moves from "In Progress" tab to "Completed" tab.

### Step 9: Update Item Status

```sql
UPDATE pm_backlog_items
SET
  status = 'completed',
  branch_name = 'mason/<slug>',
  updated_at = now()
WHERE id = $itemId;
```

### Step 10: Complete Execution Run

```sql
UPDATE pm_execution_runs
SET
  status = 'success',
  completed_at = now()
WHERE id = $runId;
```

## Output Format

During execution, show progress:

```markdown
## Executing Approved Items

### Item 1: Add user avatar upload

**Branch**: `mason/add-user-avatar-upload`
**Status**: In Progress

#### Wave 1: Foundation

- [x] Explore existing image handling patterns
- [x] Find related components

#### Wave 2: Implementation

- [x] Create avatar upload component
- [ ] Add API endpoint (in progress...)

#### Wave 3: Validation

- [ ] Review all changes

---

### Progress Summary

- Items: 1/3 completed
- Tasks: 4/8 completed
- Current: Wave 2, Task 2
```

After completion:

```markdown
## Execution Complete

**Items Executed**: 3
**Total Tasks**: 24
**Time Elapsed**: 15 minutes
**Status**: Success

### Branches Created

| Item              | Branch                         | Status   |
| ----------------- | ------------------------------ | -------- |
| Add avatar upload | `mason/add-user-avatar-upload` | Complete |
| Fix validation    | `mason/fix-login-validation`   | Complete |
| Refactor errors   | `mason/refactor-api-errors`    | Complete |

### Next Steps

1. Review changes in each branch
2. Create PRs: `gh pr create --base main --head mason/<branch>`
3. Merge after review
```

## Error Handling

If a task fails:

1. Log the error with context
2. Update task status to 'failed'
3. Continue with remaining tasks (fail-forward)
4. Mark item as 'failed' if critical tasks fail
5. Provide clear error summary at end

```sql
UPDATE pm_execution_tasks
SET
  status = 'failed',
  error_message = $error,
  completed_at = now()
WHERE id = $taskId;
```

### Mark Item Failed (MANDATORY on Permanent Failure)

When execution fails permanently (after max retry iterations or unrecoverable error), update the item status to `rejected` via Supabase REST API:

```bash
# Update status to rejected (failed)
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "rejected", "failure_reason": "<error_summary>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
```

This update will appear **immediately** in the dashboard. The item moves to "Rejected" tab with the failure reason.

## Git Hygiene

- **Never force push** - Always use regular push
- **Never edit main directly** - All work on feature branches
- **Atomic commits** - One logical change per commit
- **Clean messages** - Follow conventional commit format
- **Include co-author** - Always add Claude co-author tag

## Supabase Connection

Read credentials from `mason.config.json`:

```json
{
  "supabase": {
    "url": "https://xxx.supabase.co",
    "anonKey": "eyJ..."
  }
}
```

## Important Notes

1. **Test after each wave** - Run tests to catch issues early
2. **Review before commit** - Use code-reviewer subagent
3. **Keep branches focused** - One item per branch
4. **Update progress** - Keep Supabase status current
5. **Handle failures gracefully** - Log and continue where possible
