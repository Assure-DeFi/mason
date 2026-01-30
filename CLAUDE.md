# Mason Project Instructions

## Global Standards

This project follows the global Claude standards defined in `~/.claude/CLAUDE.md`.

Key points:

- Always compound learnings at session end
- Check `~/.claude/rules/user-patterns.md` for cross-repo preferences
- Keep solutions simple, avoid over-engineering

## Project-Specific Rules

See `.claude/rules/` for Mason-specific standards:

- `database-migrations.md` - NEVER delete user data, always idempotent
- `code-quality.md` - TypeScript standards, error handling
- `brand-compliance.md` - Color palette, typography, UI patterns
- `privacy-architecture.md` - Minimal central data, user data stays local
- `learned-patterns.md` - Patterns discovered while working on Mason

## Mason-Specific Gotchas

1. **Always use TABLES constant** for Supabase queries (tables are prefixed with `mason_`)
2. **RLS policies** need existence checks before creation
3. **Dark mode first** - no light mode default
4. **No emojis** in UI unless explicitly requested

## Session End Checklist

Before ending significant sessions:

1. Extract learnings using `/compound`
2. User patterns → `~/.claude/rules/user-patterns.md`
3. Mason patterns → `.claude/rules/learned-patterns.md`
4. Commit with: `chore: compound learnings from session`
