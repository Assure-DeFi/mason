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
 * Subagent types available for task execution
 */
export type SubagentType =
  | 'Explore'
  | 'Plan'
  | 'Bash'
  | 'code-reviewer'
  | 'frontend-design'
  | 'general-purpose';

/**
 * An execution run - represents a batch of items being executed
 */
export interface ExecutionRun {
  /** Unique identifier (UUID) */
  id: string;

  /** Backlog item IDs being executed */
  itemIds: string[];

  /** Current status */
  status: ExecutionRunStatus;

  /** Current wave being executed (1-indexed) */
  currentWave: number;

  /** Total number of waves */
  totalWaves: number;

  /** Git branch name for this execution */
  branchName: string;

  /** Backup branch created before execution */
  backupBranch: string | null;

  /** Original HEAD commit at start */
  originalHead: string | null;

  /** Total tokens used */
  tokensUsed: number;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Error message if failed */
  errorMessage: string | null;

  /** Timestamp when created */
  createdAt: Date;

  /** Timestamp when started */
  startedAt: Date | null;

  /** Timestamp when completed */
  completedAt: Date | null;
}

/**
 * A single task within an execution run
 */
export interface ExecutionTask {
  /** Unique identifier (UUID) */
  id: string;

  /** Parent execution run ID */
  runId: string;

  /** Wave number (1-indexed) */
  wave: number;

  /** Task number within wave (1-indexed) */
  taskNumber: number;

  /** Subagent type to use */
  subagentType: SubagentType;

  /** Task description/prompt */
  description: string;

  /** Current status */
  status: ExecutionTaskStatus;

  /** Output/result from execution */
  output: string | null;

  /** Error message if failed */
  errorMessage: string | null;

  /** Tokens used for this task */
  tokensUsed: number;

  /** Timestamp when started */
  startedAt: Date | null;

  /** Timestamp when completed */
  completedAt: Date | null;
}

/**
 * Wave definition for execution planning
 */
export interface ExecutionWave {
  /** Wave number (1-indexed) */
  wave: number;

  /** Tasks in this wave (can run in parallel) */
  tasks: ExecutionWaveTask[];

  /** IDs of waves that must complete before this one */
  blockedBy: number[];
}

/**
 * Task definition within a wave
 */
export interface ExecutionWaveTask {
  /** Task description */
  description: string;

  /** Subagent type to use */
  subagentType: SubagentType;

  /** Related backlog item ID */
  itemId: string;
}

/**
 * Input for creating an execution run
 */
export interface CreateExecutionRunInput {
  itemIds: string[];
  branchName: string;
  waves: ExecutionWave[];
}
