# Learned Patterns

Automatically extracted from observed retry patterns. Updated after each session.

These patterns help Claude avoid common mistakes by learning from previous errors.

---

## Claude Code Skills: YAML Frontmatter Required

**Discovered**: 2026-01-29
**Context**: Created /compound command but it wasn't recognized as a skill
**Pattern**: All command files in `.claude/commands/` must have YAML frontmatter with `name` and `description` fields
**Why**: Claude Code uses the frontmatter to register skills - without it, the command won't appear in the skill list

```markdown
---
name: my-command
description: Brief description of what this command does.
---

# Command content...
```

## Team Config: Symlink Shared, Copy Project-Specific

**Discovered**: 2026-01-29
**Context**: Setup script was symlinking entire .claude/ directory
**Pattern**: When setting up new projects from team config, symlink shared files (commands, skills, hooks) but COPY files that should be project-specific (learned-patterns.md)
**Why**: Symlinking learned-patterns.md would cause all projects to share the same learnings, mixing unrelated patterns

---

## API Keys: Strip Special Characters from Random Portion

**Discovered**: 2026-01-29
**Context**: Users getting "Invalid API key" errors when key contained double underscores (`mason__abc`)
**Pattern**: When generating API keys with random components, strip leading underscores and dashes from the random portion
**Why**: Special character patterns in keys can cause parsing issues or be mistaken for delimiters

---

## OAuth Re-authentication: Always Include Project Selector

**Discovered**: 2026-01-29
**Context**: OAuth re-auth flow lost project selection, showing "No Supabase project selected" error
**Pattern**: When implementing OAuth refresh/re-auth flows, always preserve or re-prompt for project selection - don't assume it persists from initial auth
**Why**: Token refresh doesn't automatically restore session state like selected project ID

---

## External API Calls: Use Server-Side Proxy for CORS

**Discovered**: 2026-01-29
**Context**: Direct calls to Supabase Management API from browser failed with CORS errors
**Pattern**: External APIs that don't support browser CORS should be proxied through Next.js API routes
**Why**: Browser security policies block cross-origin requests; server-side calls bypass this restriction

---

## CLI Command Defaults: Avoid Hidden Limits

**Discovered**: 2026-01-29
**Context**: `/execute-approved` command had a default 5-item limit that confused users expecting all items to execute
**Pattern**: CLI commands should either process all matching items or require explicit limit flags - no hidden defaults
**Why**: Implicit limits cause confusion when users see partial execution without understanding why

---

## Dashboard Data: Filter by User AND Repository

**Discovered**: 2026-01-29
**Context**: Backlog items from different repositories were mixing together in the dashboard view
**Pattern**: Multi-tenant data queries must filter by both `user_id` AND `repository_id` when showing repository-scoped data
**Why**: Users connect multiple repos - showing all items regardless of selected repo creates confusion

---

## PM Review: No Item Without PRD

**Discovered**: 2026-01-29
**Context**: PM review was only generating 3 PRDs even when discovering more improvements
**Pattern**: EVERY item submitted to the database MUST have a PRD. The process is: Discover → Validate → Generate PRD for EACH → Submit. No artificial limits on count.
**Why**: Items without PRDs cannot be executed properly. The full PRD enables wave-based parallel execution and provides context for the implementation agent.

---

## Skill Instructions: One-Time Setup Must Use Explicit Markers

**Discovered**: 2026-01-30
**Context**: /pm-review asked user same questions repeatedly despite answers being saved
**Pattern**: For one-time initialization in skills:

1. Use an explicit marker comment as the FIRST LINE of the generated file: `<!-- INITIALIZED: true -->`
2. Check for this marker with `head -1 file.md` BEFORE any other logic
3. Add a "MANDATORY PRE-CHECK" section at the very top of the skill
4. Use "THIS IS A HARD STOP" language with bullet list of things NOT to do
5. When generating the file, emphasize the marker is CRITICAL and must be line 1
   **Why**: Agents follow instructions literally. Checking for template placeholders via grep is unreliable. A simple first-line marker check is unambiguous and easy for agents to verify.

---

## Real-Time Dashboard: Write Progress Records for Visualization

**Discovered**: 2026-01-30
**Context**: BuildingTheater was wired up but never showed animations - it subscribed to execution_progress table but nothing wrote to it
**Pattern**: When building real-time visualizations, ensure BOTH sides are implemented: (1) Dashboard subscribes to table changes, (2) CLI/engine WRITES to that table. The visualization is useless if no data flows into it.
**Why**: It's easy to build the display side and forget the data side. Always trace the full data flow from source → table → subscription → UI.

---

## Cross-Repo Features: Don't Filter by Selected Repository

**Discovered**: 2026-01-30
**Context**: BuildingTheater needed to auto-appear when ANY connected repo starts executing, not just the currently selected one
**Pattern**: For features that should work across all repos (execution monitoring, notifications), subscribe WITHOUT repository_id filter. Only filter by repo when showing repo-specific data lists.
**Why**: Users may be viewing Repo A in dashboard while executing Repo B from CLI - the notification/visualization should still appear.

---

## Database Changes: ALWAYS Update MIGRATION_SQL

**Discovered**: 2026-01-30
**Context**: New tables added in code but not in migrations would break existing users
**Pattern**: ANY new table or column MUST be added to `MIGRATION_SQL` in `packages/mason-dashboard/src/app/api/setup/migrations/route.ts`. This is NON-NEGOTIABLE. The migration runs when users click "Update Database Schema" in Settings.
**Why**: The MIGRATION_SQL is the single source of truth. Existing users need to run migrations to get new schema. If code references tables that don't exist in migrations, existing users get errors. All migrations must be idempotent (CREATE IF NOT EXISTS pattern).

---

## Command Versioning: Update ALL THREE Locations

**Discovered**: 2026-01-30
**Context**: Updated /pm-review command but users didn't get the update because versions.json wasn't bumped
**Pattern**: When modifying versioned commands (/pm-review, /execute-approved), MUST update:

1. `packages/mason-commands/versions.json` - manifest with version + required_minimum
2. `packages/mason-commands/commands/<command>.md` - source file
3. `.claude/commands/<command>.md` - local testing copy
   Set `required_minimum` to force all users to auto-update before next execution.
   **Why**: Without setting required_minimum, users continue running outdated commands and miss critical fixes/features.

---

## Feature Ideation: Use Specialized Agent for Creativity

**Discovered**: 2026-01-30
**Context**: PM review wasn't generating "banger ideas" - creative feature suggestions were flat
**Pattern**: For creative ideation tasks (feature suggestions, "banger ideas"), use a dedicated `feature-ideation` subagent with founder/product mindset rather than having the main agent generate ideas inline.
**Why**: Creative ideation benefits from dedicated context and a different thinking mode than systematic code review. Specialized agents produce more innovative suggestions.

---

## API Keys: Per-User Not Per-Repository

**Discovered**: 2026-01-30
**Context**: API keys were being stored per-repository, causing "Invalid API key" for users with multiple repos
**Pattern**: API keys should be stored and validated per-user, not per-repository. A user's API key works across all their connected repos.
**Why**: Users connect multiple repositories - they shouldn't need separate API keys for each. Query by user_id only, not by repository_id.

---

## Supabase Subscriptions: Polling Fallback Required

**Discovered**: 2026-01-30
**Context**: BuildingTheater logs showed "Waiting for logs..." because Supabase realtime subscription silently failed
**Pattern**: Always implement polling fallback for Supabase realtime subscriptions. Subscriptions can fail silently due to connection issues, RLS policies, or network problems.
**Why**: Realtime is not guaranteed. A polling interval (e.g., 3 seconds) ensures data eventually appears even when subscription is broken.

---

## Status Tab Filtering: Features Should Follow Same Rules

**Discovered**: 2026-01-30
**Context**: "Banger Idea" and "Feature Ideas" sections showed on ALL tabs, not respecting status filtering
**Pattern**: Special content sections (featured items, banners, highlighted ideas) should respect the same status filtering as regular items. If viewing "Approved" tab, only show approved featured content.
**Why**: Consistent filtering behavior prevents confusion. Users expect all visible content to match their current filter selection.

---

## MANDATORY: Version Bump on Any Execution/Dashboard Change

**Discovered**: 2026-01-31
**Context**: Implemented checkpoint progress tracking but forgot to bump command versions, requiring user to remind
**Pattern**: ANY change to execution engine, progress tracking, dashboard visualization, or schema that affects CLI behavior MUST include:

1. Bump `versions.json` version number
2. Set `required_minimum` to the new version (forces auto-update)
3. Update command `.md` file frontmatter version
4. Update local `.claude/commands/` copy

**Checklist (MANDATORY before committing execution-related changes):**

- [ ] `packages/mason-commands/versions.json` - bump version AND set required_minimum
- [ ] `packages/mason-commands/commands/<command>.md` - bump frontmatter version
- [ ] `.claude/commands/<command>.md` - bump frontmatter version to match

**Why**: Users running old command versions won't get new features/fixes. Setting required_minimum forces auto-update on next run. This is NON-NEGOTIABLE for any change that affects how executions work or are displayed.

---

## Deduplication: Only Filter Against Active Backlog Items

**Discovered**: 2026-01-31
**Context**: User clarified that rejected/deleted items should not prevent suggestions from being presented again
**Pattern**: When deduplicating PM review suggestions, ONLY check against items with `status IN ('new', 'approved')`. Do NOT filter against rejected or deleted items.
**Why**: Users may change their minds - just because an item was previously rejected doesn't mean it shouldn't be suggested again in a future review. Completed items don't need checking either - if the problem was fixed, it won't show up as a problem anymore.

---

## UI Visualization: Practical Information Over Entertainment

**Discovered**: 2026-01-31
**Context**: Replaced BuildingTheater (animated 3D construction site) with ExecutionStatusModal (progress timeline)
**Pattern**: For execution/progress visualization, prioritize information density over visual entertainment:

- Show checkpoint timeline with status indicators
- Display current file and lines changed
- Show validation status grid (TS, ESLint, Build, Tests)
- Provide clear error state with actionable next steps
- Celebration modal for success with confetti + accomplishment summary

**Why**: Users want to understand what Mason is doing at each moment. Anxiety comes from uncertainty, not from lack of pretty animations. A clear timeline with percentage progress is more reassuring than 3D buildings.

---

## Command Step Ordering: Prerequisite Steps MUST Come First

**Discovered**: 2026-02-01
**Context**: pm-review was submitting items WITHOUT PRDs because PRD generation (Step 7) was numbered AFTER submission (Step 6)
**Pattern**: When a command has steps with dependencies (e.g., "generate PRD" must happen before "submit to database"), the NUMERICAL ORDERING of steps must match the EXECUTION ORDER. Agents follow step numbers sequentially.

**Bad example (causes bugs):**

- Step 6: Submit to database
- Step 7: Generate PRDs (says "include PRD in Step 6")

**Good example (correct ordering):**

- Step 6: Generate PRDs, risk analysis, evidence
- Step 7: Submit to database (ONLY after Step 6 completes)

**Why**: Agents read commands linearly and execute steps in numerical order. If Step 7 says "include this in Step 6", but Step 6 already executed, the data won't be included. The step that produces data MUST be numbered BEFORE the step that consumes it.

---

## Plan Implementation: Check Pre-Existing Changes Against Plan

**Discovered**: 2026-02-01
**Context**: Implementing E2E schema alignment plan - git status showed pre-existing changes (adding execution_logs table) but plan explicitly said "Do NOT add mason_execution_logs table"
**Pattern**: Before implementing a plan, check `git status` for uncommitted changes. If any conflict with explicit plan directives (e.g., plan says "Do NOT add X" but X is already staged), revert those changes first with `git checkout <file>`.
**Why**: Pre-existing changes from previous work can conflict with new plan requirements. Implementing the plan on top of conflicting changes leads to incorrect final state. Clean slate first, then implement.

---

## Polling Cascade: Coordinate Independent Refresh Mechanisms

**Discovered**: 2026-02-01
**Context**: Dashboard "spazzed out" with ERR_INSUFFICIENT_RESOURCES - multiple systems (useExecutionListener, useRealtimeBacklog, useAutoMigrations, user record creation) all polling simultaneously without coordination
**Pattern**: When multiple independent polling/retry mechanisms exist, they MUST be coordinated:

1. **Add backoff on failures** - don't hammer the database when requests fail
2. **Batch related requests** - combine queries that always run together
3. **Disable polling when realtime is connected** - don't duplicate data fetching
4. **Deduplicate subscription channels** - UPDATE/INSERT/DELETE can share one channel
5. **Add request queuing** - prevent burst of 10+ concurrent connections

**Why**: Independent systems each polling every 3 seconds creates exponential connection usage. When one system starts retrying failures, others follow, causing resource exhaustion. Coordination prevents cascade failures.

---

## Banger-Only Mode: Single Focus for Maximum Impact

**Discovered**: 2026-02-01
**Context**: User requested a "banger-only" mode for pm-review that generates ONE transformative feature idea with full PRD
**Pattern**: When implementing focused "banger-only" or "single idea" modes:

1. Use multiple subagents to understand the app holistically first
2. Generate 10 ideas, then critically evaluate to pick THE BEST one
3. Only the winning idea gets full validation, PRD, and risk analysis
4. Clearly communicate this is a different mode than normal pm-review
5. Provide easy trigger mechanism (e.g., button that gives copy/paste command)

**Why**: Sometimes users want one high-impact idea rather than a list of incremental improvements. A single focus allows for deeper analysis and higher-quality output.

---

## Progress Calculation: Match Frontend Display to Backend Data

**Discovered**: 2026-02-01
**Context**: Execution modal showed "0/1 items completed" and "0%" even after multiple phases completed - checkpoints_completed array wasn't being written to
**Pattern**: When building progress tracking:

1. **Default total must match actual process** - if default is 12 checkpoints but process has 8, percentage will be wrong
2. **Verify both write AND read paths** - CLI must WRITE checkpoints, dashboard must READ them
3. **Test with real execution** - don't rely on unit tests alone, trace actual data flow
4. **Formula must be explicit**: `percentage = (completed.length / total) * 100`
5. **Update checkpoint_total dynamically** when file count is known (formula: 5 + fileCount + 4 + 2 + 1)

**Why**: Progress displays are critical for user confidence. Incorrect percentages (0% when actually progressing) cause anxiety and lost trust.

---

## Git URL Parsing: Strip .git Suffix Before Extracting Path

**Discovered**: 2026-02-02
**Context**: pm-review items had `repository_id=null` despite repo being connected - regex wasn't stripping `.git` suffix
**Pattern**: When parsing git remote URLs to extract owner/repo:

1. **Strip `.git` suffix FIRST** before any other extraction
2. **Test with real URLs** - `https://github.com/owner/repo.git` and `git@github.com:owner/repo.git`
3. **The regex `(\.git)?$` doesn't work** when preceded by `[^/]+` because the greedy match consumes `.git`

**Correct approach:**

```bash
# Two-step: strip .git, then extract
REPO_FULL_NAME=$(echo "$GIT_REMOTE" | sed -E 's/\.git$//' | sed -E 's|.*github\.com[:/]||')
```

**Why**: Silent failures in URL parsing cause `repository_id=null` which breaks dashboard filtering. Items appear inserted successfully but don't show in repo-filtered views.

---

## Command Modes: All Modes Must Handle All Parameters

**Discovered**: 2026-02-02
**Context**: pm-review banger mode ignored focus context - ran full codebase analysis instead of focused area
**Pattern**: When a command supports parameters (like focus context), EVERY mode must explicitly handle those parameters:

1. **Audit all modes** when adding new parameters - don't assume they're inherited
2. **Each mode section** must explicitly show how to use the parameter
3. **Test each mode** with the new parameter before shipping

**Example (bad):**

```markdown
## Focus Context

The command supports "Focus on:" context...

## Mode D: Banger Mode

[No mention of focus context - OOPS!]
```

**Example (good):**

```markdown
## Mode D: Banger Mode

...
**Focus Context Support:**
Banger mode fully supports focus context. When provided:

- Exploration narrows to focused area
- Ideas must be relevant to focused area
```

**Why**: Users expect parameters to work consistently across modes. Silent ignoring of parameters causes confusion and wasted runs.

---

## Command Routing: Visual Hard Stops for Mode Branching

**Discovered**: 2026-02-02
**Context**: pm-review banger mode executed 12 items instead of 1 - agent didn't follow mode routing instructions
**Pattern**: When a command has multiple execution modes with different behaviors, text instructions alone are NOT sufficient. Add visual "HARD STOP" sections with box diagrams that make it impossible to miss:

1. **Visual prominence** - Use ASCII box art or prominent formatting
2. **Explicit DO NOT list** - State what the mode must NOT do
3. **Explicit ONLY list** - State what the mode MUST do
4. **Expected output** - Show what correct execution looks like
5. **Failure indicator** - "If you submit more than X, YOU HAVE FAILED"

**Example (insufficient):**

```markdown
**ROUTING LOGIC:**
IF MODE == "banger": Skip to Mode D section
```

**Example (sufficient):**

```markdown
╔══════════════════════════════════════════════════════════════════════════╗
║ BANGER MODE DETECTED ║
║ DO NOT launch 8 category agents ║
║ DO NOT generate 8-25 items ║
║ ONLY produce EXACTLY 1 banger item ║
║ Expected output: "All 1 items submitted successfully" ║
║ If you submit more than 1 item, YOU HAVE FAILED. ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Why**: LLMs can skip over text instructions, especially when document is long. Visual prominence and explicit failure conditions create stronger routing enforcement.

---

## Repository ID: Hard Stop Required, Not Warning

**Discovered**: 2026-02-02
**Context**: PM review items created with repository_id=null didn't appear in dashboard repo-filtered views
**Pattern**: When repository matching fails in CLI commands, use a HARD STOP (exit 1) not a warning. Items without repository_id break dashboard filtering. Never allow submission to proceed without valid repository association.
**Why**: Warnings get ignored by agents. Items with null repository_id silently disappear from repo-filtered views, causing confusion about "where did my items go?"

---

## Command Structure: Self-Contained Mode Sections

**Discovered**: 2026-02-02
**Context**: pm-review 2,428-line command was failing to follow instructions - agents would skip sections, miss requirements, or blend modes
**Pattern**: When a command supports multiple modes, make each mode section FULLY SELF-CONTAINED:

1. **Universal Requirements Table** - Put at top with checkboxes agents can mentally tick
2. **Each mode repeats its requirements inline** - Don't say "see Section X" - include it right there
3. **Reduce total length** - Long documents cause agents to skip sections (2,428 → 797 lines)
4. **Use anchor markers instead of line numbers** - Line numbers break when file changes
5. **Validation gates per mode** - Each mode specifies its own pass/fail criteria

**Why**: Agents read linearly and have limited attention. A 2000+ line command with cross-references fails because agents don't reliably jump around. Self-contained sections with repeated requirements work better than DRY principles.

---

## Wizard UX: Educational Selection for Complex Commands

**Discovered**: 2026-02-02
**Context**: Users didn't understand pm-review modes from dropdown - needed to read docs to know what "Standard Review" vs "Banger Mode" meant
**Pattern**: When UI triggers commands with multiple modes/options:

1. **Step-by-step wizard** instead of single dropdown
2. **Educational descriptions** for each option explaining what it does
3. **Expected output preview** - "Generates 8-25 items" vs "Generates exactly 1 item"
4. **Time expectations** - Help users understand scope
5. **Review step** - Show the complete command before execution
6. **Copy-paste instructions** - Users run commands in terminal, not through UI buttons

**Why**: Complex commands with multiple modes need explanation. A dropdown with "Mode A, Mode B, Mode C" requires users to read documentation. An educational wizard teaches as it guides.

---

## Daemon Reliability: Exponential Backoff and Error Visibility

**Discovered**: 2026-02-03
**Context**: Mason autopilot daemon failed repeatedly for 2+ hours with "Claude Code process exited with code 1" - no visibility into actual cause, no backoff
**Pattern**: Long-running daemons that call external services MUST implement:

1. **Consecutive failure tracking** - Count failures, enter cooldown after 3+ consecutive
2. **Exponential backoff** - Double the wait time after each failure (5min → 10min → 20min → 30min max)
3. **Error detail extraction** - Parse error messages for known patterns (rate limit, auth, timeout)
4. **Error logging to database** - Store error details for debugging (not just "exited with code 1")
5. **Cooldown with helpful messages** - Tell user what to check (credentials, API status)
6. **Success resets everything** - After success, reset failure counter and backoff interval

**Why**: Without these, a daemon will spam failing requests indefinitely, wasting resources and making debugging impossible. The pattern of "worked for hours then broke" usually indicates rate limits or credential expiration.

---

## API Response Parsing: Check for Wrapper Objects

**Discovered**: 2026-02-04
**Context**: pm-review reported "Repository Not Connected" despite repo being connected - jq was parsing wrong path
**Pattern**: When parsing API responses with jq, verify the actual response structure. Many APIs wrap data:

- Express/Next.js: `{ "success": true, "data": { ... } }`
- GraphQL: `{ "data": { ... }, "errors": [...] }`

Check the actual response before writing jq queries:

```bash
# Debug first
curl -s "$API_URL" | jq '.'

# Then use correct path
USER_ID=$(echo "$RESPONSE" | jq -r '.data.user_id')  # NOT .user_id
```

**Why**: jq silently returns `null` for missing paths. This causes cascading failures (like "Repository Not Connected") with no error message explaining why.

---

## Environment Variables: Check for Overriding Auth

**Discovered**: 2026-02-04
**Context**: Claude Agent SDK used API credits instead of Pro Max subscription - ANTHROPIC_API_KEY env var was overriding OAuth
**Pattern**: When authentication isn't working as expected, check for environment variable overrides:

```bash
env | grep -i anthropic
env | grep -i openai
env | grep -i api_key
```

Environment variables often take precedence over config file auth. Unset them if they're overriding desired auth:

```bash
unset ANTHROPIC_API_KEY
```

**Why**: Multiple auth methods can coexist (OAuth in config file, API key in env var), and the wrong one may take precedence. This causes silent billing issues - charges to the wrong account.

---

## Tailwind: Never Use Dynamic Template Literal Classes

**Discovered**: 2026-02-04
**Context**: Analytics page stat cards had broken styling in production - `text-${color}-400` classes were purged during build
**Pattern**: NEVER construct Tailwind classes dynamically with template literals. Tailwind's JIT compiler statically analyzes source files and cannot detect dynamically constructed class names.

**Bad (classes get purged in production):**

```typescript
const colorClass = `text-${color}-400 bg-${color}-900/20`;
```

**Good (all classes statically analyzable):**

```typescript
const STAT_COLOR_CLASSES: Record<string, { text: string; bg: string }> = {
  blue: { text: 'text-blue-400', bg: 'bg-blue-900/20' },
  green: { text: 'text-green-400', bg: 'bg-green-900/20' },
};
```

**Why**: Works perfectly in dev mode (JIT generates on demand) but breaks in production builds where tree-shaking removes classes it can't find as complete strings. This is a silent failure - no error, just missing styles.

---

## Daemon Limits: Track Across Cycles, Not Per-Cycle

**Discovered**: 2026-02-04
**Context**: Autopilot with maxItemsPerDay=2 executed 96 items/day because each 30-min daemon cycle reset the counter
**Pattern**: When a daemon has a daily limit (maxItemsPerDay), the limit MUST be enforced by querying actual records from the database for the current 24h window, not by using an in-memory counter that resets each cycle.

```typescript
// BAD: In-memory counter resets each cycle
let executedThisCycle = 0;
while (executedThisCycle < maxItemsPerDay) { ... }

// GOOD: Query actual daily count from database
const dailyCount = await getDailyExecutedCount(supabase, userId);
const remaining = maxItemsPerDay - dailyCount;
```

**Why**: Daemons restart, crash, and run multiple cycles per day. In-memory state is unreliable for enforcing daily limits. The database is the source of truth.

---

## Schema Drift: Audit Code References Against Migrations

**Discovered**: 2026-02-04
**Context**: 8 tables referenced in TypeScript code had no migration files - fresh deployments failed silently
**Pattern**: Periodically audit for schema drift by searching for table references in code and comparing against migration files:

```bash
# Find all table references in code
grep -roh "mason_[a-z_]*" packages/mason-dashboard/src --include="*.ts" --include="*.tsx" | sort -u

# Compare against migration files
ls packages/mason-dashboard/src/db/migrations/
```

Every table referenced in code MUST have a corresponding migration. Missing migrations = silent failures for new users (tables don't exist) while working fine for existing users (tables already exist from ad-hoc creation).

**Why**: Schema drift is invisible during development because dev databases accumulate tables from ad-hoc testing. Only fresh deployments reveal the gap.

---

## Autopilot Guards: Default to Skip on Query Errors

**Discovered**: 2026-02-04
**Context**: Autopilot approved-items count query returned null on error, which passed the `>= maxItemsPerDay` check, causing unwanted pm-review runs
**Pattern**: When a daemon guard checks database state to decide whether to proceed, query failures (null/undefined) MUST default to SKIP (safe fallback), not PROCEED:

```typescript
// BAD: null passes the >= check, daemon proceeds
const count = await getApprovedCount(); // returns null on error
if (count >= maxItemsPerDay) skip(); // null >= 5 is false, proceeds!

// GOOD: null defaults to skip
const count = await getApprovedCount();
if (count === null || count > 0) skip(); // error = skip = safe
```

**Why**: Uncontrolled daemon actions (generating/executing items) are much more expensive to undo than a skipped cycle. When in doubt, don't act.

---

## Execute-Approved: Deduplicate Across Parallel Agent Waves

**Discovered**: 2026-02-04
**Context**: Multiple execute-approved waves implemented overlapping features - CSP headers added twice (941d412, 4628443), N+1 fix done twice (c1dc2dd, e8fe1bf), pagination done twice (6eeb545, 85362a1)
**Pattern**: When running parallel agent waves from a backlog, check for semantic overlap between items BEFORE dispatching. Items like "Add CSP headers" and "Add security headers including CSP" are duplicates even if they have different IDs.

**Mitigation:**

1. Before each wave, compare remaining items for semantic similarity
2. If two items touch the same files/features, merge or sequence them
3. After each wave, verify no duplicate code was committed

**Why**: Parallel agents don't coordinate - they'll both implement the same feature independently, leading to merge conflicts or duplicate code that needs manual cleanup.

---

## Claude Agent SDK: Explicit Executable Path Required

**Discovered**: 2026-02-04
**Context**: Autopilot Agent SDK calls failed with "Claude Code executable not found" despite `claude` being in PATH
**Pattern**: The Claude Agent SDK (`@anthropic-ai/claude-code`) requires an explicit `pathToClaudeCodeExecutable` option - it does NOT search PATH automatically.

```typescript
// BAD: Relies on PATH (fails)
const session = new ClaudeCodeSession({
  /* no path */
});

// GOOD: Explicit path
const claudePath = findClaudeExecutable(); // Check ~/.local/bin, /usr/local/bin, `which claude`
const session = new ClaudeCodeSession({
  pathToClaudeCodeExecutable: claudePath,
});
```

**Why**: The SDK runs as a library, not a shell command, so it doesn't inherit shell PATH resolution. Always pass the explicit path.

---

## Command Complexity: Delegate to Shared Skills Instead of Inline Logic

**Discovered**: 2026-02-05
**Context**: execute-approved had ~300 lines of inline E2E testing logic (4 phases, hardcoded endpoints, Mason-specific prompts) that was replaced by a single `/e2e-test` skill invocation
**Pattern**: When a command accumulates complex inline logic for a reusable capability (E2E testing, code review, deployment validation), extract it to a shared skill rather than growing the command file. Signs it's time to extract:

1. Logic exceeds 50 lines within a command
2. Hardcoded values specific to current repo (endpoint lists, page paths)
3. The capability is useful across multiple commands or repos
4. Multiple phases/agents are orchestrated inline

Replace with a skill that auto-detects context (pages, endpoints, routes) rather than hardcoding them.
**Why**: Inline logic in commands creates maintenance burden, breaks when repo structure changes, and can't be reused. A shared skill with auto-detection works across all repos without modification.

---

## Health Endpoints: Graceful Fallback for Unapplied Migrations

**Discovered**: 2026-02-05
**Context**: /api/health endpoint needed DLQ metrics from a new migration (015) that existing users might not have applied yet
**Pattern**: When a health endpoint or status API depends on schema from a recent migration, always wrap the query in a try/catch and return `null` for that section rather than crashing the entire endpoint:

```typescript
// GOOD: Graceful degradation
let dlqMetrics = null;
try {
  dlqMetrics = await getDlqMetrics(supabase);
} catch {
  // Migration not applied yet - return null, don't crash
}
return { status: 'ok', dlq: dlqMetrics };
```

**Why**: Health endpoints are critical for monitoring. If they crash because an optional migration isn't applied, you lose visibility into the entire system. Partial data is always better than a 500 error.

---

## Silent Failure Accumulation: Monitor Error Tables Proactively

**Discovered**: 2026-02-05
**Context**: Autopilot errors accumulated silently in mason_autopilot_errors table with no alerting or dashboard visibility - failures were invisible until manually querying the DB
**Pattern**: Any system that logs errors to a database table MUST also have:

1. **Metrics endpoint** - Count, age, error type breakdown (DLQ pattern)
2. **Health classification** - healthy/warning/critical based on error depth and growth rate
3. **Alerting threshold** - Dispatch notifications after N consecutive failures (e.g., 3+)
4. **Retry mechanism** - Bulk retry capability with retry_count tracking

Don't just log errors - monitor them.
**Why**: Error tables without monitoring are write-only graveyards. Issues accumulate for days/weeks before anyone notices. Proactive alerting turns silent failures into actionable incidents.

---

## Auth Architecture: /admin/backlog Uses Client-Side Auth

**Discovered**: 2026-02-05
**Context**: Flow tester flagged /admin/backlog as "accessible without auth" - false positive
**Pattern**: The `/admin/backlog` page is NOT a server-side protected route. It uses `useSession()` client-side and renders different states:

- **Authenticated**: Full backlog UI with items, actions, filters
- **Unauthenticated**: "Let's get you set up" empty state with "Complete Setup" CTA

This is BY DESIGN. The page is intentionally accessible to unauthenticated users but shows limited content. Do not flag this as a security issue in E2E testing.
**Why**: E2E flow testers will consistently flag this as a "protected route accessible without auth" false positive unless they understand the client-side auth pattern.

---

## E2E Testing: Execute-Approved Delegates to /e2e-test Skill

**Discovered**: 2026-02-05
**Context**: Refactored execute-approved from 300 lines of inline E2E to delegating to global /e2e-test skill
**Pattern**: Execute-approved Step 8.6 invokes the global `/e2e-test` skill via the Skill tool. It does NOT contain inline E2E logic. The skill auto-detects pages from `src/app/**/page.tsx` and API routes from `src/app/api/**/route.ts`. Results are read from `.claude/e2e-test/results/` and progress is updated in Supabase.
**Why**: Centralizing E2E in a global skill means improvements benefit all repos and execute-approved stays focused on execution logic.

---

## Privacy: API Keys Must ONLY Exist in User's DB, Never Central DB

**Discovered**: 2026-02-06
**Context**: User (Jonny Lock) got "REPOSITORY NOT CONNECTED" error despite completing setup. Root cause: Install Modal wrote API key to user's Supabase, but CLI validation checked central Supabase.
**Pattern**: Per the privacy architecture, API keys (Mason CLI + AI provider keys) must ONLY be stored in and validated against the user's own Supabase database. The central DB should only contain user identity (mason_users) and connected repos (mason_github_repositories).

**CLI validation must query user's Supabase directly:**

```bash
KEY_HASH=$(echo -n "$apiKey" | sha256sum | cut -d' ' -f1)
KEY_DATA=$(curl -s "${supabaseUrl}/rest/v1/mason_api_keys?key_hash=eq.${KEY_HASH}&select=user_id" \
  -H "apikey: ${supabaseAnonKey}" -H "Authorization: Bearer ${supabaseAnonKey}")
```

**The dual-DB gotcha:** When writing data that the CLI needs to read, ensure it goes to the USER's DB (not just central). Settings > GitHub must sync repos to BOTH databases.

**Why**: The central server should never have access to user secrets. Split-brain between two databases causes silent auth failures that are extremely hard to debug.

---

## Dual-Write: Settings > GitHub Must Sync Repos to User's DB

**Discovered**: 2026-02-06
**Context**: Settings > GitHub page only wrote repos to central DB via POST /api/github/repositories. CLI commands queried user's Supabase for repos and found nothing.
**Pattern**: When connecting repos from any UI path (setup wizard OR settings page), always write to BOTH:

1. Central DB (for admin visibility via POST /api/github/repositories)
2. User's own Supabase (for CLI validation via userClient.from(TABLES.GITHUB_REPOSITORIES).upsert(...))

The setup wizard (RepoStep) already did dual-write. Settings > GitHub page was missing the user DB write.
**Why**: CLI commands validate locally against user's Supabase. If repos only exist in central DB, CLI shows "REPOSITORY NOT CONNECTED".

---

## Supabase REST API: Always Validate Insert Response

**Discovered**: 2026-02-06
**Context**: pm-banger reported success but item never appeared in dashboard. `curl -s` silently swallowed the Supabase error response.
**Pattern**: When inserting via Supabase REST API, ALWAYS capture and validate the HTTP response:

```bash
# BAD: Silent failure - no response check
curl -s -X POST "${url}/rest/v1/table" -d '[{...}]'

# GOOD: Capture HTTP code and body, exit on failure
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${url}/rest/v1/table" \
  -H "Prefer: return=representation" -d '[{...}]')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
[ "$HTTP_CODE" != "201" ] && echo "ERROR: HTTP $HTTP_CODE" && exit 1
```

Also document CHECK constraints inline in the command template so agents know valid values:

- `area`: MUST be `"frontend"` or `"backend"` (DB CHECK constraint)
- `type`: MUST be one of the 8 category values (DB CHECK constraint)

**Why**: PostgREST returns 400 on constraint violations (invalid area, type, score ranges). Without response validation, commands report false success while the insert silently fails.

---

## SSRF Prevention: Validate User-Supplied URLs in Headers

**Discovered**: 2026-02-06
**Context**: Security pentest found that API routes accepting `x-supabase-url` header could be used for SSRF by supplying arbitrary URLs
**Pattern**: Any API route that creates a client from a user-supplied URL (via headers, body, query params) MUST validate the URL server-side before use. Create a shared validation function and apply it to ALL routes:

```typescript
// lib/api/validation.ts
export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.supabase.co') && parsed.protocol === 'https:'
    );
  } catch {
    return false;
  }
}
```

Apply to every route that does `createClient(supabaseUrl, ...)` where `supabaseUrl` comes from request headers.
**Why**: Without validation, an attacker can point the server at internal services (localhost, metadata endpoints, internal APIs). This is OWASP Top 10 SSRF.

---

## String Matching: Case-Insensitive Comparison for External Identifiers

**Discovered**: 2026-02-06
**Context**: PM commands failed with "REPOSITORY NOT CONNECTED" because git remote URL had different casing than GitHub's canonical `full_name`
**Pattern**: When matching identifiers from different external sources (git remote vs GitHub API), ALWAYS use case-insensitive comparison:

```bash
# BAD: Exact match fails when casing differs
REPOSITORY_ID=$(echo "$REPOS" | jq -r --arg name "$REPO_NAME" '.[] | select(.github_full_name == $name) | .id')

# GOOD: Case-insensitive match
REPOSITORY_ID=$(echo "$REPOS" | jq -r --arg name "$REPO_NAME" '.[] | select((.github_full_name | ascii_downcase) == ($name | ascii_downcase)) | .id')
```

This applies to: repo names, usernames, email addresses, branch names - any string that users or systems may store in different cases.
**Why**: Git allows any casing in clone URLs. GitHub stores canonical casing. Users don't control or notice the mismatch. Exact comparison causes silent failures.

---

## Data Columns: Never Overwrite Existing Fields to Store Errors

**Discovered**: 2026-02-06
**Context**: The `/fail` endpoint stored error messages by overwriting the `solution` field with `[EXECUTION FAILED: ...]`, destroying the original solution text
**Pattern**: When adding error/status information to records, ALWAYS add a dedicated column rather than overwriting existing data:

```typescript
// BAD: Destroys original data
updateData.solution = `[EXECUTION FAILED: ${error_message}]`;

// GOOD: Dedicated column preserves original
updateData.error_message = error_message;
```

Add the column via migration, update the type definition, and display it separately in the UI.
**Why**: Overwriting existing fields destroys data that users may need. The original solution text is valuable for understanding what was attempted. Separate error columns enable independent display (e.g., red error banner above preserved solution text).

---

## Migration Systems: Single Source of Truth When Multiple Exist

**Discovered**: 2026-02-06
**Context**: Mason had two migration systems (MIGRATION_SQL in route.ts + numbered .sql files in mason-migrations/) that diverged in column types, names, and constraints
**Pattern**: When a codebase has multiple migration systems, reconcile them immediately:

1. Designate ONE as the canonical source of truth
2. Generate all others FROM the canonical source
3. Document which is canonical with prominent comments: "DO NOT edit this file directly"
4. Audit for type mismatches (UUID vs TEXT), naming differences (benefits vs benefits_json), and constraint divergences

**Divergence symptoms:** Fresh installs work differently from upgrades, type errors that only appear in one environment, column-not-found errors that are intermittent.
**Why**: Schema divergence causes insidious bugs that depend on which migration path a user took. The bugs only surface for SOME users, making them extremely hard to reproduce and debug.
