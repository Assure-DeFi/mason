/**
 * Mason PM System - Execution Types
 */

export type ExecutionRunStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled';

export type ExecutionTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export type SubagentType =
  | 'Explore'
  | 'general-purpose'
  | 'Bash'
  | 'code-reviewer'
  | 'frontend-design'
  | 'Plan';

export interface ExecutionRun {
  id: string;
  created_at: string;
  item_count: number;
  started_at: string;
  completed_at: string | null;
  status: ExecutionRunStatus;
  error_message: string | null;
  tasks_completed: number;
  tasks_failed: number;
  total_tasks: number;
}

export interface ExecutionTask {
  id: string;
  created_at: string;
  run_id: string;
  item_id: string;
  wave_number: number;
  task_number: number;
  description: string;
  subagent_type: SubagentType;
  status: ExecutionTaskStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  result_summary: string | null;
}

export interface ExecutionTaskDetail extends ExecutionTask {
  item_title: string;
  item_area: string;
  run_status: ExecutionRunStatus;
}

export interface ExecutionProgress {
  run: ExecutionRun;
  tasks: ExecutionTask[];
  currentWave: number;
  totalWaves: number;
  completedTasks: number;
  totalTasks: number;
}
