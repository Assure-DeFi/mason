# Architecture Overview

## Quick Reference

Mason is a PM automation tool with a dashboard (Next.js) and CLI. Uses BYOD (Bring Your Own Database) model.

## System Components

```
+-------------------------------------------------------------+
|                       User's Machine                         |
|  +-------------+    +-------------+    +-----------------+  |
|  |  Mason CLI  |    |  Dashboard  |    | User's Supabase |  |
|  | (local dev) |    |  (Next.js)  |----|   Database      |  |
|  +------+------+    +------+------+    +--------+--------+  |
|         |                  |                     |           |
|         +------------------+---------------------+           |
|                            |                                 |
+----------------------------+---------------------------------+
                             |
                    +--------+--------+
                    |  Central Mason  |
                    |   Database      |
                    | (identity only) |
                    +-----------------+
```

## Package Structure

```
packages/
  mason-dashboard/     # Next.js dashboard app
    src/
      app/            # Next.js app router pages
        api/          # API routes
      components/     # React components
      lib/            # Utilities and services
      types/          # TypeScript types
```

## Data Storage

### Central Database (Minimal)

Only stores:

- User identity (GitHub ID, username, avatar)
- Connected repository list

### User's Supabase (Everything Else)

- Backlog items and PRDs
- Analysis runs and filtered items
- Execution tracking
- AI provider keys

### Browser localStorage

- Supabase credentials (URL, anon key)
- GitHub access token
- UI preferences

## Key Flows

### 1. PM Review Flow

```
CLI: /pm-review
  -> Analyze codebase
  -> Generate suggestions
  -> Validate (filter false positives)
  -> Generate PRDs for valid items
  -> Write to user's Supabase
```

### 2. Execution Flow

```
Dashboard: Approve items
CLI: /execute-approved
  -> Fetch approved items
  -> Execute in waves (parallel)
  -> Update progress in real-time
  -> Create commits/PRs
```

### 3. Authentication Flow

```
GitHub OAuth (central)
  -> Get user identity
  -> Store in central DB
User's Supabase (BYOD)
  -> Connect via OAuth or credentials
  -> Store URL/keys in localStorage
```

## Related

- [Data Flow](data-flow.md) - Detailed data flow diagrams
- [Privacy Model](privacy-model.md) - BYOD architecture details
- [Database Tables](../database/tables.md) - Schema reference
