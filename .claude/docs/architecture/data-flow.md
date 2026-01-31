# Data Flow

## Quick Reference

Data flows between browser, user's Supabase, and central DB based on privacy model.

---

## PM Review Flow

```
+---------------------------------------------------------------------+
|  CLI: /pm-review                                                    |
|                                                                     |
|  1. Read codebase -------------------------------------------+      |
|                                                              |      |
|  2. Generate suggestions ------------------------------------+      |
|     (AI analysis)                                            |      |
|                                                              |      |
|  3. Validate suggestions ------------------------------------+      |
|     (filter false positives)                                 |      |
|     |                                                        |      |
|     +-- Valid items ---------------+                         |      |
|     |                              |                         |      |
|     +-- Filtered items ------------+-+                       |      |
|                                    | |                       |      |
|  4. Generate PRDs -----------------+ |                       |      |
|     (for each valid item)            |                       |      |
|                                      |                       |      |
|  5. Write to user's Supabase --------+------------------------      |
|     |                                                               |
|     +-- mason_pm_backlog_items (valid items with PRDs)              |
|     +-- mason_pm_filtered_items (filtered items)                    |
|     +-- mason_pm_analysis_runs (run tracking)                       |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Execution Flow

```
+---------------------------------------------------------------------+
|  Dashboard                          CLI: /execute-approved          |
|                                                                     |
|  1. User approves items             2. Fetch approved items         |
|     (status -> 'approved')             from user's Supabase         |
|     |                                  |                            |
|     +---- mason_pm_backlog_items ------+                            |
|                                                                     |
|                                     3. Create execution run         |
|                                        |                            |
|                                        +-- mason_pm_execution_runs  |
|                                                                     |
|                                     4. Execute in waves (parallel)  |
|                                        |                            |
|                                        +-- Write progress ----------+
|                                        |   mason_execution_progress |
|                                        |                            |
|                                        +-- Create tasks ------------+
|                                            mason_pm_execution_tasks |
|                                                                     |
|  5. Real-time updates               <- Supabase realtime -----------+
|     (ExecutionStatusModal)                                               |
|                                                                     |
|                                     6. Create commits/PRs           |
|                                        |                            |
|                                        +-- Update item -------------+
|                                            status -> 'completed'    |
|                                            branch_name, pr_url      |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Authentication Flow

```
+---------------------------------------------------------------------+
|  1. GitHub OAuth                                                    |
|     |                                                               |
|     +-- Central DB: mason_users                                     |
|         (github_id, username, email, avatar)                        |
|                                                                     |
|  2. Connect Supabase (BYOD)                                         |
|     |                                                               |
|     +-- Option A: OAuth                                             |
|     |   +-- Store access token in localStorage                      |
|     |                                                               |
|     +-- Option B: Credentials                                       |
|         +-- Store URL + anon key in localStorage                    |
|                                                                     |
|  3. Run migrations                                                  |
|     |                                                               |
|     +-- User's Supabase: Create all mason_* tables                  |
|                                                                     |
|  4. Connect repositories                                            |
|     |                                                               |
|     +-- Central DB: mason_github_repositories                       |
|     |   (repo identity only)                                        |
|     |                                                               |
|     +-- User's Supabase: mason_github_repositories                  |
|         (full repo details for user's data)                         |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Real-time Subscriptions

```
Dashboard subscribes to:
+---------------------------------------------------------------------+
|                                                                     |
|  mason_execution_progress                                           |
|  +-- INSERT: New execution started -> Show ExecutionStatusModal          |
|  +-- UPDATE: Progress changed -> Update animation                   |
|  +-- DELETE: Execution complete -> Hide ExecutionStatusModal             |
|                                                                     |
|  mason_pm_backlog_items                                             |
|  +-- INSERT: New item from PM review -> Refresh backlog             |
|  +-- UPDATE: Status changed -> Update row                           |
|  +-- DELETE: Item removed -> Remove from list                       |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Cross-Repo Considerations

```
+---------------------------------------------------------------------+
|  User viewing: Repo A (dashboard)                                   |
|  User executing: Repo B (CLI)                                       |
|                                                                     |
|  Real-time progress should STILL show for Repo B                    |
|  |                                                                  |
|  +-- Subscribe WITHOUT repository_id filter                         |
|      (for cross-repo features like execution notifications)         |
|                                                                     |
|  Backlog list should ONLY show Repo A items                         |
|  |                                                                  |
|  +-- Filter WITH repository_id                                      |
|      (for repo-specific data lists)                                 |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Related

- [Architecture Overview](overview.md) - System components
- [Privacy Model](privacy-model.md) - Data isolation rules
- [Database Tables](../database/tables.md) - Schema reference
