# Common Query Patterns

## Quick Reference

Always import `TABLES` constant. All queries use the user's own Supabase client.

```typescript
import { TABLES } from '@/lib/constants';
```

---

## Backlog Queries

### Get all backlog items for a repository

```typescript
const { data, error } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .select('*')
  .eq('repository_id', repositoryId)
  .order('priority_score', { ascending: false });
```

### Get approved items (ready for execution)

```typescript
const { data } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .select('*')
  .eq('repository_id', repositoryId)
  .eq('status', 'approved')
  .order('priority_score', { ascending: false });
```

### Update item status

```typescript
const { error } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .update({ status: 'approved', updated_at: new Date().toISOString() })
  .eq('id', itemId);
```

### Get status counts

```typescript
const { data } = await supabase
  .from(TABLES.PM_BACKLOG_ITEMS)
  .select('status')
  .eq('repository_id', repositoryId);

const counts = data?.reduce(
  (acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
```

---

## User Queries

### Get or create user

```typescript
// Check if user exists
const { data: existing } = await supabase
  .from(TABLES.USERS)
  .select('*')
  .eq('github_id', githubId)
  .single();

if (!existing) {
  // Create user
  const { data: newUser } = await supabase
    .from(TABLES.USERS)
    .insert({
      github_id: githubId,
      github_username: username,
      github_email: email,
      github_avatar_url: avatarUrl,
    })
    .select()
    .single();
}
```

---

## Repository Queries

### Get user's repositories

```typescript
const { data } = await supabase
  .from(TABLES.GITHUB_REPOSITORIES)
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('github_full_name');
```

### Connect new repository

```typescript
const { data, error } = await supabase
  .from(TABLES.GITHUB_REPOSITORIES)
  .upsert(
    {
      user_id: userId,
      github_repo_id: repo.id,
      github_owner: repo.owner.login,
      github_name: repo.name,
      github_full_name: repo.full_name,
      github_default_branch: repo.default_branch,
      github_private: repo.private,
      github_clone_url: repo.clone_url,
      github_html_url: repo.html_url,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,github_repo_id',
    },
  )
  .select()
  .single();
```

---

## Execution Queries

### Get execution progress (real-time)

```typescript
// Subscribe to changes
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
      // Handle progress update
    },
  )
  .subscribe();
```

### Update execution progress

```typescript
const { error } = await supabase.from(TABLES.EXECUTION_PROGRESS).upsert(
  {
    item_id: itemId,
    current_phase: 'building',
    current_wave: 2,
    tasks_completed: 3,
    tasks_total: 5,
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: 'item_id',
  },
);
```

---

## Filtered Items Queries

### Get filtered items for review

```typescript
const { data } = await supabase
  .from(TABLES.PM_FILTERED_ITEMS)
  .select('*')
  .eq('repository_id', repositoryId)
  .eq('override_status', 'filtered')
  .order('filter_confidence', { ascending: true });
```

### Restore a filtered item

```typescript
// Update filtered item status
await supabase
  .from(TABLES.PM_FILTERED_ITEMS)
  .update({ override_status: 'restored' })
  .eq('id', filteredItemId);

// Create backlog item from filtered item
await supabase.from(TABLES.PM_BACKLOG_ITEMS).insert({
  title: filteredItem.title,
  problem: filteredItem.problem,
  solution: filteredItem.solution,
  // ... other fields
  status: 'new',
});

// Record feedback
await supabase.from(TABLES.PM_RESTORE_FEEDBACK).insert({
  filtered_item_id: filteredItemId,
  filter_tier: filteredItem.filter_tier,
  filter_reason: filteredItem.filter_reason,
  restored_at: new Date().toISOString(),
});
```

---

## API Key Queries

### Validate API key (for CLI auth)

```typescript
import { createHash } from 'crypto';

const keyHash = createHash('sha256').update(apiKey).digest('hex');

const { data } = await supabase
  .from(TABLES.API_KEYS)
  .select('*, mason_users(*)')
  .eq('key_hash', keyHash)
  .single();

if (data) {
  // Update last used
  await supabase
    .from(TABLES.API_KEYS)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);
}
```

---

## Gotchas

1. **Always filter by repository_id** for repo-scoped data
2. **Use upsert with onConflict** for idempotent operations
3. **Real-time subscriptions** require channel cleanup on unmount
4. **TABLES constant is required** - hardcoded names fail silently
