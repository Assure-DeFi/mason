import type { Migration } from './types.js';

export const migration001Initial: Migration = {
  version: 1,
  name: 'initial',
  description:
    'Create core tables: backlog_items, execution_runs, execution_tasks',

  up(db) {
    // Schema versions table (for migration tracking)
    db.execute(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Backlog items table
    db.execute(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
        effort_score INTEGER NOT NULL CHECK (effort_score >= 1 AND effort_score <= 10),
        priority_score INTEGER NOT NULL,
        domain TEXT NOT NULL,
        complexity TEXT NOT NULL CHECK (complexity IN ('low', 'medium', 'high', 'very_high')),
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'in_progress', 'completed', 'failed')),
        branch_name TEXT,
        prd_content TEXT,
        file_hashes TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Indexes for backlog_items
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(status)',
    );
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_backlog_items_domain ON backlog_items(domain)',
    );
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_backlog_items_priority ON backlog_items(priority_score DESC)',
    );

    // Execution runs table
    db.execute(`
      CREATE TABLE IF NOT EXISTS execution_runs (
        id TEXT PRIMARY KEY,
        item_ids TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        current_wave INTEGER NOT NULL DEFAULT 0,
        total_waves INTEGER NOT NULL DEFAULT 0,
        branch_name TEXT NOT NULL,
        backup_branch TEXT,
        original_head TEXT,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        estimated_cost REAL NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT
      )
    `);

    // Indexes for execution_runs
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_execution_runs_status ON execution_runs(status)',
    );
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_execution_runs_created ON execution_runs(created_at DESC)',
    );

    // Execution tasks table
    db.execute(`
      CREATE TABLE IF NOT EXISTS execution_tasks (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
        wave INTEGER NOT NULL,
        task_number INTEGER NOT NULL,
        subagent_type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
        output TEXT,
        error_message TEXT,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT
      )
    `);

    // Indexes for execution_tasks
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_execution_tasks_run ON execution_tasks(run_id)',
    );
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_execution_tasks_wave ON execution_tasks(run_id, wave)',
    );

    // Review checkpoints table (for crash recovery)
    db.execute(`
      CREATE TABLE IF NOT EXISTS review_checkpoints (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        config_hash TEXT NOT NULL,
        completed_domains TEXT NOT NULL DEFAULT '[]',
        pending_domains TEXT NOT NULL DEFAULT '[]',
        partial_results TEXT NOT NULL DEFAULT '[]',
        tokens_used INTEGER NOT NULL DEFAULT 0,
        cost_so_far REAL NOT NULL DEFAULT 0,
        file_hashes TEXT NOT NULL DEFAULT '{}'
      )
    `);

    // Review cache table
    db.execute(`
      CREATE TABLE IF NOT EXISTS review_cache (
        key TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        file_hashes TEXT NOT NULL,
        results TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0
      )
    `);

    // Index for cache expiry
    db.execute(
      'CREATE INDEX IF NOT EXISTS idx_review_cache_expires ON review_cache(expires_at)',
    );
  },

  down(db) {
    db.execute('DROP TABLE IF EXISTS review_cache');
    db.execute('DROP TABLE IF EXISTS review_checkpoints');
    db.execute('DROP TABLE IF EXISTS execution_tasks');
    db.execute('DROP TABLE IF EXISTS execution_runs');
    db.execute('DROP TABLE IF EXISTS backlog_items');
    db.execute('DROP TABLE IF EXISTS schema_versions');
  },
};
