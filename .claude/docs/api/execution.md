# Execution API Routes

## Quick Reference

Routes for starting and tracking execution of backlog items.

---

## POST /api/execution/start

Start remote execution of approved items.

### Request

```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJ...",
  "repositoryId": "123e4567-e89b-12d3-a456-426614174000",
  "itemIds": ["id1", "id2", "id3"],
  "branchName": "mason/execute-batch-1",
  "baseBranch": "main"
}
```

### Response

```json
{
  "success": true,
  "executionRunId": "789e4567-e89b-12d3-a456-426614174000"
}
```

### What It Does

1. Creates execution run in `mason_remote_execution_runs`
2. Updates items to status 'in_progress'
3. Triggers background execution job
4. Returns immediately (async execution)

---

## POST /api/setup/migrations

Run database migrations on user's Supabase.

### Request (OAuth Method)

```json
{
  "projectRef": "xxxx",
  "accessToken": "sbp_..."
}
```

### Request (Credentials Method)

```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "databasePassword": "your-db-password"
}
```

### Response

```json
{
  "success": true
}
```

### Error Responses

| Status | Error               | Meaning                          |
| ------ | ------------------- | -------------------------------- |
| 400    | Missing credentials | Need URL+password or OAuth token |
| 400    | PROJECT_MISMATCH    | OAuth project doesn't match URL  |
| 500    | Migration error     | SQL execution failed             |

---

## Real-time Progress

Execution progress is tracked via Supabase real-time, not REST API:

### Subscribe to Progress

```typescript
const channel = supabase
  .channel('execution-progress')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: TABLES.EXECUTION_PROGRESS,
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // New execution started
      } else if (payload.eventType === 'UPDATE') {
        // Progress updated
      }
    },
  )
  .subscribe();
```

### Progress Phases

```typescript
type ExecutionPhase =
  | 'site_review' // Initial analysis
  | 'foundation' // Setup and planning
  | 'building' // Implementation waves
  | 'inspection' // Validation
  | 'complete'; // Done
```

---

## CLI Execution

Most execution happens via CLI `/execute-approved`:

> **Important:** Always run with `claude --dangerously-skip-permissions`. Running plain `claude` will trigger many manual approval prompts and won't run smoothly.

```bash
# In repo directory
claude --dangerously-skip-permissions /execute-approved

# With limit
claude --dangerously-skip-permissions /execute-approved --limit 3
```

The CLI:

1. Fetches approved items from user's Supabase
2. Creates execution tasks in waves
3. Writes progress to `mason_execution_progress`
4. Dashboard receives real-time updates

---

## Related

- [Data Flow](../architecture/data-flow.md) - Execution flow diagram
- [Database Tables](../database/tables.md) - Execution tables schema
- [API Overview](README.md) - Authentication patterns
