# Database Migrations Rules

These rules apply to ALL changes to the Mason database schema and migrations.

## Critical Principles

### 0. ALWAYS Update MIGRATION_SQL When Adding Tables/Columns

**This is MANDATORY and non-negotiable.**

When ANY code change requires a new database table or column:

1. **Add it to `MIGRATION_SQL`** in `packages/mason-dashboard/src/app/api/setup/migrations/route.ts`
2. The migration runs when users click "Update Database Schema" in Settings
3. All migrations MUST be idempotent (safe to run multiple times)
4. This ensures ALL users (new and existing) get the schema automatically

**Why this matters:**

- The `MIGRATION_SQL` constant is the SINGLE SOURCE OF TRUTH for database schema
- Users click "Update Database Schema" button in the dashboard to apply changes
- If you add a table in code but not in migrations, existing users will get errors
- New tables need: CREATE TABLE, indexes, RLS enable, and RLS policy

**Checklist for new tables:**

```sql
-- 1. Create table
CREATE TABLE IF NOT EXISTS mason_new_table (...);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_mason_new_table_... ON mason_new_table(...);

-- 3. Enable RLS
ALTER TABLE mason_new_table ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_new_table' AND policyname = 'Allow all on new_table') THEN
    CREATE POLICY "Allow all on new_table" ON mason_new_table FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### 1. NEVER Delete User Data

**Absolutely prohibited in migrations:**

- `DROP TABLE` statements
- `DELETE FROM` statements
- `TRUNCATE` statements
- Removing columns that contain user data
- Any operation that could cause data loss

**If schema changes require data migration:**

1. Add new columns/tables first
2. Migrate data in application code
3. Only remove old structures after confirming migration success

### 2. Always Idempotent

Every migration MUST be safe to run multiple times:

```sql
-- CORRECT: Idempotent patterns
CREATE TABLE IF NOT EXISTS table_name (...);
CREATE INDEX IF NOT EXISTS index_name ON table_name(column);
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;

-- For RLS policies, check existence first:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'table' AND policyname = 'policy') THEN
    CREATE POLICY "policy" ON table FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### 3. Complete Schema Coverage

The migration SQL in `/api/setup/migrations/route.ts` MUST include ALL tables used by the codebase.

### 4. NEVER Hardcode Table Names in Application Code

**All Supabase queries MUST use the `TABLES` constant from `@/lib/constants.ts`.**

```typescript
// WRONG - hardcoded table names cause silent failures
const { data } = await client.from('users').select('*');
const { data } = await client.from('pm_backlog_items').select('*');

// CORRECT - always import and use TABLES constant
import { TABLES } from '@/lib/constants';

const { data } = await client.from(TABLES.USERS).select('*');
const { data } = await client.from(TABLES.PM_BACKLOG_ITEMS).select('*');
```

**Why this matters:**

- All Mason tables are prefixed with `mason_` (e.g., `mason_users`, not `users`)
- Hardcoded strings like `'users'` query non-existent tables and return empty results
- This causes silent failures where existing users see empty states
- Using the constant ensures the correct `mason_` prefix is always applied

**Before committing any Supabase query code:**

```bash
# Find any hardcoded table names (these are BUGS)
grep -r "\.from(['\"][^m]" packages/mason-dashboard/src --include="*.ts" --include="*.tsx"
grep -r "\.from(['\"]m[^a]" packages/mason-dashboard/src --include="*.ts" --include="*.tsx"

# Verify all queries use TABLES constant
grep -r "\.from(TABLES\." packages/mason-dashboard/src
```

## Migration File Location

**Single Source of Truth:**

```
packages/mason-dashboard/src/app/api/setup/migrations/route.ts
```

The `MIGRATION_SQL` constant in this file is what runs when users click "Update Database Schema" in Settings.

## Required Tables Checklist

When modifying migrations, ensure ALL of these tables are included:

| Table                         | Purpose            | Required |
| ----------------------------- | ------------------ | -------- |
| `mason_users`                 | User accounts      | ✓        |
| `mason_api_keys`              | CLI authentication | ✓        |
| `mason_github_repositories`   | Connected repos    | ✓        |
| `mason_pm_analysis_runs`      | PM review tracking | ✓        |
| `mason_pm_backlog_items`      | Backlog items      | ✓        |
| `mason_pm_filtered_items`     | Filtered items     | ✓        |
| `mason_pm_execution_runs`     | Execution tracking | ✓        |
| `mason_pm_execution_tasks`    | Execution tasks    | ✓        |
| `mason_remote_execution_runs` | Remote execution   | ✓        |
| `mason_execution_logs`        | Execution logs     | ✓        |
| `mason_ai_provider_keys`      | AI provider keys   | ✓        |
| `mason_pm_restore_feedback`   | Restore tracking   | ✓        |

## Audit Process

**Before ANY code change that touches database tables:**

1. Search codebase for table references:

   ```bash
   grep -r "\.from\(['\"]mason_" packages/mason-dashboard/src
   grep -r "TABLES\." packages/mason-dashboard/src
   ```

2. Check `TABLES` constant in `/lib/constants.ts`

3. Verify ALL referenced tables exist in `MIGRATION_SQL`

4. If adding a new table:
   - Add CREATE TABLE with IF NOT EXISTS
   - Add necessary indexes
   - Enable RLS
   - Add RLS policy
   - Add to the checklist above

## Migration SQL Structure

Follow this order in `MIGRATION_SQL`:

```sql
-- 1. Core tables (users, api_keys, repositories)
CREATE TABLE IF NOT EXISTS mason_users (...);
CREATE TABLE IF NOT EXISTS mason_api_keys (...);
CREATE TABLE IF NOT EXISTS mason_github_repositories (...);

-- 2. Feature tables (analysis, backlog, execution)
CREATE TABLE IF NOT EXISTS mason_pm_analysis_runs (...);
CREATE TABLE IF NOT EXISTS mason_pm_backlog_items (...);
-- ... etc

-- 3. Indexes (all tables)
CREATE INDEX IF NOT EXISTS idx_... ON ...;

-- 4. Enable RLS (all tables)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (all tables)
DO $$ BEGIN
  IF NOT EXISTS (...) THEN
    CREATE POLICY ...;
  END IF;
END $$;
```

## Adding New Tables

When adding a new table to the codebase:

1. **Add to constants** (`/lib/constants.ts`):

   ```typescript
   export const TABLES = {
     // ... existing
     NEW_TABLE: 'mason_new_table',
   } as const;
   ```

2. **Add to migrations** (`/api/setup/migrations/route.ts`):

   ```sql
   -- Add table definition
   CREATE TABLE IF NOT EXISTS mason_new_table (...);

   -- Add index
   CREATE INDEX IF NOT EXISTS idx_mason_new_table_... ON mason_new_table(...);

   -- Enable RLS
   ALTER TABLE mason_new_table ENABLE ROW LEVEL SECURITY;

   -- Add policy
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mason_new_table' AND policyname = 'Allow all on new_table') THEN
       CREATE POLICY "Allow all on new_table" ON mason_new_table FOR ALL USING (true) WITH CHECK (true);
     END IF;
   END $$;
   ```

3. **Update this checklist** in this file

## Column Modifications

**Adding columns:**

```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column TYPE DEFAULT value;
```

**Changing column types (DANGEROUS):**

- Create new column with new type
- Migrate data in application
- Keep old column for backwards compatibility
- Document removal plan for future major version

## Testing Migrations

Before committing migration changes:

1. Run against a fresh database (new user scenario)
2. Run against an existing database (update scenario)
3. Run twice in a row (idempotency check)
4. Verify no errors in any scenario

## Emergency Procedures

**If migrations fail for a user:**

1. Check error message for specific table/constraint
2. Provide manual SQL fix for that specific issue
3. Update migrations to handle that edge case
4. Never tell users to drop tables or delete data
