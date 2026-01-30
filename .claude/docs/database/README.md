# Database Overview

## Quick Reference

Mason uses Supabase (PostgreSQL) with a BYOD (Bring Your Own Database) model. Users connect their own Supabase project.

## Key Principles

1. **BYOD Model** - Each user has their own Supabase database
2. **All tables prefixed** with `mason_` to avoid conflicts
3. **Migrations are idempotent** - safe to run multiple times
4. **NEVER delete user data** in migrations

## Migration Location

**Single source of truth:**

```
packages/mason-dashboard/src/app/api/setup/migrations/route.ts
```

The `MIGRATION_SQL` constant runs when users click "Update Database Schema" in Settings.

## Table Categories

### Core Tables (3)

- `mason_users` - User accounts
- `mason_api_keys` - CLI authentication
- `mason_github_repositories` - Connected repos

### Backlog Tables (4)

- `mason_pm_backlog_items` - Main backlog items
- `mason_pm_analysis_runs` - Analysis tracking
- `mason_pm_filtered_items` - Filtered suggestions
- `mason_pm_restore_feedback` - Restore tracking

### Execution Tables (5)

- `mason_pm_execution_runs` - Batch execution tracking
- `mason_pm_execution_tasks` - Individual tasks
- `mason_remote_execution_runs` - Remote execution
- `mason_execution_logs` - Log messages
- `mason_execution_progress` - Real-time progress (has realtime enabled)

### Support Tables (1)

- `mason_ai_provider_keys` - User's AI API keys

## Adding New Tables

1. Add to `TABLES` constant in `/lib/constants.ts`
2. Add CREATE TABLE to `MIGRATION_SQL`
3. Add indexes with `CREATE INDEX IF NOT EXISTS`
4. Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
5. Add RLS policy with existence check
6. Update [tables.md](tables.md)

## Related

- [Tables Reference](tables.md) - Full schema for all tables
- [Query Patterns](queries.md) - Common query examples
- [TABLES Constant](../constants/tables.md) - Constant reference
