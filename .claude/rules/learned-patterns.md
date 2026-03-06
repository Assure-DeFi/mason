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
