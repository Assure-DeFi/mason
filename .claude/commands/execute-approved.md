---
name: execute-approved
version: 2.2.0
description: Execute Approved Command with Domain-Aware Agents
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
- `--smoke-test`: Run optional E2E smoke test after all items complete to verify app boots without crashes

Examples:

- `/execute-approved` - Execute ALL approved items
- `/execute-approved --item abc123` - Execute specific item
- `/execute-approved --limit 3` - Execute top 3 approved items
- `/execute-approved --dry-run` - Preview execution plan
- `/execute-approved --auto` - Execute all approved items in headless mode (for autopilot)
- `/execute-approved --smoke-test` - Execute with quick runtime smoke test

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

# Parse arguments for --smoke-test flag
SMOKE_TEST_ENABLED=false
if echo "$*" | grep -q '\-\-smoke-test'; then
  SMOKE_TEST_ENABLED=true
  echo "SMOKE_TEST: Enabled - will run E2E smoke test after all validations"
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

**CRITICAL - NO USER CONFIRMATION:** Do NOT ask the user how many items to execute or whether to execute all items vs a subset. Just execute ALL approved items without any confirmation prompt. The user invoked `/execute-approved` which means they want ALL approved items executed. If they wanted fewer, they would use `--limit`.

### Step 2: Verify PRDs Exist

For each approved item, verify it has a PRD:

- If `prd_content` is NULL, prompt user to generate PRD first
- PRD should contain wave-based task breakdown

### Step 2.5: Re-Evaluate INCONCLUSIVE Items (MANDATORY)

**For items with `evidence_status: 'inconclusive'`, perform a pre-execution re-evaluation.**

These items passed initial validation but couldn't be definitively proven as real problems during PM review. Before investing execution resources, verify they provide actual benefit.

#### Re-Evaluation Process

```bash
# Check for inconclusive items in the approved list
INCONCLUSIVE_ITEMS=$(echo "$APPROVED_ITEMS" | jq '[.[] | select(.evidence_status == "inconclusive")]')
INCONCLUSIVE_COUNT=$(echo "$INCONCLUSIVE_ITEMS" | jq 'length')

if [ "$INCONCLUSIVE_COUNT" -gt 0 ]; then
  echo "Found ${INCONCLUSIVE_COUNT} items with inconclusive evidence - re-evaluating..."
fi
```

For each inconclusive item:

**Step A: Re-Evaluate Problem Reality**

Invoke a quick re-evaluation:

```
Task tool call:
  subagent_type: "Explore"
  prompt: |
    Re-evaluate whether this improvement would provide real benefit:

    Title: ${item.title}
    Problem: ${item.problem}
    Solution: ${item.solution}
    Evidence Summary: ${item.evidence_summary}

    Questions to answer:
    1. Does the claimed problem actually exist in the current codebase?
    2. Would implementing this solution provide tangible user/developer benefit?
    3. Is there evidence this was intentionally designed this way?
    4. Would execution waste resources on a non-issue?

    Return:
    - EXECUTE: Problem is real, implementation would provide benefit
    - SKIP: Problem doesn't exist OR implementation wouldn't help

    Be decisive. If in doubt, lean toward SKIP to avoid wasting execution resources.
```

**Step B: Handle Re-Evaluation Result**

| Result    | Action                              |
| --------- | ----------------------------------- |
| `EXECUTE` | Proceed with normal execution       |
| `SKIP`    | Move to FILTERED status, log reason |

**Step C: Skip Items That Fail Re-Evaluation**

For items that should be skipped:

```bash
# Update item status to filtered (skipped during execution)
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "status": "deferred",
    "skip_reason": "Re-evaluation determined no real benefit: ${reason}",
    "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'

# Log the skip
log_execution "info" "Skipped inconclusive item: ${itemTitle}" '{"item_id": "'"${itemId}"'", "skip_reason": "'"${reason}"'"}'
```

**Step D: Display Re-Evaluation Summary**

```
## Re-Evaluation of Inconclusive Items

Items checked: 2
- EXECUTE (proceeding): 1
  - "Improve caching strategy" - Found legitimate performance bottleneck
- SKIP (deferred): 1
  - "Add input validation" - Existing validation is sufficient for current use case

Proceeding with X items for execution...
```

**IMPORTANT:** Skipped items are marked as `deferred` (not `rejected`) so users can manually approve them later if they disagree with the re-evaluation.

---

### Step 2.6: Domain-Aware Agent Routing (MANDATORY)

**Route each item to its specialized execution agent based on `item.type`.**

The domain expert that identified the issue during PM review has specialized knowledge that carries over to implementation. Use the appropriate execution agent for each item type:

#### Type-to-Agent Mapping

| Item Type      | Execution Agent                                | Specialization                          |
| -------------- | ---------------------------------------------- | --------------------------------------- |
| `ui`           | `.claude/agents/execute-ui-agent.md`           | Design tokens, accessibility, dark mode |
| `ux`           | `.claude/agents/execute-ux-agent.md`           | Flow continuity, feedback, friction     |
| `api`          | `.claude/agents/execute-api-agent.md`          | Validation, auth, response consistency  |
| `data`         | `.claude/agents/execute-data-agent.md`         | Migrations, TABLES constant, RLS        |
| `security`     | `.claude/agents/execute-security-agent.md`     | OWASP fixes, auth, secrets              |
| `performance`  | `.claude/agents/execute-performance-agent.md`  | Bundle size, N+1, caching               |
| `code-quality` | `.claude/agents/execute-code-quality-agent.md` | Type safety, refactoring, dead code     |
| `feature`      | `.claude/agents/execute-feature-agent.md`      | New capabilities, complete states       |

#### Agent Routing Logic

```bash
# Determine execution agent based on item type
get_execution_agent() {
  local item_type="$1"
  case "$item_type" in
    ui)           echo ".claude/agents/execute-ui-agent.md" ;;
    ux)           echo ".claude/agents/execute-ux-agent.md" ;;
    api)          echo ".claude/agents/execute-api-agent.md" ;;
    data)         echo ".claude/agents/execute-data-agent.md" ;;
    security)     echo ".claude/agents/execute-security-agent.md" ;;
    performance)  echo ".claude/agents/execute-performance-agent.md" ;;
    code-quality) echo ".claude/agents/execute-code-quality-agent.md" ;;
    feature)      echo ".claude/agents/execute-feature-agent.md" ;;
    *)            echo "general-purpose" ;;  # Fallback for unknown types
  esac
}

# For each approved item, determine its execution agent
EXECUTION_AGENT=$(get_execution_agent "$ITEM_TYPE")
```

#### Pre-Execution Verification

**Before implementing, verify the problem still exists using the domain agent's verification phase.**

Each execution agent has a "Phase 2: Pre-Implementation Verification" that re-validates the issue:

```
Task tool call:
  subagent_type: "Explore"
  prompt: |
    Read the execution agent instructions at: ${EXECUTION_AGENT}

    Then perform the Pre-Implementation Verification from Phase 2 for this item:

    Title: ${item.title}
    Type: ${item.type}
    File: ${item.file_path}:${item.line_number}
    Problem: ${item.problem}

    Verify the problem STILL EXISTS before we invest execution resources.

    Return:
    - PROCEED: Problem confirmed, ready for implementation
    - SKIP: Problem already resolved or doesn't exist
    - MODIFIED: Problem exists but different from PRD description (include details)
```

**Handle verification result:**

| Result     | Action                                           |
| ---------- | ------------------------------------------------ |
| `PROCEED`  | Continue to implementation                       |
| `SKIP`     | Mark as `completed` with note "Already resolved" |
| `MODIFIED` | Update PRD context before implementing           |

---

### Step 2.7: Extract PRD Context (MANDATORY)

**Parse the PRD to extract domain-specific context for the execution agent.**

Each PRD contains structured information that the execution agent needs:

```bash
# Extract PRD sections for execution context
extract_prd_context() {
  local prd_content="$1"

  # Extract key sections
  TARGET_FILE=$(echo "$prd_content" | grep -oE 'src/[a-zA-Z0-9/_.-]+:\d+' | head -1)
  PROBLEM_STATEMENT=$(echo "$prd_content" | grep -A5 '## Problem')
  SOLUTION_APPROACH=$(echo "$prd_content" | grep -A10 '## Solution')
  EVIDENCE_SUMMARY=$(echo "$prd_content" | grep -A5 'evidence_summary')
  WAVE_BREAKDOWN=$(echo "$prd_content" | grep -A30 '## Implementation')
  SUCCESS_CRITERIA=$(echo "$prd_content" | grep -A5 'success_criteria')

  # Build context object
  echo "Target: $TARGET_FILE"
  echo "Problem: $PROBLEM_STATEMENT"
  echo "Solution: $SOLUTION_APPROACH"
  echo "Evidence: $EVIDENCE_SUMMARY"
  echo "Waves: $WAVE_BREAKDOWN"
  echo "Success: $SUCCESS_CRITERIA"
}

PRD_CONTEXT=$(extract_prd_context "$ITEM_PRD_CONTENT")
```

**Pass this context to the execution agent prompt** so it has full awareness of:

- Exact file/line location of the issue
- Problem description from discovery
- Evidence collected during PM review
- Proposed solution approach
- Success criteria for validation

---

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

**Before beginning implementation**, update the item status AND create a progress record for the ExecutionStatusModal visualization.

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

# Create execution progress record for ExecutionStatusModal visualization
# This triggers the ExecutionStatusModal to AUTO-APPEAR in the dashboard
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
- The ExecutionStatusModal modal auto-appears showing the construction animation

```bash
# Log execution start
log_execution "info" "Starting execution for: ${itemTitle}" '{"item_id": "'"${itemId}"'", "branch": "mason/'"${slug}"'"}'
```

### Step 5.2: Update Progress Throughout Execution (MANDATORY)

**Update the execution progress at key milestones** to drive the ExecutionStatusModal visualization:

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

### Step 6: Execute Waves with Domain-Aware Agents

Execute each wave using the Task tool with **domain-specialized agents**:

```typescript
// Wave 1 - Exploration (parallel) - Use Explore subagent
await Promise.all([
  Task({ subagent_type: 'Explore', prompt: '...' }),
  Task({ subagent_type: 'Explore', prompt: '...' }),
]);

// Wave 2 - Implementation (parallel) - Use DOMAIN-SPECIFIC agent
// Read the execution agent file and include in the prompt
const agentInstructions = await Read(EXECUTION_AGENT);
await Promise.all([
  Task({
    subagent_type: 'general-purpose',
    prompt: `
      You are a domain-specialized execution agent.

      ## Agent Instructions
      ${agentInstructions}

      ## Item Context
      Title: ${item.title}
      Type: ${item.type}
      PRD Context:
      ${PRD_CONTEXT}

      ## Task
      Execute Phase 4 (Implementation) from the agent instructions.

      Focus on:
      - Following domain-specific patterns
      - Using existing codebase conventions
      - Meeting the success criteria from the PRD
    `,
  }),
]);

// Wave 3 - Code Review with domain awareness
await Task({
  subagent_type: 'code-reviewer',
  prompt: `
    Review the implementation against domain-specific requirements:
    - Item Type: ${item.type}
    - Domain validation rules from: ${EXECUTION_AGENT}
    - Success criteria from PRD
  `,
});
```

**Domain-Aware Subagent Selection:**

| Wave Purpose      | Subagent Type     | Agent Specialization                    |
| ----------------- | ----------------- | --------------------------------------- |
| Exploration       | `Explore`         | Finding patterns, understanding code    |
| Implementation    | `general-purpose` | With domain agent instructions injected |
| UI Implementation | `frontend-design` | For `ui`/`ux` item types                |
| Code Review       | `code-reviewer`   | Domain-aware review checklist           |
| Validation        | `Bash`            | Running validation commands             |

**CRITICAL: For implementation waves, ALWAYS include the domain agent instructions in the prompt.**

#### Implementation Prompt Template

```
Task tool call:
  subagent_type: "general-purpose" (or "frontend-design" for ui/ux types)
  prompt: |
    # Domain Execution Agent

    You are executing an improvement identified during PM review.

    ## Agent Instructions
    Read and follow the instructions at: ${EXECUTION_AGENT}

    ## Item Details
    - Title: ${item.title}
    - Type: ${item.type}
    - Priority: ${item.priority_score}

    ## PRD Context
    ${item.prd_content}

    ## Implementation Task
    Execute Phase 4 (Implementation) from the agent instructions.

    Apply domain-specific patterns:
    - For UI: Design tokens, accessibility, dark mode
    - For Security: OWASP remediation, auth checks
    - For Performance: Measurement before/after
    - For Data: TABLES constant, idempotent migrations
    - For Code Quality: Behavior preservation, no new `any`

    ## Success Criteria
    ${SUCCESS_CRITERIA from PRD}

    Report completion status when done.
```

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

### Step 7.5: Implementation Validator (MANDATORY)

**Run the Implementation Validator AFTER implementation waves but BEFORE TypeScript/ESLint validation.**

The Implementation Validator catches architectural and pattern issues early - before they cause cascading TypeScript errors or subtle bugs that pass linting.

#### Validator Location

`.claude/agents/implementation-validator.md`

#### Invoke the Validator

```
Task tool call:
  subagent_type: "Explore"
  prompt: |
    # Implementation Validation

    Read the validator instructions at: .claude/agents/implementation-validator.md

    Run the 5-tier validation for this implementation:

    ## Item Context
    - Title: ${item.title}
    - Type: ${item.type}
    - PRD File References: ${PRD_FILES}
    - Changed Files: $(git diff --name-only HEAD)

    ## Validation Tiers to Check

    1. **Scope Verification**: Only PRD-specified files modified?
    2. **Pattern Adherence**: Follows existing component/hook/API patterns?
    3. **Import Graph**: No circular deps, no layer violations?
    4. **Domain-Specific**: Passes ${item.type} validation rules?
    5. **Side Effects**: No breaking changes to existing code?

    ## Expected Output
    Return JSON with validation status for each tier.
```

#### Handle Validator Results

```typescript
const validatorResult = await runImplementationValidator();

// Decision matrix
if (validatorResult.tiers.scope_verification.status === 'fail') {
  // STOP - out of scope changes detected
  log_execution('error', 'Scope verification failed', validatorResult);
  // Revert out-of-scope changes or get explicit approval
}

if (validatorResult.tiers.pattern_adherence.status === 'fail') {
  // STOP - pattern violations must be fixed before proceeding
  log_execution('warn', 'Pattern violations detected', validatorResult);
  // Route to domain agent for pattern fixes
}

if (validatorResult.tiers.import_graph.status === 'fail') {
  // STOP - architectural issues
  log_execution('error', 'Import graph violations', validatorResult);
  // Fix circular imports or layer violations
}

if (validatorResult.summary.proceed_with_validation) {
  // Proceed to TypeScript/ESLint validation
  console.log('✅ Implementation validator passed');
} else {
  // Fix issues before proceeding
  await fixImplementationIssues(validatorResult.recommendations);
}
```

#### Validator Output Format

```json
{
  "validation_status": "pass|warn|fail",
  "tiers": {
    "scope_verification": { "status": "pass", "out_of_scope_changes": [] },
    "pattern_adherence": { "status": "pass", "pattern_violations": [] },
    "import_graph": {
      "status": "pass",
      "circular_imports": [],
      "layer_violations": []
    },
    "domain_specific": { "status": "pass", "domain": "ui", "issues": [] },
    "side_effects": {
      "status": "pass",
      "breaking_changes": [],
      "affected_files": []
    }
  },
  "summary": {
    "total_issues": 0,
    "critical": 0,
    "warnings": 0,
    "proceed_with_validation": true
  }
}
```

#### Validator Decision Matrix

| Tier Status          | Action                                             |
| -------------------- | -------------------------------------------------- |
| All pass             | Proceed to TypeScript/ESLint validation            |
| Warnings only        | Proceed with caution, log warnings                 |
| Any fail in Tier 1-3 | STOP - fix scope/pattern/import issues first       |
| Fail in Tier 4-5     | Evaluate severity - may need fix before proceeding |

---

### Step 7.9: MANDATORY PRE-COMMIT VALIDATION GATE

**THIS IS A HARD STOP - DO NOT PROCEED WITHOUT PASSING**

Before ANY commit can be created, you MUST run these validation commands and they MUST ALL pass. This gate is NON-NEGOTIABLE.

#### Run Validation Suite

```bash
echo "=== MANDATORY VALIDATION GATE ==="
echo "Running validation suite - ALL checks MUST pass before commit"

VALIDATION_FAILED=false

# 1. TypeScript Check
echo ""
echo ">>> Running TypeScript check..."
update_progress "inspection" 3 "Running TypeScript check..." 0 4
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"validation_typescript": "running"}'

if ! pnpm typecheck; then
  echo "TYPESCRIPT_CHECK FAILED"
  VALIDATION_FAILED=true
  TYPESCRIPT_FAILED=true
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_typescript": "fail"}'
  log_execution "error" "TypeScript check FAILED" '{"check": "typescript", "status": "fail"}'
else
  echo "TypeScript check PASSED"
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_typescript": "pass"}'
  log_execution "info" "TypeScript check passed" '{"check": "typescript", "status": "pass"}'
fi

# 2. ESLint Check
echo ""
echo ">>> Running ESLint check..."
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"validation_eslint": "running"}'

if ! pnpm lint; then
  echo "ESLINT_CHECK FAILED"
  VALIDATION_FAILED=true
  ESLINT_FAILED=true
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_eslint": "fail"}'
  log_execution "error" "ESLint check FAILED" '{"check": "eslint", "status": "fail"}'
else
  echo "ESLint check PASSED"
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_eslint": "pass"}'
  log_execution "info" "ESLint check passed" '{"check": "eslint", "status": "pass"}'
fi

# 3. Build Check
echo ""
echo ">>> Running build check..."
curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"validation_build": "running"}'

if ! pnpm build; then
  echo "BUILD_CHECK FAILED"
  VALIDATION_FAILED=true
  BUILD_FAILED=true
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_build": "fail"}'
  log_execution "error" "Build check FAILED" '{"check": "build", "status": "fail"}'
else
  echo "Build check PASSED"
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_build": "pass"}'
  log_execution "info" "Build check passed" '{"check": "build", "status": "pass"}'
fi

echo ""
echo "=== END VALIDATION GATE ==="
```

#### IF ANY CHECK FAILS - MANDATORY ACTIONS

**This is NON-NEGOTIABLE. If `VALIDATION_FAILED=true`:**

1. **DO NOT commit** - No `git commit` command may be executed
2. **DO NOT create PR** - No PR creation until all checks pass
3. **Enter auto-fix loop** (Step 9) - MANDATORY
4. **Re-run this validation gate** after each fix attempt
5. **Only proceed to commit** when ALL checks pass (VALIDATION_FAILED=false)

**CRITICAL ENFORCEMENT:**

- Never skip this gate
- Never bypass with `--no-verify`
- Never commit partial fixes hoping they'll work in CI
- The Vercel build WILL fail if you skip this - causing user frustration

---

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

#### 8.5: Optional Smoke Test (When --smoke-test flag is used)

**This step only runs if `SMOKE_TEST_ENABLED=true`.**

When the user invokes `/execute-approved --smoke-test`, run a quick E2E smoke test after all standard validations pass to verify the app boots without runtime crashes.

```bash
# === OPTIONAL SMOKE TEST (Step 8.5) ===
if [ "$SMOKE_TEST_ENABLED" = "true" ]; then
  echo ""
  echo "=== RUNNING SMOKE TEST ==="
  echo "Starting quick E2E smoke test to verify app boots..."

  # Update progress to show smoke test running
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_smoke_test": "running"}'

  log_execution "info" "Running smoke test" '{"check": "smoke_test", "status": "running"}'

  # Run the smoke test spec
  cd packages/mason-dashboard
  if npx playwright test e2e/smoke.spec.ts --reporter=line 2>&1; then
    echo "Smoke test PASSED"
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_smoke_test": "pass"}'
    log_execution "info" "Smoke test passed" '{"check": "smoke_test", "status": "pass"}'
  else
    echo "Smoke test FAILED - app may have runtime errors"
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_smoke_test": "fail"}'
    log_execution "warn" "Smoke test failed - app may have runtime errors" '{"check": "smoke_test", "status": "fail"}'
    # NOTE: Smoke test failure is a WARNING, not a blocking failure
    # The item still proceeds to commit since all mandatory validations passed
  fi
  cd ../..

  echo "=== END SMOKE TEST ==="
else
  # Smoke test not enabled - mark as skipped
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"validation_smoke_test": "skipped"}'
fi
# === END OPTIONAL SMOKE TEST ===
```

**Smoke Test Behavior:**

| Scenario                    | Action                                                  |
| --------------------------- | ------------------------------------------------------- |
| `--smoke-test` not provided | Status shows "Skipped", test not run                    |
| Smoke test passes           | Status shows "Pass", proceed to commit                  |
| Smoke test fails            | Status shows "Fail" as WARNING, still proceed to commit |

**Why smoke test failure is non-blocking:**

- All mandatory validations (TypeScript, ESLint, Build, Tests) have already passed
- The code is verified safe to commit
- Smoke test failure indicates potential runtime issues that may need investigation
- User is informed but execution continues

### Step 9: Auto-Fix Iteration Loop (MANDATORY ON VALIDATION FAILURE)

**DO NOT SKIP THIS STEP IF VALIDATION FAILED**

When Step 7.9 validation gate fails, you MUST enter this auto-fix loop. This is not optional.

#### Iteration Loop Implementation

```bash
MAX_FIX_ITERATIONS=5
ITERATION=0

while [ "$VALIDATION_FAILED" = true ] && [ $ITERATION -lt $MAX_FIX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "=============================================="
  echo "=== FIX ITERATION $ITERATION/$MAX_FIX_ITERATIONS ==="
  echo "=============================================="

  # Update progress to show fix iteration
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"fix_iteration": '"$ITERATION"', "wave_status": "Fix iteration '"$ITERATION"'/'"$MAX_FIX_ITERATIONS"'..."}'

  log_execution "info" "Starting fix iteration ${ITERATION}" '{"iteration": '"$ITERATION"', "max": '"$MAX_FIX_ITERATIONS"'}'

  # === FIX PRIORITY ORDER ===
  # Fix in this order to avoid cascading failures:
  # 1. ESLint auto-fix (handles many issues automatically)
  # 2. TypeScript errors (often cause other failures)
  # 3. Build errors
  # 4. Remaining lint errors (manual fixes)

  # Step 1: Try ESLint auto-fix first (fixes many issues automatically)
  echo ""
  echo ">>> Attempting ESLint auto-fix..."
  pnpm lint:fix || true  # Don't fail if lint:fix has issues

  # Step 2: If TypeScript failed, analyze and fix type errors
  if [ "$TYPESCRIPT_FAILED" = true ]; then
    echo ""
    echo ">>> Fixing TypeScript errors..."
    # Claude agent analyzes pnpm typecheck output and fixes type issues
    # This is done by the executing agent, not bash
  fi

  # Step 3: If Build failed, analyze and fix build errors
  if [ "$BUILD_FAILED" = true ]; then
    echo ""
    echo ">>> Fixing build errors..."
    # Claude agent analyzes pnpm build output and fixes compilation issues
  fi

  # === RE-RUN VALIDATION SUITE ===
  echo ""
  echo ">>> Re-running validation suite after fixes..."

  VALIDATION_FAILED=false
  TYPESCRIPT_FAILED=false
  ESLINT_FAILED=false
  BUILD_FAILED=false

  # TypeScript re-check
  if ! pnpm typecheck; then
    VALIDATION_FAILED=true
    TYPESCRIPT_FAILED=true
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_typescript": "fail"}'
  else
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_typescript": "pass"}'
  fi

  # ESLint re-check
  if ! pnpm lint; then
    VALIDATION_FAILED=true
    ESLINT_FAILED=true
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_eslint": "fail"}'
  else
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_eslint": "pass"}'
  fi

  # Build re-check
  if ! pnpm build; then
    VALIDATION_FAILED=true
    BUILD_FAILED=true
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_build": "fail"}'
  else
    curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_execution_progress?item_id=eq.${itemId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"validation_build": "pass"}'
  fi

  # Check if all passed
  if [ "$VALIDATION_FAILED" = false ]; then
    echo ""
    echo "ALL VALIDATIONS PASSED on iteration $ITERATION"
    log_execution "info" "All validations passed" '{"iteration": '"$ITERATION"', "status": "pass"}'
    break
  fi

  # If still failing and not at max iterations, continue loop
  if [ $ITERATION -lt $MAX_FIX_ITERATIONS ]; then
    echo ""
    echo "Validation still failing - analyzing errors for next fix attempt..."
    log_execution "warn" "Validation failed, attempting fixes" '{"iteration": '"$ITERATION"', "typescript_failed": '"$TYPESCRIPT_FAILED"', "eslint_failed": '"$ESLINT_FAILED"', "build_failed": '"$BUILD_FAILED"'}'
  fi
done

# === FINAL RESULT CHECK ===
if [ "$VALIDATION_FAILED" = true ]; then
  echo ""
  echo "=============================================="
  echo "VALIDATION FAILED AFTER $MAX_FIX_ITERATIONS ITERATIONS"
  echo "=============================================="
  echo ""
  echo "DO NOT COMMIT - Marking item as FAILED"

  log_execution "error" "Validation failed after max iterations" '{"iterations": '"$MAX_FIX_ITERATIONS"', "status": "failed"}'

  # Update item status to rejected
  curl -X PATCH "${SUPABASE_URL}/rest/v1/mason_pm_backlog_items?id=eq.${itemId}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '{"status": "rejected", "failure_reason": "Validation failed after '"$MAX_FIX_ITERATIONS"' fix iterations", "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'

  # DO NOT PROCEED - Exit execution for this item
  echo "Skipping commit and PR creation for this item"
  # Continue to next item or end execution
fi
```

**CRITICAL: The above loop is MANDATORY when validation fails. The agent must:**

1. Run `pnpm lint:fix` first (auto-fixes many ESLint issues)
2. Analyze remaining TypeScript errors and fix them
3. Analyze remaining ESLint errors and fix them manually
4. Analyze build errors and fix them
5. Re-run the FULL validation suite (Step 7.9)
6. Repeat until all pass OR max iterations reached

#### Domain-Aware Fix Strategy

```typescript
const MAX_FIX_ITERATIONS = 5;
let iteration = 0;
let allPassed = false;

while (!allPassed && iteration < MAX_FIX_ITERATIONS) {
  iteration++;

  // Run validation suite (Step 7.9)
  const results = await runValidationSuite();

  if (results.allPassed) {
    allPassed = true;
    console.log(`All validations passed on iteration ${iteration}`);
    break;
  }

  // Analyze failures and create fix tasks
  const failures = results.failures;
  console.log(`Iteration ${iteration}: ${failures.length} failures found`);

  // Fix each failure using DOMAIN-AWARE agents
  for (const failure of failures) {
    // Route to domain expert for intelligent fixes
    const fixAgent = getDomainFixAgent(failure.type, item.type);

    await Task({
      subagent_type: fixAgent.subagent,
      prompt: `
        # Domain-Aware Fix Task

        You are a ${item.type} domain expert fixing a validation failure.

        ## Domain Agent Instructions
        Read and follow: ${EXECUTION_AGENT}

        ## Failure Details
        **Check Type**: ${failure.type}
        **Item Type**: ${item.type}
        **Error Output**:
        \`\`\`
        ${failure.output}
        \`\`\`

        ## Domain Context
        ${PRD_CONTEXT}

        ## Fix Instructions
        1. Analyze the error through your domain expertise lens
        2. Identify the root cause considering domain patterns
        3. Make the MINIMAL change needed to fix the issue
        4. Ensure fix follows domain-specific best practices:
           ${fixAgent.domainChecks}
        5. Do NOT introduce new features or refactoring
        6. Focus only on making the check pass

        ## Domain-Specific Fix Guidance
        ${getDomainFixGuidance(item.type, failure.type)}
      `,
    });
  }
}

// Domain-aware fix agent selection
function getDomainFixAgent(failureType, itemType) {
  // For TypeScript errors, route to appropriate domain
  if (failureType === 'typescript') {
    return {
      subagent: 'general-purpose',
      domainChecks: getDomainTypeChecks(itemType),
    };
  }

  // For ESLint errors related to accessibility, route to UI agent
  if (failureType === 'eslint' && itemType === 'ui') {
    return {
      subagent: 'frontend-design',
      domainChecks: 'Accessibility rules, ARIA attributes, semantic HTML',
    };
  }

  // Default
  return {
    subagent: 'general-purpose',
    domainChecks: 'Standard code quality rules',
  };
}

// Domain-specific fix guidance
function getDomainFixGuidance(itemType, failureType) {
  const guidance = {
    ui: `
      - Use design tokens from brand palette (Navy #0A0724, Gold #E2D243)
      - Ensure dark mode compatibility (no light-mode defaults)
      - Add accessibility attributes (aria-label, role, tabIndex)
      - Use Tailwind classes, not inline styles
    `,
    security: `
      - Never expose sensitive data in error messages
      - Add auth checks BEFORE data access
      - Parameterize all database queries
      - Move secrets to environment variables
    `,
    performance: `
      - Use specific imports, not full library imports
      - Add useMemo/useCallback for expensive operations
      - Batch database queries to avoid N+1
      - Use proper select() columns, not select('*')
    `,
    'code-quality': `
      - Replace 'any' with proper types
      - Maintain existing behavior (no functional changes)
      - Follow existing naming conventions
      - Keep nesting depth ≤ 2 levels
    `,
    api: `
      - Use { data, error } response envelope
      - Add input validation with Zod schemas
      - Include proper error status codes
      - Add auth middleware for protected routes
    `,
    data: `
      - Use TABLES constant from @/lib/constants
      - Make migrations idempotent (IF NOT EXISTS)
      - Enable RLS on new tables
      - Add proper indexes for query patterns
    `,
    ux: `
      - Ensure all actions have user feedback
      - Add loading states for async operations
      - Preserve navigation consistency
      - Reduce friction in user flows
    `,
    feature: `
      - Implement all states (loading, error, empty, success)
      - Follow existing component patterns
      - Add proper TypeScript types
      - Ensure responsive design
    `,
  };
  return guidance[itemType] || 'Follow standard code quality practices';
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
- The ExecutionStatusModal shows completion animation with certificate

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
