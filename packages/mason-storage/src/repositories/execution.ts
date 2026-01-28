import { randomUUID } from 'node:crypto';

import type { MasonDatabase } from '../database.js';

/**
 * Execution run status
 */
export type ExecutionRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Execution task status
 */
export type ExecutionTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Subagent types
 */
export type SubagentType =
  | 'Explore'
  | 'Plan'
  | 'Bash'
  | 'code-reviewer'
  | 'frontend-design'
  | 'general-purpose';

/**
 * Database row for execution run
 */
interface ExecutionRunRow {
  id: string;
  item_ids: string;
  status: string;
  current_wave: number;
  total_waves: number;
  branch_name: string;
  backup_branch: string | null;
  original_head: string | null;
  tokens_used: number;
  estimated_cost: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Database row for execution task
 */
interface ExecutionTaskRow {
  id: string;
  run_id: string;
  wave: number;
  task_number: number;
  subagent_type: string;
  description: string;
  status: string;
  output: string | null;
  error_message: string | null;
  tokens_used: number;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Execution run entity
 */
export interface ExecutionRun {
  id: string;
  itemIds: string[];
  status: ExecutionRunStatus;
  currentWave: number;
  totalWaves: number;
  branchName: string;
  backupBranch: string | null;
  originalHead: string | null;
  tokensUsed: number;
  estimatedCost: number;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Execution task entity
 */
export interface ExecutionTask {
  id: string;
  runId: string;
  wave: number;
  taskNumber: number;
  subagentType: SubagentType;
  description: string;
  status: ExecutionTaskStatus;
  output: string | null;
  errorMessage: string | null;
  tokensUsed: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Input for creating an execution run
 */
export interface CreateExecutionRunInput {
  itemIds: string[];
  branchName: string;
  totalWaves: number;
  backupBranch?: string;
  originalHead?: string;
}

/**
 * Input for creating an execution task
 */
export interface CreateExecutionTaskInput {
  runId: string;
  wave: number;
  taskNumber: number;
  subagentType: SubagentType;
  description: string;
}

function runRowToEntity(row: ExecutionRunRow): ExecutionRun {
  return {
    id: row.id,
    itemIds: JSON.parse(row.item_ids),
    status: row.status as ExecutionRunStatus,
    currentWave: row.current_wave,
    totalWaves: row.total_waves,
    branchName: row.branch_name,
    backupBranch: row.backup_branch,
    originalHead: row.original_head,
    tokensUsed: row.tokens_used,
    estimatedCost: row.estimated_cost,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

function taskRowToEntity(row: ExecutionTaskRow): ExecutionTask {
  return {
    id: row.id,
    runId: row.run_id,
    wave: row.wave,
    taskNumber: row.task_number,
    subagentType: row.subagent_type as SubagentType,
    description: row.description,
    status: row.status as ExecutionTaskStatus,
    output: row.output,
    errorMessage: row.error_message,
    tokensUsed: row.tokens_used,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

/**
 * Repository for execution runs
 */
export class ExecutionRunRepository {
  constructor(private db: MasonDatabase) {}

  /**
   * Create a new execution run
   */
  create(input: CreateExecutionRunInput): ExecutionRun {
    const id = randomUUID();

    this.db.execute(
      `INSERT INTO execution_runs (
        id, item_ids, branch_name, total_waves, backup_branch, original_head
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        JSON.stringify(input.itemIds),
        input.branchName,
        input.totalWaves,
        input.backupBranch ?? null,
        input.originalHead ?? null,
      ],
    );

    return this.getById(id)!;
  }

  /**
   * Get an execution run by ID
   */
  getById(id: string): ExecutionRun | undefined {
    const row = this.db.queryOne<ExecutionRunRow>(
      'SELECT * FROM execution_runs WHERE id = ?',
      [id],
    );
    return row ? runRowToEntity(row) : undefined;
  }

  /**
   * Get the most recent execution run
   */
  getLatest(): ExecutionRun | undefined {
    const row = this.db.queryOne<ExecutionRunRow>(
      'SELECT * FROM execution_runs ORDER BY created_at DESC LIMIT 1',
    );
    return row ? runRowToEntity(row) : undefined;
  }

  /**
   * List execution runs
   */
  list(
    options: { status?: ExecutionRunStatus; limit?: number } = {},
  ): ExecutionRun[] {
    let sql = 'SELECT * FROM execution_runs';
    const params: unknown[] = [];

    if (options.status !== undefined) {
      sql += ' WHERE status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.query<ExecutionRunRow>(sql, params);
    return rows.map(runRowToEntity);
  }

  /**
   * Update run status
   */
  updateStatus(
    id: string,
    status: ExecutionRunStatus,
    errorMessage?: string,
  ): void {
    const updates = ['status = ?'];
    const params: unknown[] = [status];

    if (status === 'running') {
      updates.push("started_at = datetime('now')");
    }

    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      updates.push("completed_at = datetime('now')");
    }

    if (errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(errorMessage);
    }

    params.push(id);

    this.db.execute(
      `UPDATE execution_runs SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );
  }

  /**
   * Update current wave
   */
  updateWave(id: string, wave: number): void {
    this.db.execute('UPDATE execution_runs SET current_wave = ? WHERE id = ?', [
      wave,
      id,
    ]);
  }

  /**
   * Add tokens and cost
   */
  addUsage(id: string, tokens: number, cost: number): void {
    this.db.execute(
      `UPDATE execution_runs
       SET tokens_used = tokens_used + ?, estimated_cost = estimated_cost + ?
       WHERE id = ?`,
      [tokens, cost, id],
    );
  }
}

/**
 * Repository for execution tasks
 */
export class ExecutionTaskRepository {
  constructor(private db: MasonDatabase) {}

  /**
   * Create a new execution task
   */
  create(input: CreateExecutionTaskInput): ExecutionTask {
    const id = randomUUID();

    this.db.execute(
      `INSERT INTO execution_tasks (
        id, run_id, wave, task_number, subagent_type, description
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.runId,
        input.wave,
        input.taskNumber,
        input.subagentType,
        input.description,
      ],
    );

    return this.getById(id)!;
  }

  /**
   * Create multiple tasks in a batch
   */
  createMany(inputs: CreateExecutionTaskInput[]): ExecutionTask[] {
    const tasks: ExecutionTask[] = [];

    this.db.transaction(() => {
      for (const input of inputs) {
        tasks.push(this.create(input));
      }
    });

    return tasks;
  }

  /**
   * Get a task by ID
   */
  getById(id: string): ExecutionTask | undefined {
    const row = this.db.queryOne<ExecutionTaskRow>(
      'SELECT * FROM execution_tasks WHERE id = ?',
      [id],
    );
    return row ? taskRowToEntity(row) : undefined;
  }

  /**
   * Get tasks for a run
   */
  getByRunId(runId: string): ExecutionTask[] {
    const rows = this.db.query<ExecutionTaskRow>(
      'SELECT * FROM execution_tasks WHERE run_id = ? ORDER BY wave, task_number',
      [runId],
    );
    return rows.map(taskRowToEntity);
  }

  /**
   * Get tasks for a specific wave
   */
  getByWave(runId: string, wave: number): ExecutionTask[] {
    const rows = this.db.query<ExecutionTaskRow>(
      'SELECT * FROM execution_tasks WHERE run_id = ? AND wave = ? ORDER BY task_number',
      [runId, wave],
    );
    return rows.map(taskRowToEntity);
  }

  /**
   * Update task status
   */
  updateStatus(
    id: string,
    status: ExecutionTaskStatus,
    options: {
      output?: string;
      errorMessage?: string;
      tokensUsed?: number;
    } = {},
  ): void {
    const updates = ['status = ?'];
    const params: unknown[] = [status];

    if (status === 'running') {
      updates.push("started_at = datetime('now')");
    }

    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      updates.push("completed_at = datetime('now')");
    }

    if (options.output !== undefined) {
      updates.push('output = ?');
      params.push(options.output);
    }

    if (options.errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(options.errorMessage);
    }

    if (options.tokensUsed !== undefined) {
      updates.push('tokens_used = ?');
      params.push(options.tokensUsed);
    }

    params.push(id);

    this.db.execute(
      `UPDATE execution_tasks SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );
  }

  /**
   * Count tasks by status for a run
   */
  countByStatus(runId: string): Record<ExecutionTaskStatus, number> {
    const rows = this.db.query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM execution_tasks WHERE run_id = ? GROUP BY status',
      [runId],
    );

    const result: Record<ExecutionTaskStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const row of rows) {
      result[row.status as ExecutionTaskStatus] = row.count;
    }

    return result;
  }
}
