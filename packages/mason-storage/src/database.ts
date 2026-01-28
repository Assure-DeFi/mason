import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Database connection options
 */
export interface DatabaseOptions {
  /** Path to the database file */
  path: string;

  /** Enable WAL mode for better concurrency (default: true) */
  walMode?: boolean;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Mason database wrapper
 */
export class MasonDatabase {
  private db: Database.Database;
  private readonly path: string;

  constructor(options: DatabaseOptions) {
    this.path = options.path;

    // Ensure directory exists
    const dir = dirname(options.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(options.path, {
      verbose: options.verbose ? console.log : undefined,
    });

    // Enable WAL mode for better concurrency
    if (options.walMode !== false) {
      this.db.pragma('journal_mode = WAL');
    }

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Optimize for performance
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
  }

  /**
   * Get the raw database instance for direct queries
   */
  get raw(): Database.Database {
    return this.db;
  }

  /**
   * Get the database file path
   */
  get filePath(): string {
    return this.path;
  }

  /**
   * Execute a query that returns rows
   */
  query<T>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  }

  /**
   * Execute a query that returns a single row
   */
  queryOne<T>(sql: string, params?: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  /**
   * Execute a statement that modifies data
   */
  execute(sql: string, params?: unknown[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return params ? stmt.run(...params) : stmt.run();
  }

  /**
   * Execute multiple statements in a transaction
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Check if a table exists
   */
  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master
       WHERE type='table' AND name=?`,
      [tableName],
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get all table names
   */
  getTables(): string[] {
    const tables = this.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
    );
    return tables.map((t) => t.name);
  }

  /**
   * Get the current schema version
   */
  getSchemaVersion(): number {
    if (!this.tableExists('schema_versions')) {
      return 0;
    }
    const result = this.queryOne<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_versions',
    );
    return result?.version ?? 0;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Create a database instance for a repository
 */
export function createDatabase(
  repoPath: string,
  dataDir = '.mason',
): MasonDatabase {
  const dbPath = join(repoPath, dataDir, 'mason.db');
  return new MasonDatabase({ path: dbPath });
}

/**
 * Create an in-memory database for testing
 */
export function createMemoryDatabase(): MasonDatabase {
  return new MasonDatabase({ path: ':memory:' });
}
