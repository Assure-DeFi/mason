# Privacy Model (BYOD Architecture)

## Quick Reference

**BYOD = Bring Your Own Database**

Users connect their own Supabase project. Mason central database only stores identity.

## Data Isolation Principles

### Central Database - ONLY Contains

1. **User Identity** - GitHub ID, username, email, avatar
2. **Connected Repositories** - Which repos users have connected

**Nothing else.**

### User's Supabase - Contains

- Backlog items and PRDs
- Analysis runs and results
- Filtered items
- Execution tracking
- AI provider API keys

### Browser localStorage - Contains

- Supabase credentials (URL, anon key)
- GitHub access token
- UI preferences

## What Admin CAN See

- Who the users are
- What repos they have connected

## What Admin CANNOT See

- User's Supabase credentials
- User's AI API keys
- Backlog items or analysis results
- Execution logs
- Any user activity details

## Implementation Rules

### NEVER Sync to Central

```typescript
// WRONG - Never store sensitive data centrally
await centralDb.from('users').update({
  supabase_url: userUrl, // NO!
  api_keys: userKeys, // NO!
  backlog_items: items, // NO!
});

// CORRECT - Central only gets identity
await centralDb.from('users').upsert({
  github_id: session.user.id,
  github_username: session.user.name,
});
```

### Credentials Stay Client-Side

```typescript
// Stored in localStorage, never sent to server
localStorage.setItem(
  STORAGE_KEYS.CONFIG,
  JSON.stringify({
    supabaseUrl: url,
    supabaseAnonKey: key,
  }),
);

// API routes get credentials from client request
export async function POST(request: Request) {
  const { supabaseUrl, supabaseKey } = await request.json();
  // Create client with user's credentials
  const userDb = createClient(supabaseUrl, supabaseKey);
}
```

### Generate at Analysis Time

```typescript
// CORRECT - Generate data when needed
const analysis = await runPMAnalysis(codebase);
await userDb.from(TABLES.PM_BACKLOG_ITEMS).insert(analysis.items);

// WRONG - Sync data to central
await centralDb.from('analysis_cache').upsert(analysis);
```

## Trust Model

```
User -----------------------------------------------------+
  |                                                       |
  |  Trusts:                                              |
  |  * Their own Supabase project                         |
  |  * Their browser localStorage                         |
  |  * Mason dashboard (client-side code)                 |
  |                                                       |
  |  Does NOT trust:                                      |
  |  x Mason central database with sensitive data         |
  |  x Mason admin with access to their keys              |
  |                                                       |
+----------------------------------------------------------
```

## Related

- [Architecture Overview](overview.md) - System components
- [Storage Keys](../constants/storage-keys.md) - What's stored client-side
- [Database Tables](../database/tables.md) - Schema in user's database
