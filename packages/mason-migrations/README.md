# Mason Migrations

## Schema Reconciliation (2026-02-06)

Mason's database schema historically lived in two places that drifted apart:

1. **`route.ts` embedded MIGRATION_SQL** -- the single source of truth, executed at runtime via the dashboard's auto-migration hook and the "Update Database Schema" button in Settings.
2. **`migrations/*.sql` files** -- standalone SQL files that were originally created for manual/CLI usage but diverged from `route.ts` over time.

### What changed

The two old `001_*` files were **removed** because they contained outdated, divergent schemas (e.g., different column names, missing tables, different CHECK constraints):

- `001_mason_schema.sql` -- removed
- `001_pm_backlog_tables.sql` -- removed

They have been replaced by a single canonical file:

- **`001_canonical_schema.sql`** -- contains the EXACT SQL from the `MIGRATION_SQL` constant in `packages/mason-dashboard/src/app/api/setup/migrations/route.ts`.

### Source of truth

The **single source of truth** for the Mason database schema is:

```
packages/mason-dashboard/src/app/api/setup/migrations/route.ts
```

Specifically, the `MIGRATION_SQL` template literal constant in that file. This SQL is:

- **Idempotent** -- safe to run multiple times (uses `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.)
- **Non-destructive** -- never drops or deletes user data
- **Complete** -- includes all tables, indexes, RLS policies, functions, and realtime configuration

### How to update the schema

1. Edit the `MIGRATION_SQL` constant in `route.ts`.
2. Regenerate `001_canonical_schema.sql` by copying the SQL content from `route.ts` into the file (preserving the header comment).
3. Do **NOT** edit `001_canonical_schema.sql` directly -- it will drift from `route.ts`.

### Historical migration files (002-015)

The files `002_auth_and_github.sql` through `015_dlq_metrics_rpc.sql` are retained as **historical reference only**. They document how the schema evolved over time but are not used operationally. All of their changes have been incorporated into the canonical schema in `route.ts` and `001_canonical_schema.sql`.
