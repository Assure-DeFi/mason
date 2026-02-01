# Database Tables Reference

## Quick Reference

13 tables total, all prefixed with `mason_`. Always use `TABLES` constant.

---

## mason_users

User accounts with GitHub identity.

| Column                | Type        | Constraints                   | Description        |
| --------------------- | ----------- | ----------------------------- | ------------------ |
| id                    | UUID        | PK, DEFAULT gen_random_uuid() |                    |
| created_at            | TIMESTAMPTZ | DEFAULT NOW()                 |                    |
| updated_at            | TIMESTAMPTZ | DEFAULT NOW()                 |                    |
| github_id             | TEXT        | UNIQUE NOT NULL               | GitHub user ID     |
| github_username       | TEXT        | NOT NULL                      |                    |
| github_email          | TEXT        |                               |                    |
| github_avatar_url     | TEXT        |                               |                    |
| default_repository_id | UUID        |                               | Last selected repo |
| is_active             | BOOLEAN     | DEFAULT true                  |                    |

**Note**: `github_access_token` is NOT stored here - stays in browser localStorage.

---

## mason_api_keys

CLI authentication tokens.

| Column       | Type        | Constraints                          | Description               |
| ------------ | ----------- | ------------------------------------ | ------------------------- |
| id           | UUID        | PK                                   |                           |
| created_at   | TIMESTAMPTZ | DEFAULT NOW()                        |                           |
| user_id      | UUID        | FK -> mason_users, ON DELETE CASCADE |                           |
| name         | TEXT        | DEFAULT 'Default'                    | Key display name          |
| key_hash     | TEXT        | NOT NULL                             | SHA-256 hash of key       |
| key_prefix   | TEXT        | NOT NULL                             | First 8 chars for display |
| last_used_at | TIMESTAMPTZ |                                      |                           |

---

## mason_github_repositories

Connected GitHub repositories.

| Column                | Type        | Constraints                          | Description      |
| --------------------- | ----------- | ------------------------------------ | ---------------- |
| id                    | UUID        | PK                                   |                  |
| created_at            | TIMESTAMPTZ | DEFAULT NOW()                        |                  |
| updated_at            | TIMESTAMPTZ | DEFAULT NOW()                        |                  |
| user_id               | UUID        | FK -> mason_users, ON DELETE CASCADE |                  |
| github_repo_id        | BIGINT      | NOT NULL                             | GitHub's repo ID |
| github_owner          | TEXT        | NOT NULL                             |                  |
| github_name           | TEXT        | NOT NULL                             |                  |
| github_full_name      | TEXT        | NOT NULL                             | owner/name       |
| github_default_branch | TEXT        | DEFAULT 'main'                       |                  |
| github_private        | BOOLEAN     | DEFAULT false                        |                  |
| github_clone_url      | TEXT        | NOT NULL                             |                  |
| github_html_url       | TEXT        | NOT NULL                             |                  |
| is_active             | BOOLEAN     | DEFAULT true                         |                  |
| last_synced_at        | TIMESTAMPTZ |                                      |                  |

**Unique constraint**: (user_id, github_repo_id)

---

## mason_pm_backlog_items

Main backlog items with PRDs.

| Column           | Type        | Constraints                                                                      | Description              |
| ---------------- | ----------- | -------------------------------------------------------------------------------- | ------------------------ |
| id               | UUID        | PK                                                                               |                          |
| created_at       | TIMESTAMPTZ | DEFAULT NOW()                                                                    |                          |
| updated_at       | TIMESTAMPTZ | DEFAULT NOW()                                                                    |                          |
| user_id          | UUID        | FK -> mason_users                                                                |                          |
| repository_id    | UUID        | FK -> mason_github_repositories                                                  |                          |
| analysis_run_id  | UUID        | FK -> mason_pm_analysis_runs                                                     |                          |
| title            | TEXT        | NOT NULL                                                                         |                          |
| problem          | TEXT        | NOT NULL                                                                         |                          |
| solution         | TEXT        | NOT NULL                                                                         |                          |
| area             | TEXT        | CHECK IN ('frontend', 'backend')                                                 |                          |
| type             | TEXT        | CHECK IN ('dashboard', 'discovery', 'auth', 'backend')                           |                          |
| complexity       | INTEGER     | CHECK 1-5                                                                        |                          |
| impact_score     | INTEGER     | CHECK 1-10                                                                       |                          |
| effort_score     | INTEGER     | CHECK 1-10                                                                       |                          |
| priority_score   | INTEGER     | GENERATED (impact\*2 - effort)                                                   | Computed column          |
| benefits         | JSONB       | DEFAULT '[]'                                                                     | Array of Benefit objects |
| status           | TEXT        | CHECK IN ('new', 'approved', 'in_progress', 'completed', 'deferred', 'rejected') | DEFAULT 'new'            |
| branch_name      | TEXT        |                                                                                  | Git branch if created    |
| pr_url           | TEXT        |                                                                                  | PR URL if created        |
| prd_content      | TEXT        |                                                                                  | PRD markdown             |
| prd_generated_at | TIMESTAMPTZ |                                                                                  |                          |

---

## mason_pm_analysis_runs

PM review analysis tracking.

| Column        | Type        | Constraints                                     | Description |
| ------------- | ----------- | ----------------------------------------------- | ----------- |
| id            | UUID        | PK                                              |             |
| created_at    | TIMESTAMPTZ | DEFAULT NOW()                                   |             |
| user_id       | UUID        | FK -> mason_users                               |             |
| repository_id | UUID        | FK -> mason_github_repositories                 |             |
| mode          | TEXT        | DEFAULT 'full'                                  |             |
| items_found   | INTEGER     | DEFAULT 0                                       |             |
| started_at    | TIMESTAMPTZ | DEFAULT NOW()                                   |             |
| completed_at  | TIMESTAMPTZ |                                                 |             |
| status        | TEXT        | CHECK IN ('in_progress', 'completed', 'failed') |             |
| error_message | TEXT        |                                                 |             |

---

## mason_pm_filtered_items

Items filtered out during PM validation.

| Column            | Type         | Constraints                          | Description              |
| ----------------- | ------------ | ------------------------------------ | ------------------------ |
| id                | UUID         | PK                                   |                          |
| created_at        | TIMESTAMPTZ  | DEFAULT NOW()                        |                          |
| title             | TEXT         | NOT NULL                             |                          |
| problem           | TEXT         | NOT NULL                             |                          |
| solution          | TEXT         | NOT NULL                             |                          |
| type              | TEXT         | NOT NULL                             |                          |
| area              | TEXT         | NOT NULL                             |                          |
| impact_score      | INTEGER      | NOT NULL                             |                          |
| effort_score      | INTEGER      | NOT NULL                             |                          |
| complexity        | INTEGER      | DEFAULT 2                            |                          |
| benefits          | JSONB        | DEFAULT '[]'                         |                          |
| filter_reason     | TEXT         | NOT NULL                             | Why it was filtered      |
| filter_tier       | TEXT         | CHECK IN ('tier1', 'tier2', 'tier3') | Validation tier          |
| filter_confidence | DECIMAL(3,2) | NOT NULL                             | 0.00-1.00                |
| evidence          | TEXT         |                                      | Supporting evidence      |
| analysis_run_id   | UUID         | FK -> mason_pm_analysis_runs         |                          |
| override_status   | TEXT         | DEFAULT 'filtered'                   | 'filtered' or 'restored' |
| repository_id     | UUID         | FK -> mason_github_repositories      |                          |

---

## mason_pm_execution_runs

Batch execution tracking (/execute-approved).

| Column          | Type        | Constraints                                                           | Description |
| --------------- | ----------- | --------------------------------------------------------------------- | ----------- |
| id              | UUID        | PK                                                                    |             |
| created_at      | TIMESTAMPTZ | DEFAULT NOW()                                                         |             |
| item_count      | INTEGER     | DEFAULT 0                                                             |             |
| started_at      | TIMESTAMPTZ | DEFAULT NOW()                                                         |             |
| completed_at    | TIMESTAMPTZ |                                                                       |             |
| status          | TEXT        | CHECK IN ('pending', 'in_progress', 'success', 'failed', 'cancelled') |             |
| error_message   | TEXT        |                                                                       |             |
| tasks_completed | INTEGER     | DEFAULT 0                                                             |             |
| tasks_failed    | INTEGER     | DEFAULT 0                                                             |             |
| total_tasks     | INTEGER     | DEFAULT 0                                                             |             |

---

## mason_pm_execution_tasks

Individual tasks within execution runs.

| Column         | Type        | Constraints                                                                                 | Description      |
| -------------- | ----------- | ------------------------------------------------------------------------------------------- | ---------------- |
| id             | UUID        | PK                                                                                          |                  |
| created_at     | TIMESTAMPTZ | DEFAULT NOW()                                                                               |                  |
| run_id         | UUID        | FK -> mason_pm_execution_runs                                                               |                  |
| item_id        | UUID        | FK -> mason_pm_backlog_items                                                                |                  |
| wave_number    | INTEGER     | NOT NULL                                                                                    | Parallel wave    |
| task_number    | INTEGER     | NOT NULL                                                                                    | Task within wave |
| description    | TEXT        | NOT NULL                                                                                    |                  |
| subagent_type  | TEXT        | CHECK IN ('Explore', 'general-purpose', 'Bash', 'code-reviewer', 'frontend-design', 'Plan') |                  |
| status         | TEXT        | CHECK IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')                       |                  |
| started_at     | TIMESTAMPTZ |                                                                                             |                  |
| completed_at   | TIMESTAMPTZ |                                                                                             |                  |
| error_message  | TEXT        |                                                                                             |                  |
| result_summary | TEXT        |                                                                                             |                  |

---

## mason_remote_execution_runs

Remote execution tracking.

| Column                 | Type        | Constraints                                                           | Description               |
| ---------------------- | ----------- | --------------------------------------------------------------------- | ------------------------- |
| id                     | UUID        | PK                                                                    |                           |
| created_at             | TIMESTAMPTZ | DEFAULT NOW()                                                         |                           |
| user_id                | UUID        | FK -> mason_users                                                     |                           |
| repository_id          | UUID        | FK -> mason_github_repositories                                       |                           |
| item_ids               | UUID[]      | DEFAULT '{}'                                                          | Items being executed      |
| item_count             | INTEGER     | DEFAULT 0                                                             |                           |
| branch_name            | TEXT        | NOT NULL                                                              |                           |
| base_branch            | TEXT        | DEFAULT 'main'                                                        |                           |
| pr_url                 | TEXT        |                                                                       |                           |
| pr_number              | INTEGER     |                                                                       |                           |
| started_at             | TIMESTAMPTZ | DEFAULT NOW()                                                         |                           |
| completed_at           | TIMESTAMPTZ |                                                                       |                           |
| status                 | TEXT        | CHECK IN ('pending', 'in_progress', 'success', 'failed', 'cancelled') |                           |
| error_message          | TEXT        |                                                                       |                           |
| files_changed          | INTEGER     | DEFAULT 0                                                             |                           |
| lines_added            | INTEGER     | DEFAULT 0                                                             |                           |
| lines_removed          | INTEGER     | DEFAULT 0                                                             |                           |
| idempotency_key        | TEXT        |                                                                       | For request deduplication |
| idempotency_expires_at | TIMESTAMPTZ |                                                                       |                           |
| item_results           | JSONB       |                                                                       | Per-item success/failure  |
| success_count          | INTEGER     |                                                                       |                           |
| failure_count          | INTEGER     |                                                                       |                           |

---

## mason_execution_logs

Execution log messages.

| Column           | Type        | Constraints                                 | Description    |
| ---------------- | ----------- | ------------------------------------------- | -------------- |
| id               | UUID        | PK                                          |                |
| created_at       | TIMESTAMPTZ | DEFAULT NOW()                               |                |
| execution_run_id | UUID        | FK -> mason_remote_execution_runs           |                |
| log_level        | TEXT        | CHECK IN ('debug', 'info', 'warn', 'error') | DEFAULT 'info' |
| message          | TEXT        | NOT NULL                                    |                |
| metadata         | JSONB       | DEFAULT '{}'                                |                |

---

## mason_execution_progress

Real-time progress for dashboard (has Supabase realtime enabled).

| Column                | Type        | Constraints                                                                  | Description                      |
| --------------------- | ----------- | ---------------------------------------------------------------------------- | -------------------------------- |
| id                    | UUID        | PK                                                                           |                                  |
| item_id               | UUID        | FK -> mason_pm_backlog_items, UNIQUE                                         |                                  |
| run_id                | TEXT        |                                                                              | Batch execution group (nullable) |
| current_phase         | TEXT        | CHECK IN ('site_review', 'foundation', 'building', 'inspection', 'complete') |                                  |
| current_wave          | INTEGER     | DEFAULT 1                                                                    |                                  |
| total_waves           | INTEGER     | DEFAULT 4                                                                    |                                  |
| wave_status           | TEXT        | CHECK IN ('pending', 'in_progress', 'completed')                             |                                  |
| current_task          | TEXT        |                                                                              |                                  |
| tasks_completed       | INTEGER     | DEFAULT 0                                                                    |                                  |
| tasks_total           | INTEGER     | DEFAULT 0                                                                    |                                  |
| current_file          | TEXT        |                                                                              |                                  |
| files_touched         | TEXT[]      | DEFAULT '{}'                                                                 |                                  |
| lines_changed         | INTEGER     | DEFAULT 0                                                                    |                                  |
| validation_typescript | TEXT        | CHECK IN ('pending', 'running', 'pass', 'fail')                              |                                  |
| validation_eslint     | TEXT        | CHECK IN ('pending', 'running', 'pass', 'fail')                              |                                  |
| validation_build      | TEXT        | CHECK IN ('pending', 'running', 'pass', 'fail')                              |                                  |
| validation_tests      | TEXT        | CHECK IN ('pending', 'running', 'pass', 'fail')                              |                                  |
| inspector_findings    | TEXT[]      | DEFAULT '{}'                                                                 |                                  |
| fix_iteration         | INTEGER     | DEFAULT 0                                                                    |                                  |
| max_iterations        | INTEGER     | DEFAULT 5                                                                    |                                  |
| started_at            | TIMESTAMPTZ | DEFAULT NOW()                                                                |                                  |
| updated_at            | TIMESTAMPTZ | DEFAULT NOW()                                                                |                                  |
| completed_at          | TIMESTAMPTZ |                                                                              |                                  |

**Note**: This table has Supabase realtime enabled for live dashboard updates.

---

## mason_ai_provider_keys

User's AI API keys (stored in user's own database).

| Column     | Type        | Constraints                      | Description            |
| ---------- | ----------- | -------------------------------- | ---------------------- |
| id         | UUID        | PK                               |                        |
| user_id    | UUID        | FK -> mason_users                |                        |
| provider   | TEXT        | CHECK IN ('anthropic', 'openai') |                        |
| api_key    | TEXT        | NOT NULL                         | Encrypted in user's DB |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                    |                        |
| updated_at | TIMESTAMPTZ | DEFAULT NOW()                    |                        |

**Unique constraint**: (user_id, provider)

---

## mason_pm_restore_feedback

Tracks restored items for filter confidence decay.

| Column           | Type        | Constraints                   | Description |
| ---------------- | ----------- | ----------------------------- | ----------- |
| id               | UUID        | PK                            |             |
| created_at       | TIMESTAMPTZ | DEFAULT NOW()                 |             |
| filtered_item_id | UUID        | FK -> mason_pm_filtered_items |             |
| filter_tier      | TEXT        | NOT NULL                      |             |
| filter_reason    | TEXT        | NOT NULL                      |             |
| restored_at      | TIMESTAMPTZ | NOT NULL                      |             |

---

## Indexes

All tables have appropriate indexes. Key ones:

- `idx_mason_pm_backlog_items_repository_id` - Filter by repo
- `idx_mason_pm_backlog_items_status` - Filter by status
- `idx_mason_api_keys_key_hash` - API key lookup
- `idx_mason_execution_progress_item` - Progress lookup

---

## RLS Policies

All tables have RLS enabled with "Allow all" policies (BYOD model - users own their database).
