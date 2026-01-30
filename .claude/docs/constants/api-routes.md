# API_ROUTES Constant Reference

## Quick Reference

Internal API route paths. Import from `@/lib/constants`.

```typescript
import { API_ROUTES } from '@/lib/constants';
```

## All Routes

| Constant Key          | Path                       | Method | Purpose                  |
| --------------------- | -------------------------- | ------ | ------------------------ |
| `GITHUB_REPOSITORIES` | `/api/github/repositories` | GET    | List user's GitHub repos |
| `SETUP_MIGRATIONS`    | `/api/setup/migrations`    | POST   | Run database migrations  |
| `EXECUTION_START`     | `/api/execution/start`     | POST   | Start remote execution   |
| `PRD_BY_ID`           | `/api/prd/{id}`            | GET    | Fetch PRD by item ID     |
| `BACKLOG_RESTORE`     | `/api/backlog/restore`     | POST   | Restore filtered item    |
| `VALIDATE_ANALYSIS`   | `/api/v1/analysis`         | POST   | Validate analysis run    |

## Usage Examples

```typescript
import { API_ROUTES } from '@/lib/constants';

// Fetch repositories
const res = await fetch(API_ROUTES.GITHUB_REPOSITORIES);

// Get PRD content (dynamic route)
const res = await fetch(API_ROUTES.PRD_BY_ID(itemId));

// Run migrations
const res = await fetch(API_ROUTES.SETUP_MIGRATIONS, {
  method: 'POST',
  body: JSON.stringify({ supabaseUrl, databasePassword }),
});
```

## Related

- [API Overview](../api/README.md) - Full API documentation
- [Backlog API](../api/backlog.md) - Backlog-specific routes
- [Execution API](../api/execution.md) - Execution routes
