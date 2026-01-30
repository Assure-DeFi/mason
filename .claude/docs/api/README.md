# API Overview

## Quick Reference

Next.js API routes under `packages/mason-dashboard/src/app/api/`.

## Authentication

All API routes require authentication via NextAuth session:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle request
}
```

## Route Categories

### Setup Routes

| Route                   | Method | Purpose                 |
| ----------------------- | ------ | ----------------------- |
| `/api/setup/migrations` | POST   | Run database migrations |

### GitHub Routes

| Route                      | Method | Purpose                  |
| -------------------------- | ------ | ------------------------ |
| `/api/github/repositories` | GET    | List user's GitHub repos |

### Backlog Routes

| Route                  | Method | Purpose               |
| ---------------------- | ------ | --------------------- |
| `/api/backlog/restore` | POST   | Restore filtered item |
| `/api/prd/{id}`        | GET    | Get PRD by item ID    |

### Execution Routes

| Route                  | Method | Purpose                |
| ---------------------- | ------ | ---------------------- |
| `/api/execution/start` | POST   | Start remote execution |

### Analysis Routes

| Route              | Method | Purpose               |
| ------------------ | ------ | --------------------- |
| `/api/v1/analysis` | POST   | Validate analysis run |

## Request Patterns

### Supabase Proxy Pattern

Routes that need user's Supabase get credentials from request:

```typescript
export async function POST(request: NextRequest) {
  const { supabaseUrl, supabaseKey, ...data } = await request.json();

  // Create client with user's credentials
  const userDb = createClient(supabaseUrl, supabaseKey);

  // Perform operations
  const { data: result } = await userDb
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('*');

  return NextResponse.json(result);
}
```

### Error Response Format

```typescript
// Client errors (4xx)
return NextResponse.json(
  { error: 'Human-readable error message' },
  { status: 400 },
);

// Server errors (5xx)
return NextResponse.json({ error: error.message }, { status: 500 });
```

## Related

- [Backlog API](backlog.md) - Backlog-specific routes
- [Execution API](execution.md) - Execution routes
- [API_ROUTES Constant](../constants/api-routes.md) - Route constants
