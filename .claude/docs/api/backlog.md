# Backlog API Routes

## Quick Reference

Routes for managing backlog items and PRDs.

---

## GET /api/prd/{id}

Get PRD content for a backlog item.

### Request

```
GET /api/prd/123e4567-e89b-12d3-a456-426614174000
```

### Response

```json
{
  "prd_content": "# PRD: Feature Title\n\n## Problem\n...",
  "prd_generated_at": "2024-01-15T10:30:00Z"
}
```

### Error Responses

| Status | Meaning           |
| ------ | ----------------- |
| 401    | Not authenticated |
| 404    | Item not found    |
| 500    | Server error      |

---

## POST /api/backlog/restore

Restore a filtered item to the backlog.

### Request

```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "eyJ...",
  "filteredItemId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Response

```json
{
  "success": true,
  "backlogItemId": "789e4567-e89b-12d3-a456-426614174000"
}
```

### What It Does

1. Fetches filtered item from `mason_pm_filtered_items`
2. Creates new item in `mason_pm_backlog_items` with status 'new'
3. Updates filtered item's `override_status` to 'restored'
4. Records feedback in `mason_pm_restore_feedback`

---

## Client-Side Operations

Most backlog operations are done client-side with user's Supabase:

### Update Item Status

```typescript
const { error } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .update({
    status: 'approved',
    updated_at: new Date().toISOString(),
  })
  .eq('id', itemId);
```

### Bulk Approve

```typescript
const { error } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .update({ status: 'approved' })
  .in('id', selectedIds);
```

### Filter by Status

```typescript
const { data } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .select('*')
  .eq('repository_id', repoId)
  .eq('status', 'approved');
```

---

## Related

- [Backlog Types](../types/backlog.md) - BacklogItem interface
- [Query Patterns](../database/queries.md) - Common queries
- [API Overview](README.md) - Authentication patterns
