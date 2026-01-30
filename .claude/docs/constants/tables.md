# TABLES Constant Reference

## Quick Reference

**CRITICAL**: ALWAYS use the `TABLES` constant for Supabase queries. Never hardcode table names.

```typescript
import { TABLES } from '@/lib/constants';
```

## All Tables

| Constant Key            | Actual Table Name             | Purpose                         |
| ----------------------- | ----------------------------- | ------------------------------- |
| `USERS`                 | `mason_users`                 | User accounts (GitHub identity) |
| `API_KEYS`              | `mason_api_keys`              | CLI authentication tokens       |
| `GITHUB_REPOSITORIES`   | `mason_github_repositories`   | Connected repositories          |
| `PM_BACKLOG_ITEMS`      | `mason_pm_backlog_items`      | Backlog items with PRDs         |
| `PM_ANALYSIS_RUNS`      | `mason_pm_analysis_runs`      | PM review tracking              |
| `PM_FILTERED_ITEMS`     | `mason_pm_filtered_items`     | Filtered false positives        |
| `PM_EXECUTION_RUNS`     | `mason_pm_execution_runs`     | Execution batch tracking        |
| `PM_EXECUTION_TASKS`    | `mason_pm_execution_tasks`    | Individual execution tasks      |
| `REMOTE_EXECUTION_RUNS` | `mason_remote_execution_runs` | Remote execution tracking       |
| `EXECUTION_LOGS`        | `mason_execution_logs`        | Execution log messages          |
| `EXECUTION_PROGRESS`    | `mason_execution_progress`    | Real-time progress for UI       |
| `AI_PROVIDER_KEYS`      | `mason_ai_provider_keys`      | User's AI API keys              |
| `PM_RESTORE_FEEDBACK`   | `mason_pm_restore_feedback`   | Feedback on restored items      |

## Usage Examples

### Correct Usage

```typescript
import { TABLES } from '@/lib/constants';

// Query backlog items
const { data } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .select('*')
  .eq('repository_id', repoId);

// Insert user
const { data } = await supabase
  .from(TABLES.USERS)
  .insert({ github_id: '123', github_username: 'user' });
```

### WRONG - Never Do This

```typescript
// BUG: This queries non-existent table 'users' instead of 'mason_users'
const { data } = await supabase.from('users').select('*');

// BUG: Missing mason_ prefix
const { data } = await supabase.from('pm_backlog_items').select('*');
```

## Gotchas

1. **All tables are prefixed with `mason_`** - hardcoded strings fail silently
2. **Import from `@/lib/constants`** - not from any other location
3. **TypeScript type**: `TableName` is exported for type safety
4. **Supabase returns empty array** when table doesn't exist - no error thrown

## Related

- [Database Tables](../database/tables.md) - Full schema for each table
- [Storage Keys](storage-keys.md) - localStorage keys
- Source: `packages/mason-dashboard/src/lib/constants.ts`
