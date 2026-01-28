import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import type { BacklogItem } from '@mason/storage';

const execAsync = promisify(exec);

/**
 * Subagent types for task execution
 */
export type SubagentType =
  | 'Explore'
  | 'Plan'
  | 'Bash'
  | 'code-reviewer'
  | 'frontend-design'
  | 'general-purpose';

/**
 * Task definition for execution
 */
export interface ExecutionTask {
  id: string;
  wave: number;
  taskNumber: number;
  subagentType: SubagentType;
  description: string;
  itemId: string;
}

/**
 * Wave definition
 */
export interface ExecutionWave {
  wave: number;
  tasks: ExecutionTask[];
}

/**
 * Task result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed: number;
}

/**
 * Generate execution waves for a backlog item
 * This creates a standard wave structure based on the item complexity
 */
export function generateWavesForItem(
  item: BacklogItem,
  baseTaskId: string,
): ExecutionWave[] {
  const waves: ExecutionWave[] = [];

  // Wave 1: Explore - understand the codebase
  waves.push({
    wave: 1,
    tasks: [
      {
        id: `${baseTaskId}-1-1`,
        wave: 1,
        taskNumber: 1,
        subagentType: 'Explore',
        description: `Explore the codebase to understand current implementation related to: ${item.title}. Look at ${item.domain} patterns.`,
        itemId: item.id,
      },
    ],
  });

  // Wave 2: Implementation
  waves.push({
    wave: 2,
    tasks: [
      {
        id: `${baseTaskId}-2-1`,
        wave: 2,
        taskNumber: 1,
        subagentType: 'general-purpose',
        description: `Implement the following improvement:

Title: ${item.title}

Problem: ${item.problem}

Solution: ${item.solution}

Domain: ${item.domain}
Complexity: ${item.complexity}

Follow existing code patterns and conventions. Make minimal changes to achieve the goal.`,
        itemId: item.id,
      },
    ],
  });

  // Wave 3: Validation
  waves.push({
    wave: 3,
    tasks: [
      {
        id: `${baseTaskId}-3-1`,
        wave: 3,
        taskNumber: 1,
        subagentType: 'Bash',
        description: 'Run type checking and linting to validate changes.',
        itemId: item.id,
      },
    ],
  });

  return waves;
}

/**
 * Execute a single task using Claude Code subprocess
 */
export async function executeTask(
  task: ExecutionTask,
  repoPath: string,
): Promise<TaskResult> {
  const prompt = `${task.description}

Work in the repository at: ${repoPath}

Complete this task and report what you did.`;

  try {
    // Execute using Claude CLI
    const { stdout, stderr } = await execAsync(
      `claude --print "${prompt.replace(/"/g, '\\"')}"`,
      {
        cwd: repoPath,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      },
    );

    return {
      taskId: task.id,
      success: true,
      output: stdout + (stderr ? `\n\nStderr:\n${stderr}` : ''),
      tokensUsed: 0, // Would need to parse from Claude output
    };
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string };
    return {
      taskId: task.id,
      success: false,
      output: error.stdout,
      error: error.message,
      tokensUsed: 0,
    };
  }
}

/**
 * Execute a wave of tasks (can be parallel or sequential)
 */
export async function executeWave(
  wave: ExecutionWave,
  repoPath: string,
  onTaskComplete: (result: TaskResult) => void,
): Promise<TaskResult[]> {
  // For safety, execute tasks sequentially
  // Parallel execution could be enabled later with careful git state management
  const results: TaskResult[] = [];

  for (const task of wave.tasks) {
    const result = await executeTask(task, repoPath);
    results.push(result);
    onTaskComplete(result);

    // Stop if task failed
    if (!result.success) {
      break;
    }
  }

  return results;
}

/**
 * Execute all waves for an item
 */
export async function executeItem(
  item: BacklogItem,
  repoPath: string,
  onWaveStart: (wave: number, total: number) => void,
  onTaskComplete: (result: TaskResult) => void,
): Promise<{
  success: boolean;
  results: TaskResult[];
  failedWave?: number;
}> {
  const waves = generateWavesForItem(item, item.id);
  const allResults: TaskResult[] = [];

  for (const wave of waves) {
    onWaveStart(wave.wave, waves.length);

    const results = await executeWave(wave, repoPath, onTaskComplete);
    allResults.push(...results);

    // Check if any task failed
    const failed = results.some((r) => !r.success);
    if (failed) {
      return {
        success: false,
        results: allResults,
        failedWave: wave.wave,
      };
    }
  }

  return {
    success: true,
    results: allResults,
  };
}
