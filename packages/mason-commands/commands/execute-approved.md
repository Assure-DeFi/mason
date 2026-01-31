---
name: execute-approved
version: 1.4.0
description: Execute Approved Command
---

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
- `--limit <n>`: Maximum number of items to execute (optional, no limit by default)
- `--dry-run`: Show execution plan without making changes
- `--auto`: Run in headless mode for autopilot execution (skips confirmations, outputs machine-readable status)

Examples:

- `/execute-approved` - Execute ALL approved items
- `/execute-approved --item abc123` - Execute specific item
- `/execute-approved --limit 3` - Execute top 3 approved items
- `/execute-approved --dry-run` - Preview execution plan
- `/execute-approved --auto` - Execute all approved items in headless mode (for autopilot)

## Process

### Pre-Check: Version Enforcement (AUTO-UPDATE)

Run this version check **FIRST** before any other operation:

```bash
# === VERSION ENFORCEMENT (AUTO-UPDATE) ===
COMMAND_NAME="execute-approved"
LOCAL_VERSION=$(grep -m1 "^version:" ".claude/commands/${COMMAND_NAME}.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
REMOTE=$(curl -fsSL --connect-timeout 3 "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/versions.json" 2>/dev/null)
REMOTE_VERSION=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".version // \"\"" 2>/dev/null)
REQUIRED_MIN=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".required_minimum // \"\"" 2>/dev/null)
BREAKING_REASON=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".breaking_reason // \"\"" 2>/dev/null)

# Check if below required minimum
VERSION_OUTDATED=false
if [ -n "$REQUIRED_MIN" ] && [ -n "$LOCAL_VERSION" ]; then
  if [ "$(printf '%s\n' "$REQUIRED_MIN" "$LOCAL_VERSION" | sort -V | head -n1)" = "$LOCAL_VERSION" ] && \
     [ "$LOCAL_VERSION" != "$REQUIRED_MIN" ]; then
    VERSION_OUTDATED=true
    echo "⚠️  Command outdated: v${LOCAL_VERSION} → v${REQUIRED_MIN} required"
    [ -n "$BREAKING_REASON" ] && echo "   Reason: $BREAKING_REASON"
    echo "   Auto-updating..."
  fi
fi
# === END VERSION ENFORCEMENT ===
```

**CRITICAL: If `VERSION_OUTDATED=true`, you MUST:**

1. **Immediately invoke `/mason-update`** using the Skill tool
2. **Wait for update to complete**
3. **Re-read this command file** (it will have new content)
4. **Continue execution** with the updated command

Do NOT ask the user - just auto-update and continue.

---

### Auto Mode Detection

**Check if `--auto` flag is present in the command arguments.**

```bash
# Parse arguments for --auto flag
AUTO_MODE=false
if echo "$*" | grep -q '\-\-auto'; then
  AUTO_MODE=true
  echo "AUTOPILOT_MODE: Running in headless mode"
fi
```

**When AUTO_MODE is true:**

- Skip ALL user confirmations
- Output machine-readable status lines prefixed with `AUTOPILOT_STATUS:`
- Continue execution without waiting for user input
- Report detailed progress for dashboard monitoring

**Autopilot Status Line Format:**

```
AUTOPILOT_STATUS: {"phase": "starting", "items_count": 5}
AUTOPILOT_STATUS: {"phase": "executing", "item_id": "xxx", "item_title": "...", "progress": "1/5"}
AUTOPILOT_STATUS: {"phase": "validating", "item_id": "xxx", "check": "typescript"}
AUTOPILOT_STATUS: {"phase": "complete", "items_executed": 5, "prs_created": 5}
AUTOPILOT_STATUS: {"phase": "error", "message": "...", "item_id": "xxx"}
```

---

### Step 1: Fetch Approved Items

Query Supabase for ALL approved items (no limit unless explicitly specified):

```sql
-- When --limit is NOT specified: fetch ALL approved items
SELECT * FROM mason_pm_backlog_items
WHERE status = 'approved'
ORDER BY priority_score DESC;

-- When --limit IS specified: apply the limit
SELECT * FROM mason_pm_backlog_items
WHERE status = 'approved'
ORDER BY priority_score DESC
LIMIT $limit;
```

**IMPORTANT:** By default, execute ALL approved items. Only apply LIMIT when user explicitly passes `--limit <n>`.

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

**Before beginning implementation**, update the item status AND create a progress record for the BuildingTheater visualization.

```bash
# Read config
SUPABASE_URL=$(jq -r '.supabaseUrl' mason.config.json)
SUPABASE_KEY=$(jq -r '.supabaseAnonKey' mason.config.json)

# ==== LOGGING HELPER (MANDATORY) ====
# Use this function throughout execution to write logs to the dashboard
# IMPORTANT: Runs SYNCHRONOUSLY (no &) to ensure logs are actually written before continuing
log_execution() {
  local level="$1"   # debug, info, warn, error
  local message="$2"
  local metadata="${3:-{}}"  # optional JSON metadata

  # Write synchronously - wait for curl to complete so logs are confirmed written
  # Do NOT use & at the end - that would background the curl and potentially lose logs
  curl -s -X POST "${SUPABASE_URL}/rest/v1/mason_execution_logs" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '{
      "execution_run_id": "'"${RUN_ID}"'",
      "log_level": "'"${level}"'",
      "message": "'"${message}"'",
      "metadata": '"${metadata}"'
    }' > /dev/null
}
# ==== END LOGGING HELPER ====

# Update item status to in_progress
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "in_progress", "branch_name": "mason/<slug>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'

# Create execution progress record for BuildingTheater visualization
# This triggers the BuildingTheater to AUTO-APPEAR in the dashboard
curl -X POST "${SUPABASE_URL}/rest/v1/mason_execution_progress" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "item_id": "'"${itemId}"'",
    "current_phase": "site_review",
    "current_wave": 0,
    "total_waves": 4,
    "wave_status": "Starting execution...",
    "tasks_completed": 0,
    "tasks_total": 0,
    "validation_typescript": "pending",
    "validation_eslint": "pending",
    "validation_build": "pending",
    "validation_tests": "pending",
    "started_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
```

This update will appear **immediately** in the dashboard:

- The item moves from "Approved" tab to "In Progress" tab
- The BuildingTheater modal auto-appears showing the construction animation

```bash
# Log execution start
log_execution "info" "Starting execution for: ${itemTitle}" '{"item_id": "'"${itemId}"'", "branch": "mason/'"${slug}"'"}'
```

### Step 5.2: Update Progress Throughout Execution (MANDATORY)

**Update the execution progress at key milestones** to drive the BuildingTheater visualization:

```bash
# Helper: Update progress at phase transitions
update_progress() {
  local phase=$1
  local wave=$2
  local status=$3
  local tasks_done=$4
  local tasks_total=$5

  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '{
      "current_phase": "'"${phase}"'",
      "current_wave": '"${wave}"',
      "wave_status": "'"${status}"'",
      "tasks_completed": '"${tasks_done}"',
      "tasks_total": '"${tasks_total}"',
      "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
    }'
}

# Phase transitions (call these as execution progresses):
# - "site_review" → Starting, analyzing PRD
# - "foundation"  → Wave 1 (Explore tasks)
# - "building"    → Wave 2+ (Implementation tasks)
# - "inspection"  → Validation phase
# - "complete"    → Done

# Example usage during execution:
update_progress "foundation" 1 "Exploring codebase patterns..." 0 2
log_execution "info" "Wave 1: Exploring codebase patterns" '{"wave": 1, "phase": "foundation"}'

update_progress "foundation" 1 "Found existing patterns" 1 2
log_execution "info" "Wave 1 complete: Found existing patterns" '{"wave": 1, "tasks_done": 1}'

update_progress "building" 2 "Implementing changes..." 0 3
log_execution "info" "Wave 2: Starting implementation" '{"wave": 2, "phase": "building"}'

update_progress "inspection" 3 "Running TypeScript check..." 0 4
log_execution "info" "Validation: Running TypeScript check" '{"phase": "inspection", "check": "typescript"}'
```

**Progress updates at each phase:**

| Phase         | When to Update                  | wave_status Example                  |
| ------------- | ------------------------------- | ------------------------------------ |
| `site_review` | Start of execution              | "Analyzing PRD and dependencies..."  |
| `foundation`  | Wave 1 starts (Explore tasks)   | "Exploring existing patterns..."     |
| `building`    | Wave 2+ starts (Implementation) | "Implementing feature components..." |
| `inspection`  | Validation phase starts         | "Running validation checks..."       |
| `complete`    | All validations pass            | "Build complete!"                    |

**Update validation status during inspection phase:**

```bash
# Update individual validation statuses as they run
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"validation_typescript": "running"}'

# After TypeScript passes:
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"validation_typescript": "pass", "validation_eslint": "running"}'
log_execution "info" "TypeScript check passed" '{"check": "typescript", "status": "pass"}'

# Continue for each validation check...
# Log validation results:
log_execution "info" "ESLint check passed" '{"check": "eslint", "status": "pass"}'
log_execution "info" "Build completed successfully" '{"check": "build", "status": "pass"}'
log_execution "info" "All tests passed" '{"check": "tests", "status": "pass"}'

# On validation failure, log with error level:
log_execution "error" "TypeScript check failed: 3 type errors found" '{"check": "typescript", "status": "fail", "error_count": 3}'
```

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

### Step 8: Testing & Validation Wave (MANDATORY)

**This step is REQUIRED before any commit. Changes must pass 100% of validation checks.**

After implementation waves complete, execute a comprehensive testing wave:

#### 8.1: Run Validation Suite

Execute all validation checks in parallel:

```typescript
// Run all validation checks in parallel
const validationResults = await Promise.all([
  Task({
    subagent_type: 'Bash',
    prompt: 'Run TypeScript type checking: pnpm typecheck',
  }),
  Task({ subagent_type: 'Bash', prompt: 'Run ESLint: pnpm lint' }),
  Task({ subagent_type: 'Bash', prompt: 'Run build: pnpm build' }),
  Task({ subagent_type: 'Bash', prompt: 'Run unit tests: pnpm test' }),
]);
```

#### 8.2: Validation Checks (All Must Pass)

| Check                     | Command                | Required     |
| ------------------------- | ---------------------- | ------------ |
| TypeScript                | `pnpm typecheck`       | ✅ MUST PASS |
| ESLint                    | `pnpm lint`            | ✅ MUST PASS |
| Build                     | `pnpm build`           | ✅ MUST PASS |
| Unit Tests                | `pnpm test`            | ✅ MUST PASS |
| E2E Tests (if applicable) | `pnpm playwright test` | ✅ MUST PASS |

#### 8.3: Frontend Validation (For UI Changes)

If the implementation includes frontend changes:

```typescript
// Start dev server and run visual validation
await Task({
  subagent_type: 'webapp-testing',
  prompt: `
    Validate the frontend changes:
    1. Start the dev server (pnpm dev in packages/mason-dashboard)
    2. Navigate to affected pages
    3. Verify no console errors
    4. Verify no visual regressions
    5. Test interactive elements work correctly
    6. Capture screenshots for verification
  `,
});
```

#### 8.4: Backend Validation (For API Changes)

If the implementation includes backend/API changes:

```typescript
// Validate backend functionality
await Task({
  subagent_type: 'Bash',
  prompt: `
    Validate backend changes:
    1. Check API endpoints respond correctly
    2. Verify database operations work
    3. Test error handling paths
    4. Validate response schemas
  `,
});
```

### Step 9: Auto-Fix Iteration Loop

**If ANY validation check fails, the system MUST automatically iterate until all checks pass.**

```typescript
const MAX_FIX_ITERATIONS = 5;
let iteration = 0;
let allPassed = false;

while (!allPassed && iteration < MAX_FIX_ITERATIONS) {
  iteration++;

  // Run validation suite
  const results = await runValidationSuite();

  if (results.allPassed) {
    allPassed = true;
    console.log(`✅ All validations passed on iteration ${iteration}`);
    break;
  }

  // Analyze failures and create fix tasks
  const failures = results.failures;
  console.log(`❌ Iteration ${iteration}: ${failures.length} failures found`);

  // Fix each failure
  for (const failure of failures) {
    await Task({
      subagent_type: 'general-purpose',
      prompt: `
        Fix the following validation failure:

        **Check Type**: ${failure.type}
        **Error Output**:
        \`\`\`
        ${failure.output}
        \`\`\`

        Instructions:
        1. Analyze the error message carefully
        2. Identify the root cause
        3. Make the MINIMAL change needed to fix the issue
        4. Do NOT introduce new features or refactoring
        5. Focus only on making the check pass
      `,
    });
  }
}

if (!allPassed) {
  // Log failure before marking as failed
  log_execution "error" "Failed after ${MAX_FIX_ITERATIONS} iterations" '{"iterations": '"${MAX_FIX_ITERATIONS}"', "status": "failed"}'
  // Mark item as failed and log detailed error report
  throw new Error(
    `Failed to pass all validations after ${MAX_FIX_ITERATIONS} iterations`,
  );
}
```

#### 9.1: Iteration Tracking

Track each iteration in Supabase:

```sql
INSERT INTO pm_validation_iterations (
  run_id,
  item_id,
  iteration_number,
  checks_passed,
  checks_failed,
  failure_details,
  created_at
) VALUES (
  $runId,
  $itemId,
  $iteration,
  $passedCount,
  $failedCount,
  $failureJson,
  now()
);
```

#### 9.2: Failure Categories & Fix Strategies

| Failure Type     | Fix Strategy                                                      |
| ---------------- | ----------------------------------------------------------------- |
| TypeScript Error | Read error, fix type issue, re-check                              |
| ESLint Error     | Apply auto-fix first (`pnpm lint:fix`), then manual fix if needed |
| Build Error      | Analyze build output, fix compilation issue                       |
| Test Failure     | Read test, understand assertion, fix implementation               |
| E2E Failure      | Review screenshot, fix UI or interaction issue                    |

#### 9.3: Smart Fix Ordering

Fix issues in this priority order:

1. **TypeScript errors** - These often cause cascading failures
2. **ESLint errors** - Many can be auto-fixed
3. **Build errors** - Must pass before tests can run
4. **Unit test failures** - Fix logic issues
5. **E2E failures** - Fix integration issues

### Step 10: Final Validation Gate

Before proceeding to commit, verify ALL checks pass:

```typescript
// Final validation - ALL must pass
const finalResults = await runValidationSuite();

if (!finalResults.allPassed) {
  // DO NOT COMMIT - Mark as failed
  await updateItemStatus(itemId, 'validation_failed', finalResults);
  return;
}

// Only proceed to commit if 100% pass
console.log('✅ Final validation passed - proceeding to commit');
```

### Step 11: Commit Changes

After ALL validations pass:

```bash
git add .
git commit -m "feat: [item title]

[Brief description of changes]

Validation Results:
- TypeScript: ✅ Pass
- ESLint: ✅ Pass
- Build: ✅ Pass
- Tests: ✅ Pass

Implements: PM-<item-id>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 11.1: Mark Item Completed (MANDATORY)

**After successful commit**, update both the item status AND the execution progress:

```bash
# Update item status to completed
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "completed", "pr_url": "<pr_url_if_created>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'

# Update execution progress to complete phase (triggers completion animation)
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "current_phase": "complete",
    "wave_status": "Build complete!",
    "validation_typescript": "pass",
    "validation_eslint": "pass",
    "validation_build": "pass",
    "validation_tests": "pass",
    "completed_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
```

```bash
# Log successful completion
log_execution "info" "Execution complete: ${itemTitle}" '{"item_id": "'"${itemId}"'", "status": "completed", "branch": "mason/'"${slug}"'"}'
```

This update will appear **immediately** in the dashboard:

- The item moves from "In Progress" tab to "Completed" tab
- The BuildingTheater shows completion animation with certificate

### Step 12: Update Item Status

```sql
UPDATE pm_backlog_items
SET
  status = 'completed',
  branch_name = 'mason/<slug>',
  validation_passed = true,
  validation_iterations = $iterationCount,
  updated_at = now()
WHERE id = $itemId;
```

### Step 13: Complete Execution Run

```sql
UPDATE pm_execution_runs
SET
  status = 'success',
  validation_summary = $validationJson,
  total_fix_iterations = $totalIterations,
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

#### Wave 3: Code Review

- [ ] Review all changes

#### Wave 4: Testing & Validation

- [ ] TypeScript check
- [ ] ESLint check
- [ ] Build check
- [ ] Unit tests
- [ ] Frontend validation

**Fix Iterations**: 0

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
**Status**: ✅ All Validations Passed

### Validation Summary

| Check      | Status  | Notes            |
| ---------- | ------- | ---------------- |
| TypeScript | ✅ Pass | 0 errors         |
| ESLint     | ✅ Pass | 0 errors         |
| Build      | ✅ Pass | Compiled cleanly |
| Unit Tests | ✅ Pass | 45/45 passing    |
| E2E Tests  | ✅ Pass | 12/12 passing    |

**Total Fix Iterations**: 2

- Iteration 1: Fixed 3 TypeScript errors
- Iteration 2: Fixed 1 ESLint warning

### Branches Created

| Item              | Branch                         | Validation | Iterations |
| ----------------- | ------------------------------ | ---------- | ---------- |
| Add avatar upload | `mason/add-user-avatar-upload` | ✅ Pass    | 1          |
| Fix validation    | `mason/fix-login-validation`   | ✅ Pass    | 0          |
| Refactor errors   | `mason/refactor-api-errors`    | ✅ Pass    | 2          |

### Next Steps

1. Review changes in each branch
2. Create PRs: `gh pr create --base main --head mason/<branch>`
3. Merge after review
```

## Error Handling

### Implementation Task Failures

If an implementation task fails:

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

### Validation Failure Handling

**Validation failures trigger automatic fix iterations:**

1. **On validation failure**: Do NOT mark as failed immediately
2. **Analyze the error**: Parse error output to identify root cause
3. **Create fix task**: Generate targeted fix for the specific failure
4. **Apply fix**: Execute the fix using appropriate subagent
5. **Re-validate**: Run the full validation suite again
6. **Repeat**: Continue until all pass or MAX_ITERATIONS reached

```typescript
// Validation failure triggers auto-fix, not immediate failure
if (validationFailed) {
  // DO NOT throw error
  // Instead, enter fix iteration loop
  await autoFixIteration(failures);
}
```

### Permanent Failure Conditions

An item is marked as **permanently failed** only when:

1. **Max iterations exceeded**: After 5 fix attempts, validation still fails
2. **Unfixable error**: Error type is not auto-fixable (e.g., missing dependency)
3. **Manual intervention required**: Error requires human decision

### Mark Item Failed (MANDATORY on Permanent Failure)

When execution fails permanently, update the item status to `rejected` via Supabase REST API:

```bash
# Update status to rejected (failed)
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status": "rejected", "failure_reason": "<error_summary>", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
```

```bash
# Log the permanent failure
log_execution "error" "Execution failed permanently: ${error_summary}" '{"item_id": "'"${itemId}"'", "status": "rejected", "reason": "'"${error_summary}"'"}'
```

This update will appear **immediately** in the dashboard. The item moves to "Rejected" tab with the failure reason.

**SQL equivalent (for reference):**

```sql
UPDATE pm_backlog_items
SET
  status = 'validation_failed',
  validation_passed = false,
  validation_iterations = $iterationCount,
  failure_reason = $reason,
  updated_at = now()
WHERE id = $itemId;
```

### Error Escalation

When validation fails permanently:

1. **Log detailed report**: Include all iteration attempts and fixes tried
2. **Create follow-up item**: Generate new backlog item for manual review
3. **Notify**: Mark for user attention in dashboard
4. **Preserve work**: Keep branch with partial implementation for review

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

1. **MANDATORY VALIDATION** - All changes MUST pass validation before commit
2. **AUTO-FIX ENABLED** - System automatically fixes failures up to 5 iterations
3. **NO COMMIT WITHOUT PASS** - Never commit if any validation check fails
4. **Test after each wave** - Run tests to catch issues early
5. **Review before validation** - Use code-reviewer subagent before testing
6. **Keep branches focused** - One item per branch
7. **Update progress** - Keep Supabase status current (including validation state)
8. **Track iterations** - Log every fix attempt for debugging

## Validation Checklist

Before any commit is created, verify:

- [ ] `pnpm typecheck` passes with 0 errors
- [ ] `pnpm lint` passes with 0 errors/warnings
- [ ] `pnpm build` completes successfully
- [ ] `pnpm test` all tests pass
- [ ] Frontend works (no console errors, correct behavior)
- [ ] Backend works (API responds correctly, no server errors)

**If any check fails → Auto-fix → Re-validate → Repeat until 100% pass**
