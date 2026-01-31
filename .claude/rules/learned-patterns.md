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
