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
