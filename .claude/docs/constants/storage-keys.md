# STORAGE_KEYS Constant Reference

## Quick Reference

localStorage keys for client-side data. Import from `@/lib/constants`.

```typescript
import { STORAGE_KEYS } from '@/lib/constants';
```

## All Storage Keys

| Constant Key             | Actual Key                     | Purpose                            |
| ------------------------ | ------------------------------ | ---------------------------------- |
| `CONFIG`                 | `mason_config`                 | Supabase URL and anon key          |
| `LAST_REPOSITORY`        | `mason-last-repository`        | Last selected repository ID        |
| `EXECUTE_PREFERENCE`     | `mason_execute_preference`     | CLI vs remote execution preference |
| `GITHUB_TOKEN`           | `mason_github_token`           | GitHub access token                |
| `SUPABASE_OAUTH_SESSION` | `mason_supabase_oauth_session` | OAuth PKCE state/verifier          |
| `COLUMN_WIDTHS`          | `mason_backlog_column_widths`  | Backlog table column preferences   |

## Usage Examples

```typescript
import { STORAGE_KEYS } from '@/lib/constants';

// Get Supabase config
const config = localStorage.getItem(STORAGE_KEYS.CONFIG);

// Save repository selection
localStorage.setItem(STORAGE_KEYS.LAST_REPOSITORY, repoId);

// Clear OAuth session
localStorage.removeItem(STORAGE_KEYS.SUPABASE_OAUTH_SESSION);
```

## Privacy Notes

These keys store sensitive data client-side:

- `CONFIG` - Contains Supabase credentials (NEVER sync to central DB)
- `GITHUB_TOKEN` - User's GitHub access token (NEVER sync to central DB)

See [Privacy Model](../architecture/privacy-model.md) for data isolation rules.

## Related

- [Tables Constant](tables.md) - Database table names
- [Privacy Model](../architecture/privacy-model.md) - Why credentials stay client-side
