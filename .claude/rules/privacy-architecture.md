# Privacy Architecture Rules

## Central Database - Minimal Data Only

The central Mason database must ONLY contain:

1. **User Identity** - Who the users are (GitHub ID, username, email, avatar)
2. **Connected Repositories** - Which repos users have connected

**Nothing else.** Specifically, the central database must NEVER store:

- Supabase credentials (URL, anon key, service key)
- API keys (AI providers, etc.)
- User data or analysis results
- Any sensitive tokens or secrets

## Data Location Principles

| Data Type            | Storage Location         |
| -------------------- | ------------------------ |
| User identity        | Central DB               |
| Connected repos list | Central DB               |
| Supabase credentials | User's localStorage only |
| AI provider keys     | User's own Supabase DB   |
| Backlog items / PRDs | User's own Supabase DB   |
| Analysis results     | User's own Supabase DB   |
| GitHub access tokens | User's localStorage only |

## Admin Visibility

The system admin can only see:

- Who the users are in the system
- What repos they have connected

Nothing else. No access to user data, credentials, or analysis results.

## Enforcement

When implementing features:

1. Never sync sensitive data to central database
2. Keep credentials client-side or in user's own database
3. API routes needing user DB access must get credentials from client request, not central DB
4. Prefer generating data at analysis time rather than storing/syncing
