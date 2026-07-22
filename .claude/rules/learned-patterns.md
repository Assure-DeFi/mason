# Learned Patterns

Mason-specific patterns learned from past bugs and mistakes. These prevent known regressions.

---

## Database & Schema

- **ALWAYS update MIGRATION_SQL** - Any new table/column MUST be added to `MIGRATION_SQL` in `packages/mason-dashboard/src/app/api/setup/migrations/route.ts`. NON-NEGOTIABLE. All migrations must be idempotent (`CREATE IF NOT EXISTS`).
- **Single migration source of truth** - If multiple migration systems exist, designate ONE as canonical. Generate all others from it. Divergence causes intermittent bugs depending on which migration path a user took.
- **Schema drift audit** - Periodically compare table references in code (`grep -roh "mason_[a-z_]*"`) against migration files. Missing migrations = silent failure for new users.
- **Never overwrite fields to store errors** - Add a dedicated `error_message` column. Never clobber `solution` or other data fields with error text.
- **Filter queries by user_id AND repository_id** - Multi-tenant queries for repo-scoped data must filter both. Otherwise items from different repos mix.

## Command Versioning (MANDATORY)

When modifying `/pm-review` or `/execute-approved`, ALL THREE must update:

1. `packages/mason-commands/versions.json` - version + required_minimum
2. `packages/mason-commands/commands/<command>.md` - frontmatter version
3. `.claude/commands/<command>.md` - local copy

Set `required_minimum` to force auto-update. This applies to ANY change affecting execution, progress tracking, dashboard visualization, or schema.

## Command Authoring

- **Step ordering = execution ordering** - Steps with dependencies must be numbered in execution order. Agents execute sequentially. Step that produces data MUST come before step that consumes it.
- **Self-contained mode sections** - Each mode repeats its requirements inline. Never "see Section X". Keep total length under 800 lines.
- **Visual hard stops for mode branching** - Use ASCII box art with explicit DO NOT / ONLY lists and failure indicators. Text instructions alone get skipped.
- **All modes must handle all parameters** - When adding a parameter (like focus context), audit every mode explicitly.
- **Repository ID: Hard stop, not warning** - If repo matching fails, `exit 1`. Never allow submission with null repository_id.

## Privacy Architecture

- **API keys ONLY in user's DB** - Never central DB. CLI validation must query user's Supabase directly:
  ```bash
  KEY_HASH=$(echo -n "$apiKey" | sha256sum | cut -d' ' -f1)
  curl -s "${supabaseUrl}/rest/v1/mason_api_keys?key_hash=eq.${KEY_HASH}&select=user_id" \
    -H "apikey: ${supabaseAnonKey}"
  ```
- **Dual-write repos to BOTH databases** - Setup wizard AND settings page must write to central DB (admin visibility) AND user's Supabase (CLI validation). Missing either causes "REPOSITORY NOT CONNECTED".

## API & Data Integrity

- **Validate Supabase REST insert responses** - Always capture HTTP status. `curl -s` silently swallows errors:
  ```bash
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${url}/rest/v1/table" \
    -H "Prefer: return=representation" -d '[{...}]')
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  [ "$HTTP_CODE" != "201" ] && echo "ERROR: HTTP $HTTP_CODE" && exit 1
  ```
- **Check API response wrapper objects** - jq silently returns `null` for wrong paths. Many APIs wrap: `{ "success": true, "data": { ... } }`. Debug with `jq '.'` first.
- **Case-insensitive matching for external identifiers** - Git remote URLs vs GitHub `full_name` may differ in casing. Always `ascii_downcase` both sides.
- **Strip .git suffix before parsing** - Two-step: `sed -E 's/\.git$//'` then extract owner/repo.

## Security

- **SSRF: Validate user-supplied URLs** - Any route accepting `x-supabase-url` header must validate hostname ends with `.supabase.co` and protocol is `https:`. Shared function in `lib/api/validation.ts`.

## Daemon Patterns

- **Exponential backoff on failures** - Track consecutive failures. After 3+, enter cooldown (5min -> 10min -> 20min -> 30min max). Success resets everything. Log errors to database with details.
- **Guard queries: default to SKIP on error** - When a daemon checks DB state to decide whether to proceed, `null`/error MUST mean "skip this cycle", not "proceed". Uncontrolled actions are expensive to undo.
- **Claude Agent SDK needs explicit path** - Pass `pathToClaudeCodeExecutable` explicitly. The SDK does NOT search PATH.

## UI Rules

- **YAML frontmatter required** for all `.claude/commands/` files. Must have `name` and `description`.
- **PM review: Every item needs a PRD** - Discover -> Validate -> Generate PRD for EACH -> Submit. No items without PRDs.
- **Deduplication: Only against active items** - Filter against `status IN ('new', 'approved')`. Rejected/deleted items don't block re-suggestion.
- **Special sections respect tab filtering** - Banger ideas, featured content must respect the active status filter tab.
- **Auth: /admin/backlog uses client-side auth** - This is BY DESIGN. Shows different states for auth/unauth. Not a security bug. Don't flag in E2E testing.
- **Health endpoints: Graceful fallback** - Wrap queries depending on recent migrations in try/catch. Return `null` for that section, don't crash the entire endpoint.

## Security: httpOnly + Signal Cookie Pattern

**Discovered**: 2026-02-07
**Context**: OAuth callback was storing tokens in a client-readable cookie, exposing them to XSS
**Pattern**: Store sensitive tokens in httpOnly cookie, set a separate non-sensitive flag cookie (`supabase_oauth_ready=true`) so client JS knows the flow completed, then read tokens via a server-side API endpoint (`/api/auth/supabase/session`)
**Why**: httpOnly cookies can't be read by JavaScript (XSS-safe), but client code still needs to know when auth completed. The flag cookie signals readiness without exposing secrets.

## Security: SSRF Covers ALL Protocols

**Discovered**: 2026-02-07
**Context**: SSRF validation existed for HTTP URLs but PostgreSQL connection strings bypassed it
**Pattern**: Validate hostnames for EVERY protocol that accepts user-supplied connection targets - HTTP, PostgreSQL, WebSocket, etc. Block private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`, `localhost`, `::1`) and require `.supabase.co` suffix for all connection types.
**Why**: Attackers can SSRF through any network-capable library, not just HTTP fetchers. Each protocol needs its own validation function.

## Security: Credential Files Need .gitignore on ALL Install Paths

**Discovered**: 2026-02-07
**Context**: Users with public repos exposed Supabase credentials because no install path added mason.config.json to .gitignore
**Pattern**: When writing credential files from ANY code path (install scripts, CLI init commands, dashboard setup), also add those files to the user's `.gitignore`. Make it idempotent (check before adding). Cover ALL paths that create the file, not just one.
**Why**: First fix covered install.sh but missed the autopilot init path. Users who installed via a different path were still exposed. Every path that creates a secret file must protect it.

## Performance: Keep Pattern Files Under 40k Characters

**Discovered**: 2026-02-07
**Context**: Both user-patterns.md and learned-patterns.md grew past 1480 lines, triggering context performance warnings
**Pattern**: Consolidate pattern files periodically. Remove verbose formatting, deduplicate cross-file patterns, cut one-time fixes that are already implemented. Target ~150 lines max per file.
**Why**: These files are loaded into every Claude session's context. Oversized pattern files degrade response quality and speed.

## Bash: Sanitize Config File Values Same as Env Vars

**Discovered**: 2026-02-09
**Context**: `jq -r '.supabaseUrl' mason.config.json` returned a URL with invisible characters, causing `curl` to fail with "No host part in URL"
**Pattern**: Values from JSON config files need the same sanitization as environment variables. Always strip whitespace AND non-printable characters: `jq -r '.field' file.json | tr -d '[:space:]' | sed 's/[^[:print:]]//g'`
**Why**: Config files edited by multiple tools (dashboards, editors, copy-paste) accumulate invisible characters. `jq -r` does not strip them.

## Bash: Prefer Supabase `select` Over Complex jq

**Discovered**: 2026-02-09, **Reinforced**: 2026-02-21
**Context**: Complex jq expressions with `!=` operators failed even when written to temp files, because shell escaping mangles them
**Pattern**: Push filtering to Supabase's REST API using `select` and query params instead of fetching all fields and filtering with jq. For simple extractions (`jq '.field'`), temp files work. For anything with `!=`, quotes, or nested logic — use Supabase `select=field1,field2` and `eq.`/`neq.` query operators server-side. Also: when counting records by status, omit `limit` or set it high enough to cover all rows (default 1000, but explicit `limit=100` silently truncates).
**Why**: Even the temp-file workaround doesn't fully protect against shell escaping of complex jq operators. Server-side filtering eliminates the problem class entirely and reduces data transfer.

## Automation: Verify Clean Git State Before Execution

**Discovered**: 2026-02-09
**Context**: `/execute-approved` started with merge conflicts (`UU` status) from a prior stash, requiring multi-step conflict resolution before any implementation work
**Pattern**: At the start of any automated execution command, check for unmerged files (`git status --porcelain | grep '^UU'`). If found, abort with a clear message rather than attempting recovery mid-execution.
**Why**: Merge conflicts mid-automation waste cycles on git surgery instead of implementation. Clean state should be a hard precondition.

## Execution Tracking: Valid Status Enums and FK Insert Order

**Discovered**: 2026-02-17
**Context**: `/execute-approved` hit FK errors and check constraint violations when creating execution tracking records
**Pattern**:

1. `mason_pm_execution_runs.status` accepts only: `'pending' | 'in_progress' | 'success' | 'failed' | 'cancelled'`. NOT `'running'`.
2. `mason_execution_progress.wave_status` has a check constraint — query an existing row to see valid values before inserting.
3. `run_id` must be UUID format. Use `python3 -c "import uuid; print(uuid.uuid4())"` — NOT `exec-YYYYMMDDHHMMSS-xxxx`.
4. Insert order matters: create `mason_pm_execution_runs` first, then `mason_execution_progress` (FK dependency).
   **Why**: Both sessions in Feb 17-18 rediscovered these constraints by trial and error. Encoding them prevents repeated failures.

## Compound Reviews: Check Both Branch and Main

**Discovered**: 2026-02-19
**Context**: Two consecutive compound-review sessions (Feb 19 and Feb 20) independently examined the same uncompounded session and reached the same conclusion
**Pattern**: When running a compound review, check which branch the uncompounded work is on. If it's on an unmerged feature branch, the compound commit will only be visible from that branch — not from main or other branches. The MEMORY.md is the cross-branch record of what was compounded.
**Why**: Compounds on unmerged branches are invisible from other branches. Multiple compound sessions can redundantly analyze the same work if MEMORY.md isn't checked first.

## SKILL.md: Quote description fields containing colons

**Discovered**: 2026-03-03
**Context**: Automated compound session detected WARN logs at startup: "Failed to parse YAML frontmatter in .claude/skills/\*/SKILL.md: YAML Parse error: Unexpected token"
**Pattern**: Any `description:` field in a SKILL.md frontmatter that contains a colon (e.g., `Keywords: foo, bar`) MUST be wrapped in double quotes. Unquoted colons break YAML parsing and silently prevent the skill from loading — no error surfaced to the user, only a WARN in the debug log. Fixed: `description: "...Keywords: foo..."`.
**Why**: YAML treats bare colons as key-value separators. The skills were broken on every mason session startup with zero user-visible indication.

## Next.js: Avoid `next/dynamic` for Frequently-Used Modals

**Discovered**: 2026-03-05
**Context**: Stash WIP on autopilot-schedule-dashboard removed `next/dynamic` lazy imports for `ItemDetailModal`, `ExecutionRunModal`, and `GenerateIdeasWizard` in backlog page
**Pattern**: Do NOT use `next/dynamic` for modal components that users open repeatedly. Import them statically. Dynamic imports add a loading flash on first open and re-bundle overhead that hurts UX more than the initial bundle savings help. Reserve `next/dynamic` for heavy components loaded only on specific pages (charts, editors), not reusable modals.
**Why**: Modal loading flashes are jarring. The bundle size tradeoff (slightly larger initial load vs. per-open loading spinner) is almost always wrong for modals. Static imports also simplify named-export patterns (`mod.ComponentName` dance is error-prone).

## Hooks: Don't Expose State You Don't Need

**Discovered**: 2026-03-05
**Context**: `useAutoMigrations()` was returning `{ state: migrationState }` which callers used to gate rendering with `isMigrationReady`. Stash WIP removes the state tracking entirely — just call `useAutoMigrations()` with no destructuring.
**Pattern**: Hooks that run background side effects (migrations, analytics, prefetch) should return nothing unless callers genuinely need the state. If the only consumer checks `status === 'success' || 'skipped' || 'error'` to mean "done", the hook is always effectively done from the caller's perspective — remove the return value.
**Why**: Exposing internal hook state creates unnecessary coupling. Callers add `isMigrationReady` guards that are effectively no-ops (the hook always resolves eventually). Removing the return value eliminates dead state variables.

<!-- New patterns will be added below this line -->

## Command Templates: Validate Select Columns Against Schema

**Discovered**: 2026-04-01
**Context**: Automated `/execute-approved` run hit Postgres error 42703 — `column mason_pm_backlog_items.file_path does not exist`. The command template (`execute-approved.md:346`) references `${item.file_path}:${item.line_number}` but neither column exists in the schema or `MIGRATION_SQL`.
**Pattern**: When command templates reference `${item.field}` variables, every field MUST exist in the table schema. Before committing command template changes, verify each referenced field against `MIGRATION_SQL`. Dead column references cause hard Supabase REST errors (42703) on every automated run.
**Why**: The agent's Supabase REST query included `file_path` in its `select=` parameter, causing a hard error on every autopilot run. The agent recovered by retrying without the column, but it wastes a cycle each time and clutters logs.

## Git: Execute-Approved Branches Never Get Pushed — No-Upstream Branches Are Invisible to Ahead-Count Checks

**Discovered**: 2026-07-12
**Context**: Nightly compound push-state check found the ENTIRE local branch set — 65 branches, including every compound-learnings commit from Jan 31 through Apr 1 — absent from origin. Months of work existed on one machine only.
**Pattern**: `/execute-approved` creates a local feature branch per item and never pushes it or sets an upstream. A branch with no upstream shows NO ahead-count in `git status -sb`, so the standard push-state gate reads vacuously clean forever. Verify push state by enumerating local refs against the remote: `git for-each-ref refs/heads` vs `git ls-remote origin`, and push any local-only branch with commits not on origin/main. All 65 were pushed 2026-07-12 (single multi-ref push, inline auth); `mason/autopilot-schedule-dashboard` now has upstream tracking set.
**Why**: Ahead-count only exists relative to a configured upstream. A never-pushed branch has none, so the check is structurally incapable of catching it — the miss self-perpetuates every night. A machine loss would have destroyed all compound history and ~56 unmerged feature implementations.

## Daemon: Status Writes Must Match the CHECK Constraint — `archived` Is Not a Valid Backlog Status

**Discovered**: 2026-07-20
**Context**: `~/.mason/autopilot.error.log` carries `Failed to archive stale items: new row for relation "mason_pm_backlog_items" violates check constraint "valid_status"`. `archiveStaleAutopilotItems()` (`packages/mason-autopilot/src/commands/start.ts:159`, and the same in the running `dist/commands/start.js:90`) does `.update({ status: 'archived' })`, but `MIGRATION_SQL` line 132 constrains status to `('new','approved','in_progress','completed','deferred','rejected')` — `archived` was never added.
**Pattern**: Every literal status/enum string written by daemon or command code must exist in the table's CHECK constraint in `MIGRATION_SQL`. This is the write-side twin of "Validate Select Columns Against Schema" — grep the constraint before introducing a new status value, and if the value is genuinely new, add it to `MIGRATION_SQL` in the same change (per database-migrations rule 0). Fix is either add `'archived'` to the constraint or reuse `'rejected'`/`'deferred'`.
**Why**: The archiver has NEVER worked — it logs to stderr and returns, so the daemon proceeds normally and nothing surfaces. Stale autopilot `new` items accumulate forever (18 sitting in `new`), and the failure is invisible unless someone reads the error log. Enum drift against a CHECK constraint fails at write time only, so a value that reads fine in TypeScript is rejected by Postgres every single run.

## Daemon: Transport Failures Are Reported as Auth Failures — Classify the Error Before Naming a Cause

**Discovered**: 2026-07-20
**Context**: 174 of 600 lines in `~/.mason/autopilot.error.log` read `API key validation failed. Key may be invalid or expired.` immediately followed by `Error: TypeError: fetch failed`. `fetchAutopilotConfig()` (`start.ts:566-579`) treats ANY `apiKeyError` from the `mason_api_keys` lookup as an invalid key — including supabase-js network errors. The same shape repeats a few lines later: a failed `mason_github_repositories` lookup prints `Repository not found: <repo>` + `Run mason-autopilot init to register this repository.`
**Pattern**: When a guard query fails, branch on the error class before naming a cause. `TypeError: fetch failed` (or any transport/DNS/timeout error) is "cannot reach Supabase — will retry", NOT "credential invalid" and NOT "row missing". Only a successful query returning zero rows justifies "invalid key" or "not registered". Keep the skip-on-error behavior (that part is correct) but log the honest cause.
**Why**: The message sends the operator to the most destructive remediation available — rotate the API key or re-run `mason-autopilot init` — for what is a transient network blip that self-heals. It also poisons any future log-based health check: a network outage looks identical to a revoked credential, so healthy / broken / can't-reach are conflated in the one artifact an operator would read.

## Compound Driver: The Dormancy Gate Could Never Skip Mason — Its Own Compound Commit Was the Signal

**Discovered**: 2026-07-21
**Context**: `daily-compound-review.sh` gained an activity pre-gate on 2026-07-20 to stop dormant repos burning a nightly `claude -p` session. Tonight's run logged `signal: 1 commit(s) in last 24h` for mason — that commit was `01591dc chore: compound learnings from 2026-07-20`, written by the previous night's run of the same driver. Mason has had no development commit since 2026-04-01.
**Pattern**: An activity gate must exclude the artifacts its own runs produce. Two independent self-feeding loops pinned mason to a nightly session: (1) signal 1 counted the driver's own `chore: compound learnings` commits — fixed by filtering that subject out of the 24h commit count; (2) signal 2 (dirty tree) saw `.claude/battle-test/screenshots/` and `.claude/e2e-test/results/` — battle-test/E2E output, untracked and covered by no `.gitignore` line, so `git status --porcelain` reported `??` forever — fixed by gitignoring both (keeping the tracked `screenshots/.gitkeep`). Same class as the `.claude/tmp/` loop found in xiraconnect-agents on 2026-07-20; check for it whenever a "skip if idle" gate never skips.
**Why**: The gate read as working (it correctly skipped 11 dormant repos) while being structurally incapable of skipping any repo that had ever compounded — the run creates the evidence that fires the next run. Mason's own nightly commit and its permanently-`??` tool output made the skip path unreachable, so the quota burn the gate was built to stop continued unabated and looked deliberate in the log.

## Compound Driver: The Dirty-Tree Signal Is Self-Feeding Too — The Driver Restores the Exact Tree It Just Adjudicated

**Discovered**: 2026-07-22
**Context**: Third consecutive night the dormancy gate failed to skip mason. Last night's fix closed signal 1 (own compound commits) and gitignored two `.claude/` artifact dirs, and MEMORY predicted "if a nightly run still fires with no development activity, a third signal is leaking." It did: `compound-review-2026-07-22.log` logs `signal: uncommitted changes in working tree`. Two causes stacked. (a) The 07-21 gitignore fix enumerated only the artifact paths under `.claude/` and missed six root-level generated artifacts still reported `??` (`flow_test.py`, `test_api_endpoints.py`, `test_api_endpoints_curl.sh`, `scripts/flow_test.js`, `backlog_items_processed.json`, `mason-one-pager.html`). (b) Structurally: the driver stashes the dirty tree, runs the session, then `git stash apply`s the SAME content back — so any un-landed WIP (here the ~294-line `backlog/page.tsx` + `ExecutionRunModal.tsx` refactor) re-satisfies a bare dirty check every night forever, regardless of gitignore.
**Pattern**: Signal 4 already solved this class with adjudication receipts for stash SHAs — signal 2 needed the same. Fixed by fingerprinting the uncommitted state (tracked `diff HEAD` + every untracked path with its `git hash-object` blob hash → sha256) and receipting it to `adjudicated-stashes/<repo>.dirty.txt` at gate time, before the stash push. An already-reviewed tree stops being a signal; ANY change to it (edited content or a new untracked file) produces a new fingerprint and fires again. Fails open on an unreadable fingerprint. Corollary: when closing a "permanently `??`" signal, enumerate the FULL `git ls-files --others --exclude-standard` output — don't gitignore only the paths you happened to notice.
**Why**: Whenever a driver both MEASURES a signal and RESTORES the state that produces it, receipting is required or the loop is structural, not incidental. Three separate signals in this one gate each turned out self-feeding for the same reason; the fix pattern (receipt what you adjudicate) generalizes to all of them. Mason should now genuinely skip on idle nights after one more run seeds the first receipt.

## Bash: Never Edit a Running Script In Place — Atomic `mv` Only

**Discovered**: 2026-07-22
**Context**: The compound-driver fix above had to be applied to `daily-compound-review.sh` from inside the `claude -p` session that same script had launched — the bash process was still executing it.
**Pattern**: Bash reads a script incrementally by byte offset, not all at once. Editing the file in place under a running interpreter makes it resume at a stale offset and execute garbage. Write the modified copy to a temp file, `bash -n` it, then `mv` over the original — rename swaps the inode, so the running process keeps its original fd and finishes cleanly while the next invocation picks up the new version. Preserve the mode with `chmod --reference` before the `mv`.
**Why**: Silent and destructive: the corruption lands mid-run in whatever the interpreter reaches next, so the failure looks unrelated to the edit. Applies to any long-running shell script — nightly drivers, install scripts, CI wrappers — being patched while live.
