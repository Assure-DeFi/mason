---
name: battle-test
version: 2.1.0
description: Executable E2E testing with parallel agents and automatic fix cycles
---

# Battle Test - Executable E2E Testing

You are the **Battle Test Coordinator**. This skill runs comprehensive E2E tests using parallel agents, diagnoses issues, and applies fixes.

## Arguments

Parse arguments from `$ARGUMENTS`:

- `--fix-mode report-only` - Detection only, no fixes
- `--focus <area>` - Focus on: `ui`, `api`, `flow`, or `all` (default)
- `--wave <n>` - Run only up to wave N (1, 2, or 3)

## Step 1: Initialize State (MANDATORY)

First, create the directory structure and index file:

```bash
mkdir -p .claude/battle-test/results
mkdir -p .claude/battle-test/screenshots
```

Then use the Write tool to create `.claude/battle-test/index.json` with this EXACT content (fill in timestamp):

```json
{
  "run_id": "bt-YYYYMMDD-HHMMSS",
  "status": "initializing",
  "wave": 0,
  "iteration": 1,
  "max_iterations": 3,
  "started_at": "<current ISO timestamp>",
  "config": {
    "fix_mode": "auto-fix",
    "focus": "all"
  },
  "base_url": "http://localhost:3000",
  "pages_to_test": [
    "/",
    "/auth/signin",
    "/setup",
    "/admin/backlog",
    "/settings/database",
    "/settings/github",
    "/settings/api-keys"
  ],
  "api_endpoints": [
    { "path": "/api/health", "method": "GET" },
    { "path": "/api/setup/migrations", "method": "POST" },
    { "path": "/api/v1/backlog/next", "method": "GET" },
    { "path": "/api/keys", "method": "GET" }
  ],
  "test_assignments": {
    "ui_tester": { "id": "UI-1", "status": "pending" },
    "api_tester": { "id": "API-1", "status": "pending" },
    "flow_tester": { "id": "FLOW-1", "status": "pending" }
  },
  "test_results": {},
  "issues": [],
  "diagnosis": {
    "completed": false,
    "root_causes": [],
    "fix_queue": []
  },
  "fix_results": []
}
```

## Step 2: Check Dev Server (MANDATORY)

Run this command to check if the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "NOT_RUNNING"
```

**If NOT_RUNNING or response is not 200:**

1. Tell the user: "Dev server not detected on localhost:3000. Please start it with: cd packages/mason-dashboard && pnpm dev"
2. Wait for user confirmation before proceeding
3. Re-check until you get 200

**If 200:** Proceed to Wave 1.

## Step 3: Wave 1 - Parallel Testing (CRITICAL)

Update `index.json`: set `"status": "testing"`, `"wave": 1`

**IMPORTANT: Launch ALL 3 agents in a SINGLE message with 3 Task tool calls.**

### Agent 1: UI Tester (webapp-testing)

Use Task tool with `subagent_type: "webapp-testing"` and this prompt:

```
You are the UI Tester (agent ID: UI-1) for Mason dashboard battle testing.

BASE URL: http://localhost:3000

YOUR TASK: Test each page for rendering, console errors, and basic functionality.

PAGES TO TEST:
1. / (landing page)
2. /auth/signin (login page)
3. /setup (setup wizard)
4. /admin/backlog (main dashboard)
5. /settings/database (Supabase settings)
6. /settings/github (GitHub settings)
7. /settings/api-keys (API key management)

FOR EACH PAGE:
1. Navigate to the page using Playwright
2. Wait up to 15 seconds for page to load (waitForLoadState)
3. Capture any console errors (page.on('console') with type 'error')
4. Check for visible error text like "Error", "Something went wrong", "Unexpected"
5. ALWAYS take a full-page screenshot (not just on failure)
6. Check that the page is not blank (has some visible content)
7. Check for broken layouts: overlapping elements, content overflow, horizontal scrollbar
8. Check dark mode is applied (no light/white backgrounds on main containers)
9. Check for stuck loading states (spinners visible after 10 seconds)

PLAYWRIGHT COMMANDS TO USE:
- page.goto(url, { timeout: 15000 })
- page.waitForLoadState('networkidle', { timeout: 15000 })
- page.locator('body').textContent() to check not empty
- page.screenshot({ path: '.claude/battle-test/screenshots/UI-{page}.png', fullPage: true })

SCREENSHOT EVALUATION (for each screenshot):
After capturing, visually evaluate the screenshot for:
- Blank/white screen (critical)
- Error messages or stack traces visible (critical)
- Missing navigation or broken layout (high)
- Content overflow causing horizontal scroll (medium)
- Light mode leak - white backgrounds where dark expected (medium)
- Missing or broken images/icons (low)

OUTPUT: After testing all pages, use the Write tool to create .claude/battle-test/results/UI-1.json with this structure:

{
  "agent_id": "UI-1",
  "completed_at": "<ISO timestamp>",
  "summary": {
    "pages_tested": <number>,
    "pages_passed": <number>,
    "pages_failed": <number>,
    "issues_found": <number>
  },
  "pages": [
    {
      "url": "/admin/backlog",
      "status": "pass" or "fail",
      "load_time_ms": <number>,
      "console_errors": ["error message 1", ...],
      "issues": [
        {
          "type": "console_error" | "render_fail" | "blank_page" | "timeout",
          "severity": "critical" | "high" | "medium" | "low",
          "description": "What went wrong",
          "screenshot": "path/to/screenshot.png"
        }
      ]
    }
  ]
}

Report ONLY actual failures. If a page loads correctly with no console errors, mark it as "pass" with empty issues array.
```

### Agent 2: API Tester (webapp-testing)

Use Task tool with `subagent_type: "webapp-testing"` and this prompt:

```
You are the API Tester (agent ID: API-1) for Mason dashboard battle testing.

BASE URL: http://localhost:3000

YOUR TASK: Test API endpoints for correct responses and error handling.

ENDPOINTS TO TEST:
1. GET /api/health - Should return 200 (or may not exist, note as "not implemented")
2. POST /api/setup/migrations - Test without auth, should return 401 or require setup
3. GET /api/v1/backlog/next - Test without auth, check response
4. GET /api/keys - Test without auth, check response

FOR EACH ENDPOINT:
1. Make the HTTP request using Playwright's request context or fetch
2. Record the status code
3. Record the response body (truncated if > 1000 chars)
4. Note if response matches expected behavior

TESTING APPROACH:
- Use page.request.get() or page.request.post() for API calls
- Or use evaluate with fetch()
- Check status codes: 200, 201, 400, 401, 403, 404, 500

EXPECTED BEHAVIORS:
- Unauthenticated requests to protected routes: 401
- Missing required fields: 400 with error message
- Valid requests: 200 with JSON response

OUTPUT: After testing all endpoints, use the Write tool to create .claude/battle-test/results/API-1.json with this structure:

{
  "agent_id": "API-1",
  "completed_at": "<ISO timestamp>",
  "summary": {
    "endpoints_tested": <number>,
    "endpoints_passed": <number>,
    "endpoints_failed": <number>,
    "issues_found": <number>
  },
  "endpoints": [
    {
      "path": "/api/health",
      "method": "GET",
      "status": "pass" or "fail",
      "response_code": 200,
      "response_body_preview": "first 200 chars...",
      "issues": [
        {
          "type": "unexpected_status" | "invalid_response" | "timeout" | "error",
          "severity": "critical" | "high" | "medium" | "low",
          "description": "What went wrong",
          "expected": "what should have happened",
          "actual": "what actually happened"
        }
      ]
    }
  ]
}

Note: Some endpoints may require authentication - document this as expected behavior, not a failure.
```

### Agent 3: Flow Tester (webapp-testing)

Use Task tool with `subagent_type: "webapp-testing"` and this prompt:

```
You are the Flow Tester (agent ID: FLOW-1) for Mason dashboard battle testing.

BASE URL: http://localhost:3000

YOUR TASK: Test user journeys and navigation flows.

FLOWS TO TEST:

FLOW 1: Landing to Auth
1. Go to /
2. Check if redirected to /auth/signin OR shows landing content
3. Document the behavior

FLOW 2: Auth Page State
1. Go to /auth/signin
2. Check for GitHub sign-in button
3. Check page loads without errors

FLOW 3: Protected Route Redirect
1. Go to /admin/backlog (protected route)
2. Without auth, should redirect to /auth/signin OR show auth prompt
3. Document the redirect behavior

FLOW 4: Settings Navigation
1. Go to /settings/database
2. Check if page loads (may show setup prompt or redirect)
3. Navigate to /settings/github
4. Check if page loads
5. Navigate to /settings/api-keys
6. Check if page loads

FOR EACH FLOW:
1. Execute the steps
2. Record what happens at each step
3. Note any unexpected behavior
4. Take screenshots of issues

OUTPUT: After testing all flows, use the Write tool to create .claude/battle-test/results/FLOW-1.json with this structure:

{
  "agent_id": "FLOW-1",
  "completed_at": "<ISO timestamp>",
  "summary": {
    "flows_tested": <number>,
    "flows_passed": <number>,
    "flows_failed": <number>,
    "issues_found": <number>
  },
  "flows": [
    {
      "name": "Landing to Auth",
      "status": "pass" or "fail",
      "steps": [
        { "action": "goto /", "result": "redirected to /auth/signin", "status": "pass" }
      ],
      "issues": [
        {
          "type": "unexpected_redirect" | "broken_navigation" | "missing_element" | "crash",
          "severity": "critical" | "high" | "medium" | "low",
          "description": "What went wrong",
          "step": "which step failed",
          "screenshot": "path if captured"
        }
      ]
    }
  ]
}
```

## Step 4: Wait for Results and Aggregate

After launching all 3 agents, wait for them to complete.

Then read the result files:

```bash
cat .claude/battle-test/results/UI-1.json
cat .claude/battle-test/results/API-1.json
cat .claude/battle-test/results/FLOW-1.json
```

**Aggregate into index.json:**

1. Read each result file
2. Collect all issues from all agents into the `issues` array in index.json
3. Assign unique IDs to each issue: `issue-001`, `issue-002`, etc.
4. Update `test_assignments` status to "complete" for each agent
5. Update `test_results` with summary from each agent

**Count total issues:**

- If `issues.length === 0`: Skip to Step 7 (Report)
- If `issues.length > 0` and `--wave` argument allows: Continue to Wave 2

## Step 5: Wave 2 - Diagnosis (If Issues Found)

Update `index.json`: set `"status": "diagnosing"`, `"wave": 2`

Launch 1 Diagnosis Agent using Task tool with `subagent_type: "Explore"`:

```
You are the Diagnosis Agent for Battle Test.

YOUR TASK: Analyze test failures and identify root causes.

READ THE INDEX FILE:
First, read .claude/battle-test/index.json to get all issues from Wave 1.

ANALYSIS PROCESS:
1. Group issues by category (ui, api, flow)
2. Look for common patterns (same file, same component, same error)
3. For each issue with a file_hint, read the source file to understand the bug
4. Identify ROOT CAUSES, not symptoms

ROOT CAUSE IDENTIFICATION:
- If multiple pages have the same console error → likely one shared component
- If multiple API endpoints fail similarly → likely one middleware/util issue
- If flows break at auth → likely auth configuration issue

FOR EACH ROOT CAUSE:
1. Identify the exact file and approximate line
2. Describe what needs to change
3. List which issues this would fix
4. Estimate complexity (low/medium/high)

OUTPUT: Update .claude/battle-test/index.json with:

"diagnosis": {
  "completed": true,
  "analyzed_at": "<ISO timestamp>",
  "total_issues": <number>,
  "root_causes_found": <number>,
  "root_causes": [
    {
      "id": "rc-001",
      "file": "src/path/to/file.tsx",
      "line": 45,
      "description": "What's wrong and why",
      "fix_type": "add_loading_state | add_error_handling | fix_async | etc",
      "symptoms": ["issue-001", "issue-002"],
      "priority": 1,
      "estimated_complexity": "low | medium | high",
      "fix_approach": "Specific steps to fix"
    }
  ],
  "fix_queue": ["rc-001", "rc-002"],
  "unable_to_diagnose": []
}

If an issue can't be diagnosed, add it to unable_to_diagnose with explanation.
```

## Step 6: Wave 3 - Sequential Fixes (If Diagnosis Found Issues)

If `config.fix_mode === "report-only"`, skip to Step 7.

Update `index.json`: set `"status": "fixing"`, `"wave": 3`

Read the `diagnosis.fix_queue` from index.json.

**For EACH fix in the queue (ONE AT A TIME, sequentially):**

Launch 1 Fix Agent using Task tool with `subagent_type: "general-purpose"`:

```
You are the Fix Agent for Battle Test.

YOUR TASK: Implement fix ID: <FIX_ID>

STEP 1: Read fix details from .claude/battle-test/index.json
Look for the root cause with id: "<FIX_ID>" in the diagnosis.root_causes array.

STEP 2: Read the target file
Read the file specified in the root cause.

STEP 3: Implement the minimal fix
- Only change what's necessary to fix the issue
- Don't refactor or improve surrounding code
- Follow the fix_approach from the diagnosis

STEP 4: Validate
Run these commands in packages/mason-dashboard:
- pnpm typecheck
- pnpm lint

If validation fails, fix the errors or revert if unfixable.

STEP 5: Update index.json
Add to the fix_results array:
{
  "fix_id": "<FIX_ID>",
  "status": "success" | "failed" | "escalated",
  "completed_at": "<ISO timestamp>",
  "file_changed": "path/to/file",
  "validation": {
    "typecheck": "pass" | "fail",
    "lint": "pass" | "fail"
  }
}

Also update the related issues in the issues array with:
  "status": "fixed",
  "fixed_by": "<FIX_ID>"

Report completion.
```

Wait for each fix to complete before starting the next.

## Step 7: Generate Report

Update `index.json`: set `"status": "complete"`

Use the Write tool to create `.claude/battle-test/report.md`:

```markdown
# Battle Test Report - [PASSED/FAILED]

**Run ID**: <run_id>
**Date**: <date>
**Duration**: <calculated from started_at to now>
**Status**: [PASSED - Ready to Ship / FAILED - Issues Remain]

## Summary

| Metric               | Value |
| -------------------- | ----- |
| Pages Tested         | X     |
| API Endpoints Tested | X     |
| Flows Tested         | X     |
| Total Issues Found   | X     |
| Issues Fixed         | X     |
| Issues Remaining     | X     |

## Wave 1: Testing Results

### UI Testing (Agent: UI-1)

- Pages Tested: X
- Passed: X
- Failed: X

### API Testing (Agent: API-1)

- Endpoints Tested: X
- Passed: X
- Failed: X

### Flow Testing (Agent: FLOW-1)

- Flows Tested: X
- Passed: X
- Failed: X

## Issues Found

| ID        | Severity | Category | Description      | Status     |
| --------- | -------- | -------- | ---------------- | ---------- |
| issue-001 | high     | ui       | Description here | fixed/open |

## Fixes Applied

| Fix ID | File         | Status  | Issues Resolved      |
| ------ | ------------ | ------- | -------------------- |
| rc-001 | src/file.tsx | success | issue-001, issue-002 |

## Remaining Issues (If Any)

[List any unfixed issues with recommended manual actions]

## Production Readiness

[APPROVED FOR PRODUCTION / REQUIRES MANUAL REVIEW]

Reason: [Explain why it's ready or what needs attention]

---

Generated by Battle Test v2.0.0
```

## Progress Display

Throughout execution, output progress:

```
╔═════════════════════════════════════════════════════════════╗
║           BATTLE TEST - Wave 1: Parallel Testing            ║
╠═════════════════════════════════════════════════════════════╣
║  UI Tester (UI-1)     [RUNNING...]                          ║
║  API Tester (API-1)   [RUNNING...]                          ║
║  Flow Tester (FLOW-1) [RUNNING...]                          ║
╚═════════════════════════════════════════════════════════════╝
```

## Error Handling

- **Agent crashes**: Mark assignment as "failed" in index.json, continue with others
- **Dev server stops**: Pause and notify user to restart
- **Fix validation fails**: Mark fix as "failed", continue to next fix
- **Max iterations reached**: Stop and report remaining issues

## Start Execution Now

1. Parse `$ARGUMENTS` for --fix-mode, --focus, --wave flags
2. Create `.claude/battle-test/` directory structure
3. Write initial `index.json`
4. Check dev server is running on localhost:3000
5. Launch Wave 1 agents in parallel (3 Task tool calls in ONE message)
6. Aggregate results
7. If issues: Run Wave 2 diagnosis
8. If fixes needed and allowed: Run Wave 3 fixes
9. Generate report.md
10. Print final status to user
