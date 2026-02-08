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

<!-- New patterns will be added below this line -->
