import { randomUUID } from 'node:crypto';

import type { MasonDatabase } from '../database.js';

/**
 * Backlog item status
 */
export type BacklogItemStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'failed';

/**
 * Complexity levels
 */
export type Complexity = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Database row for backlog item
 */
interface BacklogItemRow {
  id: string;
  title: string;
  problem: string;
  solution: string;
  impact_score: number;
  effort_score: number;
  priority_score: number;
  domain: string;
  complexity: string;
  status: string;
  branch_name: string | null;
  prd_content: string | null;
  file_hashes: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

/**
 * Backlog item entity
 */
export interface BacklogItem {
  id: string;
  title: string;
  problem: string;
  solution: string;
  impactScore: number;
  effortScore: number;
  priorityScore: number;
  domain: string;
  complexity: Complexity;
  status: BacklogItemStatus;
  branchName: string | null;
  prdContent: string | null;
  fileHashes: Record<string, string> | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a backlog item
 */
export interface CreateBacklogItemInput {
  title: string;
  problem: string;
  solution: string;
  impactScore: number;
  effortScore: number;
  domain: string;
  complexity: Complexity;
  fileHashes?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a backlog item
 */
export interface UpdateBacklogItemInput {
  title?: string;
  problem?: string;
  solution?: string;
  impactScore?: number;
  effortScore?: number;
  domain?: string;
  complexity?: Complexity;
  status?: BacklogItemStatus;
  branchName?: string | null;
  prdContent?: string | null;
  fileHashes?: Record<string, string> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filter options for listing backlog items
 */
export interface BacklogItemFilter {
  status?: BacklogItemStatus | BacklogItemStatus[];
  domain?: string;
  minPriority?: number;
  limit?: number;
  offset?: number;
}

function rowToEntity(row: BacklogItemRow): BacklogItem {
  return {
    id: row.id,
    title: row.title,
    problem: row.problem,
    solution: row.solution,
    impactScore: row.impact_score,
    effortScore: row.effort_score,
    priorityScore: row.priority_score,
    domain: row.domain,
    complexity: row.complexity as Complexity,
    status: row.status as BacklogItemStatus,
    branchName: row.branch_name,
    prdContent: row.prd_content,
    fileHashes: row.file_hashes ? JSON.parse(row.file_hashes) : null,
    metadata: JSON.parse(row.metadata),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Repository for backlog items
 */
export class BacklogRepository {
  constructor(private db: MasonDatabase) {}

  /**
   * Create a new backlog item
   */
  create(input: CreateBacklogItemInput): BacklogItem {
    const id = randomUUID();
    const priorityScore = input.impactScore * 2 - input.effortScore;
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO backlog_items (
        id, title, problem, solution, impact_score, effort_score,
        priority_score, domain, complexity, file_hashes, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.problem,
        input.solution,
        input.impactScore,
        input.effortScore,
        priorityScore,
        input.domain,
        input.complexity,
        input.fileHashes ? JSON.stringify(input.fileHashes) : null,
        JSON.stringify(input.metadata ?? {}),
        now,
        now,
      ],
    );

    return this.getById(id)!;
  }

  /**
   * Get a backlog item by ID
   */
  getById(id: string): BacklogItem | undefined {
    const row = this.db.queryOne<BacklogItemRow>(
      'SELECT * FROM backlog_items WHERE id = ?',
      [id],
    );
    return row ? rowToEntity(row) : undefined;
  }

  /**
   * List backlog items with optional filters
   */
  list(filter: BacklogItemFilter = {}): BacklogItem[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status !== undefined) {
      if (Array.isArray(filter.status)) {
        conditions.push(
          `status IN (${filter.status.map(() => '?').join(', ')})`,
        );
        params.push(...filter.status);
      } else {
        conditions.push('status = ?');
        params.push(filter.status);
      }
    }

    if (filter.domain !== undefined) {
      conditions.push('domain = ?');
      params.push(filter.domain);
    }

    if (filter.minPriority !== undefined) {
      conditions.push('priority_score >= ?');
      params.push(filter.minPriority);
    }

    let sql = 'SELECT * FROM backlog_items';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY priority_score DESC';

    if (filter.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    const rows = this.db.query<BacklogItemRow>(sql, params);
    return rows.map(rowToEntity);
  }

  /**
   * Update a backlog item
   */
  update(id: string, input: UpdateBacklogItemInput): BacklogItem | undefined {
    const existing = this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }

    if (input.problem !== undefined) {
      updates.push('problem = ?');
      params.push(input.problem);
    }

    if (input.solution !== undefined) {
      updates.push('solution = ?');
      params.push(input.solution);
    }

    if (input.impactScore !== undefined || input.effortScore !== undefined) {
      const impact = input.impactScore ?? existing.impactScore;
      const effort = input.effortScore ?? existing.effortScore;
      const priority = impact * 2 - effort;

      if (input.impactScore !== undefined) {
        updates.push('impact_score = ?');
        params.push(impact);
      }
      if (input.effortScore !== undefined) {
        updates.push('effort_score = ?');
        params.push(effort);
      }
      updates.push('priority_score = ?');
      params.push(priority);
    }

    if (input.domain !== undefined) {
      updates.push('domain = ?');
      params.push(input.domain);
    }

    if (input.complexity !== undefined) {
      updates.push('complexity = ?');
      params.push(input.complexity);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    if (input.branchName !== undefined) {
      updates.push('branch_name = ?');
      params.push(input.branchName);
    }

    if (input.prdContent !== undefined) {
      updates.push('prd_content = ?');
      params.push(input.prdContent);
    }

    if (input.fileHashes !== undefined) {
      updates.push('file_hashes = ?');
      params.push(input.fileHashes ? JSON.stringify(input.fileHashes) : null);
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    this.db.execute(
      `UPDATE backlog_items SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    return this.getById(id);
  }

  /**
   * Delete a backlog item
   */
  delete(id: string): boolean {
    const result = this.db.execute('DELETE FROM backlog_items WHERE id = ?', [
      id,
    ]);
    return result.changes > 0;
  }

  /**
   * Count backlog items by status
   */
  countByStatus(): Record<BacklogItemStatus, number> {
    const rows = this.db.query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM backlog_items GROUP BY status',
    );

    const result: Record<BacklogItemStatus, number> = {
      new: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
    };

    for (const row of rows) {
      result[row.status as BacklogItemStatus] = row.count;
    }

    return result;
  }

  /**
   * Approve multiple items by ID
   */
  approveMany(ids: string[]): number {
    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => '?').join(', ');
    const result = this.db.execute(
      `UPDATE backlog_items
       SET status = 'approved', updated_at = datetime('now')
       WHERE id IN (${placeholders}) AND status = 'new'`,
      ids,
    );

    return result.changes;
  }
}
