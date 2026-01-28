import type { MasonDatabase } from '../database.js';
import type { Migration, MigrationResult } from './types.js';

import { migration001Initial } from './001_initial.js';

/**
 * All available migrations in order
 */
const MIGRATIONS: Migration[] = [migration001Initial];

/**
 * Run pending migrations
 */
export function runMigrations(db: MasonDatabase): MigrationResult {
  const currentVersion = db.getSchemaVersion();
  const applied: number[] = [];

  // Get pending migrations
  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);

  if (pending.length === 0) {
    return {
      currentVersion,
      applied: [],
      hasChanges: false,
    };
  }

  // Run in transaction
  db.transaction(() => {
    for (const migration of pending) {
      // Apply migration
      migration.up(db);

      // Record it
      db.execute('INSERT INTO schema_versions (version, name) VALUES (?, ?)', [
        migration.version,
        migration.name,
      ]);

      applied.push(migration.version);
    }
  });

  return {
    currentVersion: db.getSchemaVersion(),
    applied,
    hasChanges: true,
  };
}

/**
 * Rollback to a specific version
 */
export function rollbackTo(
  db: MasonDatabase,
  targetVersion: number,
): MigrationResult {
  const currentVersion = db.getSchemaVersion();

  if (targetVersion >= currentVersion) {
    return {
      currentVersion,
      applied: [],
      hasChanges: false,
    };
  }

  // Get migrations to rollback (in reverse order)
  const toRollback = MIGRATIONS.filter(
    (m) => m.version > targetVersion && m.version <= currentVersion,
  ).reverse();

  const rolledBack: number[] = [];

  db.transaction(() => {
    for (const migration of toRollback) {
      // Revert migration
      migration.down(db);

      // Remove record
      db.execute('DELETE FROM schema_versions WHERE version = ?', [
        migration.version,
      ]);

      rolledBack.push(migration.version);
    }
  });

  return {
    currentVersion: db.getSchemaVersion(),
    applied: rolledBack,
    hasChanges: true,
  };
}

/**
 * Get migration status
 */
export function getMigrationStatus(db: MasonDatabase): {
  currentVersion: number;
  latestVersion: number;
  pendingCount: number;
  appliedMigrations: Array<{
    version: number;
    name: string;
    appliedAt: string;
  }>;
} {
  const currentVersion = db.getSchemaVersion();
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
  const pendingCount = MIGRATIONS.filter(
    (m) => m.version > currentVersion,
  ).length;

  const appliedMigrations = db.tableExists('schema_versions')
    ? db
        .query<{
          version: number;
          name: string;
          applied_at: string;
        }>('SELECT version, name, applied_at FROM schema_versions ORDER BY version')
        .map((m) => ({
          version: m.version,
          name: m.name,
          appliedAt: m.applied_at,
        }))
    : [];

  return {
    currentVersion,
    latestVersion,
    pendingCount,
    appliedMigrations,
  };
}
