# Mason Reference Documentation

Quick-reference docs for Claude Code to understand Mason without re-reading source files.

## How to Use These Docs

1. **Check docs first** before exploring source code
2. **Search with Grep** for keywords: `Grep "backlog" .claude/docs/`
3. **Read specific docs** for detailed information
4. **Only explore source** if docs don't answer your question

## Navigation

### Architecture

- [overview.md](architecture/overview.md) - System architecture and data flow
- [data-flow.md](architecture/data-flow.md) - How data moves through the system
- [privacy-model.md](architecture/privacy-model.md) - Data isolation principles (BYOD)

### API Routes

- [README.md](api/README.md) - API patterns and authentication
- [backlog.md](api/backlog.md) - Backlog management routes
- [execution.md](api/execution.md) - Execution and progress routes

### Database

- [README.md](database/README.md) - Schema overview and migration rules
- [tables.md](database/tables.md) - All 13 tables with columns and constraints
- [queries.md](database/queries.md) - Common query patterns

### Types

- [README.md](types/README.md) - Type system overview
- [backlog.md](types/backlog.md) - BacklogItem, BacklogStatus, FilteredItem

### Constants

- [tables.md](constants/tables.md) - TABLES constant (CRITICAL - prevents bugs)
- [storage-keys.md](constants/storage-keys.md) - STORAGE_KEYS for localStorage
- [api-routes.md](constants/api-routes.md) - API_ROUTES constant

## Quick Answers

### What tables does Mason use?

See [constants/tables.md](constants/tables.md) - 13 tables, all prefixed with `mason_`

### How do I query backlog items?

```typescript
import { TABLES } from '@/lib/constants';
const { data } = await supabase.from(TABLES.PM_BACKLOG_ITEMS).select('*');
```

### What's the privacy model?

BYOD (Bring Your Own Database) - see [architecture/privacy-model.md](architecture/privacy-model.md)

### Where are migrations defined?

`packages/mason-dashboard/src/app/api/setup/migrations/route.ts` - the `MIGRATION_SQL` constant

## Maintenance

When making changes:

- **Adding tables**: Update `database/tables.md` and `constants/tables.md`
- **Adding types**: Update relevant `types/*.md`
- **Adding routes**: Update relevant `api/*.md`
- **Session end**: Note if docs need updating during `/compound`
