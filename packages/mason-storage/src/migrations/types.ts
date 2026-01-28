import type { MasonDatabase } from '../database.js';

/**
 * A database migration
 */
export interface Migration {
  /** Migration version number (must be unique and sequential) */
  version: number;

  /** Short name for the migration */
  name: string;

  /** Description of what this migration does */
  description: string;

  /** Apply the migration */
  up(db: MasonDatabase): void;

  /** Revert the migration */
  down(db: MasonDatabase): void;
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  /** Current schema version after migrations */
  currentVersion: number;

  /** Migrations that were applied */
  applied: number[];

  /** Whether any migrations were applied */
  hasChanges: boolean;
}
