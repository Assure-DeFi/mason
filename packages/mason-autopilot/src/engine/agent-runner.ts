/**
 * Agent Runner - Core SDK Wrapper
 *
 * Uses @anthropic-ai/claude-agent-sdk to execute commands directly
 * instead of spawning claude CLI subprocesses.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

// Track consecutive failures for backoff logic
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

export interface AgentConfig {
  repositoryPath: string;
  verbose: boolean;
  supabase: SupabaseClient;
  userId: string;
  repositoryId: string;
  runId?: string;
}

/**
 * Get current failure count (for external backoff decisions)
 */
export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

/**
 * Reset failure counter (call after successful run)
 */
export function resetFailureCounter(): void {
  consecutiveFailures = 0;
}

/**
 * Check if we should skip due to too many failures
 */
export function shouldSkipDueToFailures(): boolean {
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
}

/**
 * Extract detailed error information from SDK errors
 */
function extractErrorDetails(error: unknown): {
  message: string;
  code?: string;
  details?: string;
} {
  if (error instanceof Error) {
    const message = error.message;

    // Check for specific error patterns
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        message: 'API rate limit exceeded',
        code: 'RATE_LIMIT',
        details: message,
      };
    }
    if (message.includes('authentication') || message.includes('401')) {
      return {
        message: 'Authentication failed - credentials may have expired',
        code: 'AUTH_FAILED',
        details: message,
      };
    }
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        message: 'Request timed out',
        code: 'TIMEOUT',
        details: message,
      };
    }
    if (message.includes('exited with code')) {
      // Extract more context from the error
      const stack = error.stack || '';
      return {
        message: message,
        code: 'PROCESS_EXIT',
        details: `Error: ${message}\nStack: ${stack.slice(0, 500)}`,
      };
    }

    return {
      message: message,
      details: error.stack?.slice(0, 500),
    };
  }

  return { message: String(error) };
}

export interface AgentResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  messages?: unknown[];
}

/**
 * Load command content from .claude/commands directory
 */
function loadCommandFile(commandName: string, repoPath: string): string | null {
  // Try repo-local commands first
  const localPath = join(repoPath, '.claude', 'commands', `${commandName}.md`);
  if (existsSync(localPath)) {
    return readFileSync(localPath, 'utf-8');
  }

  // Fallback to user-global commands
  const userPath = join(homedir(), '.claude', 'commands', `${commandName}.md`);
  if (existsSync(userPath)) {
    return readFileSync(userPath, 'utf-8');
  }

  return null;
}

/**
 * Check if Claude credentials exist
 * Supports both:
 * - Credentials file (~/.claude/.credentials.json)
 * - Environment variable (CLAUDE_CODE_OAUTH_TOKEN)
 */
export function hasClaudeCredentials(): boolean {
  // Check for OAuth token in environment
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return true;
  }

  // Check for credentials file
  const credentialsPath = join(homedir(), '.claude', '.credentials.json');
  return existsSync(credentialsPath);
}

/**
 * Find the Claude Code executable path
 */
function findClaudeExecutable(): string | undefined {
  // Try common locations
  const commonPaths = [
    join(homedir(), '.local', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/usr/bin/claude',
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fall back to which command
  try {
    const result = execSync('which claude', { encoding: 'utf-8' }).trim();
    if (result && existsSync(result)) {
      return result;
    }
  } catch {
    // which command failed
  }

  return undefined;
}

/**
 * Run a Mason command using the Claude Agent SDK
 */
export async function runCommand(
  commandName: string,
  config: AgentConfig,
): Promise<AgentResult> {
  // Load the command file
  const commandContent = loadCommandFile(commandName, config.repositoryPath);

  if (!commandContent) {
    return {
      success: false,
      error: `Command file not found: ${commandName}.md`,
    };
  }

  // Check for credentials
  if (!hasClaudeCredentials()) {
    return {
      success: false,
      error:
        'Claude credentials not found. Run "claude setup-token" to authenticate.',
    };
  }

  if (config.verbose) {
    console.log(`  Running command: /${commandName}`);
    console.log(`  Repository: ${config.repositoryPath}`);
  }

  try {
    const messages: unknown[] = [];

    // Find Claude executable
    const claudePath = findClaudeExecutable();
    if (!claudePath) {
      return {
        success: false,
        error:
          'Claude Code executable not found. Ensure claude is installed and in PATH.',
      };
    }

    if (config.verbose) {
      console.log(`  Claude executable: ${claudePath}`);
    }

    // Build prompt with command content
    const prompt = `You are executing the /${commandName} command.

Follow these instructions exactly:

${commandContent}`;

    // Execute via SDK with bypassPermissions for automation
    const result = query({
      prompt,
      options: {
        cwd: config.repositoryPath,
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: claudePath,
        allowedTools: [
          'Bash',
          'Read',
          'Write',
          'Edit',
          'Grep',
          'Glob',
          'Task',
          'WebFetch',
          'WebSearch',
        ],
        maxTurns: commandName === 'execute-approved' ? 500 : 200,
      },
    });

    // Stream messages
    for await (const message of result) {
      messages.push(message);

      // Log progress in verbose mode
      if (config.verbose) {
        const msg = message as {
          type: string;
          message?: { content?: unknown[] };
          subtype?: string;
        };

        if (msg.type === 'assistant' && msg.message?.content) {
          for (const block of msg.message.content) {
            if (
              typeof block === 'object' &&
              block !== null &&
              'text' in block
            ) {
              const text = String((block as { text: string }).text);
              if (text.length > 0) {
                console.log(`  Claude: ${text.slice(0, 200)}...`);
              }
            } else if (
              typeof block === 'object' &&
              block !== null &&
              'name' in block
            ) {
              console.log(`  [Tool] ${(block as { name: string }).name}`);
            }
          }
        } else if (msg.type === 'result') {
          console.log(`  [Complete] ${msg.subtype || 'Done'}`);
        }
      }

      // Update Supabase with progress
      if (config.runId) {
        await config.supabase
          .from('mason_autopilot_runs')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', config.runId);
      }
    }

    // Success - reset failure counter
    resetFailureCounter();
    return { success: true, messages };
  } catch (error) {
    // Track failure for backoff
    consecutiveFailures++;
    console.error(
      `  SDK execution failed (failure #${consecutiveFailures}):`,
      error,
    );

    const errorInfo = extractErrorDetails(error);
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorDetails: errorInfo.details,
    };
  }
}

/**
 * Run a command with arguments (for execute-approved with --limit flag)
 */
export async function runCommandWithArgs(
  commandName: string,
  args: string,
  config: AgentConfig,
): Promise<AgentResult> {
  // Load the command file
  const commandContent = loadCommandFile(commandName, config.repositoryPath);

  if (!commandContent) {
    return {
      success: false,
      error: `Command file not found: ${commandName}.md`,
    };
  }

  if (!hasClaudeCredentials()) {
    return {
      success: false,
      error:
        'Claude credentials not found. Run "claude setup-token" to authenticate.',
    };
  }

  if (config.verbose) {
    console.log(`  Running command: /${commandName} ${args}`);
    console.log(`  Repository: ${config.repositoryPath}`);
  }

  try {
    const messages: unknown[] = [];

    // Find Claude executable
    const claudePath = findClaudeExecutable();
    if (!claudePath) {
      return {
        success: false,
        error:
          'Claude Code executable not found. Ensure claude is installed and in PATH.',
      };
    }

    if (config.verbose) {
      console.log(`  Claude executable: ${claudePath}`);
    }

    // Build prompt with args
    const prompt = `You are executing the /${commandName} command with these arguments: ${args}

Follow these instructions exactly:

${commandContent}

Apply the arguments (${args}) as specified in the command.`;

    const result = query({
      prompt,
      options: {
        cwd: config.repositoryPath,
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: claudePath,
        allowedTools: [
          'Bash',
          'Read',
          'Write',
          'Edit',
          'Grep',
          'Glob',
          'Task',
          'WebFetch',
          'WebSearch',
        ],
        maxTurns: 500, // Higher for execution
      },
    });

    for await (const message of result) {
      messages.push(message);

      if (config.verbose) {
        const msg = message as {
          type: string;
          message?: { content?: unknown[] };
          subtype?: string;
        };

        if (msg.type === 'assistant' && msg.message?.content) {
          for (const block of msg.message.content) {
            if (
              typeof block === 'object' &&
              block !== null &&
              'text' in block
            ) {
              const text = String((block as { text: string }).text);
              if (text.length > 0) {
                console.log(`  Claude: ${text.slice(0, 200)}...`);
              }
            } else if (
              typeof block === 'object' &&
              block !== null &&
              'name' in block
            ) {
              console.log(`  [Tool] ${(block as { name: string }).name}`);
            }
          }
        } else if (msg.type === 'result') {
          console.log(`  [Complete] ${msg.subtype || 'Done'}`);
        }
      }

      if (config.runId) {
        await config.supabase
          .from('mason_autopilot_runs')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', config.runId);
      }
    }

    // Success - reset failure counter
    resetFailureCounter();
    return { success: true, messages };
  } catch (error) {
    // Track failure for backoff
    consecutiveFailures++;
    console.error(
      `  SDK execution failed (failure #${consecutiveFailures}):`,
      error,
    );

    const errorInfo = extractErrorDetails(error);
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      errorDetails: errorInfo.details,
    };
  }
}
