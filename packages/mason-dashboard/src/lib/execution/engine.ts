import AnthropicClient from '@anthropic-ai/sdk';

import { TABLES } from '@/lib/constants';
import {
  ensureExecutionProgress,
  updateExecutionProgress,
  completeExecutionProgress,
  failExecutionProgress,
  ExecutionProgressError,
} from '@/lib/execution/progress';
import {
  createGitHubClient,
  createBranch,
  getRepositoryTree,
  commitMultipleFiles,
  createPullRequest,
  type FileChange,
} from '@/lib/github/client';
import { createServiceClient } from '@/lib/supabase/client';
import type {
  GitHubRepository,
  RemoteExecutionRun,
  LogLevel,
} from '@/types/auth';
import type { BacklogItem } from '@/types/backlog';

const CODE_GENERATION_SYSTEM_PROMPT = `You are an expert software engineer implementing code changes based on a PRD (Product Requirements Document).

Your task is to generate the necessary code changes to implement the improvement described in the PRD.

Guidelines:
1. Follow existing code patterns and conventions in the repository
2. Write clean, maintainable code
3. Include proper error handling
4. Do not break existing functionality
5. Keep changes minimal and focused

Output format:
Return a JSON object with the following structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "full file content here",
      "action": "create" | "update"
    }
  ],
  "summary": "Brief description of changes made",
  "commit_message": "Conventional commit message for these changes"
}

Important: Return ONLY the JSON object, no markdown code blocks or additional text.`;

export interface ExecutionOptions {
  userId: string;
  repositoryId: string;
  itemIds: string[];
  accessToken: string;
  idempotencyKey?: string;
}

export interface ItemResult {
  itemId: string;
  title: string;
  success: boolean;
  error?: string;
  filesChanged?: number;
}

export interface ExecutionResult {
  runId: string;
  success: boolean;
  partialSuccess?: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  itemResults?: ItemResult[];
  successCount?: number;
  failureCount?: number;
}

// Log to database for real-time streaming
// Includes retry logic and proper error handling
async function log(
  runId: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.from(TABLES.EXECUTION_LOGS).insert({
      execution_run_id: runId,
      log_level: level,
      message,
      metadata: metadata ?? {},
    });

    if (!error) {
      return; // Success
    }

    console.error(
      `[ExecutionLog] Failed to write log (attempt ${attempt}/${maxRetries}):`,
      error,
    );

    if (attempt < maxRetries) {
      // Wait before retry with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, attempt - 1)),
      );
    }
  }

  // Log failure but don't throw - logging shouldn't block execution
  console.error(`[ExecutionLog] All ${maxRetries} attempts failed for log:`, {
    runId,
    level,
    message,
  });
}

// Fetch repository context for Claude
async function getRepositoryContext(
  accessToken: string,
  repo: GitHubRepository,
): Promise<string> {
  const octokit = createGitHubClient(accessToken);

  const tree = await getRepositoryTree(
    octokit,
    repo.github_owner,
    repo.github_name,
    repo.github_default_branch,
  );

  // Filter to relevant files
  const relevantExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.md',
    '.css',
  ];
  const relevantFiles = tree
    .filter((item) => {
      const _ext = item.path.split('.').pop();
      return (
        item.type === 'blob' &&
        relevantExtensions.some((e) => item.path.endsWith(e)) &&
        !item.path.includes('node_modules') &&
        !item.path.includes('.next') &&
        !item.path.includes('dist')
      );
    })
    .slice(0, 200); // Limit for context window

  return `Repository structure:\n${relevantFiles.map((f) => `- ${f.path}`).join('\n')}`;
}

// Retry configuration for API calls
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

// Timeout configuration for Claude API calls
const TIMEOUT_CONFIG = {
  codeGenerationMs: 5 * 60 * 1000, // 5 minutes for code generation
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3, // Open circuit after 3 consecutive failures
  resetTimeoutMs: 30000, // 30 seconds before testing recovery
};

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation - requests pass through
  OPEN = 'OPEN', // Failing fast - reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing recovery - one request allowed
}

// Error types that should NOT trip the circuit breaker (client errors)
const NON_TRIPPING_STATUS_CODES = [400, 401, 403, 404, 422];

// Circuit breaker for Claude API calls
class ClaudeCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    failureThreshold: number = CIRCUIT_BREAKER_CONFIG.failureThreshold,
    resetTimeoutMs: number = CIRCUIT_BREAKER_CONFIG.resetTimeoutMs,
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  // Check if an error should trip the circuit breaker
  private shouldTrip(error: unknown): boolean {
    // Extract status code if available
    const statusCode = (error as { status?: number }).status;

    // Client errors (4xx except rate limits) should not trip the breaker
    if (statusCode && NON_TRIPPING_STATUS_CODES.includes(statusCode)) {
      return false;
    }

    // Network errors, server errors (5xx), and rate limits (429) should trip
    return true;
  }

  // Check if reset timeout has expired
  private isResetTimeoutExpired(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  // Execute operation with circuit breaker protection
  async execute<T>(operation: () => Promise<T>, context: string): Promise<T> {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.isResetTimeoutExpired()) {
      console.log(
        `[CircuitBreaker] ${context}: Transitioning to HALF_OPEN for recovery test`,
      );
      this.state = CircuitState.HALF_OPEN;
    }

    // If circuit is OPEN, fail fast without calling the API
    if (this.state === CircuitState.OPEN) {
      const timeUntilRetry = Math.ceil(
        (this.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000,
      );
      throw new CircuitBreakerOpenError(
        `Claude API circuit breaker is OPEN. Too many consecutive failures. ` +
          `Will retry in ${timeUntilRetry} seconds.`,
      );
    }

    try {
      const result = await operation();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(error, context);
      throw error;
    }
  }

  // Handle successful operation
  private onSuccess(context: string): void {
    if (this.state === CircuitState.HALF_OPEN) {
      console.log(
        `[CircuitBreaker] ${context}: Recovery successful, closing circuit`,
      );
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  // Handle failed operation
  private onFailure(error: unknown, context: string): void {
    if (!this.shouldTrip(error)) {
      // Client error - don't count as circuit breaker failure
      console.log(
        `[CircuitBreaker] ${context}: Non-tripping error (client error), not counting`,
      );
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.warn(
      `[CircuitBreaker] ${context}: Failure ${this.failureCount}/${this.failureThreshold}`,
    );

    // If in HALF_OPEN and test failed, return to OPEN
    if (this.state === CircuitState.HALF_OPEN) {
      console.warn(
        `[CircuitBreaker] ${context}: Recovery test failed, reopening circuit`,
      );
      this.state = CircuitState.OPEN;
      return;
    }

    // Check if we should open the circuit
    if (this.failureCount >= this.failureThreshold) {
      console.error(
        `[CircuitBreaker] ${context}: Threshold reached, opening circuit for ${this.resetTimeoutMs / 1000}s`,
      );
      this.state = CircuitState.OPEN;
    }
  }

  // Get current circuit state (for monitoring/logging)
  getState(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Custom error for when circuit breaker is open
class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Singleton circuit breaker instance for Claude API calls
const claudeCircuitBreaker = new ClaudeCircuitBreaker();

// Custom error class for timeouts
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Helper: Wrap operation with timeout
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new TimeoutError(
          `${context} timed out after ${timeoutMs / 1000} seconds`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

// Helper: Retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const statusCode = (error as { status?: number }).status;
      const isRetryable =
        statusCode && RETRY_CONFIG.retryableStatusCodes.includes(statusCode);

      if (!isRetryable || attempt === RETRY_CONFIG.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1) +
          Math.random() * 500,
        RETRY_CONFIG.maxDelayMs,
      );

      console.warn(
        `${context}: Attempt ${attempt} failed with status ${statusCode}, retrying in ${Math.round(delay)}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error(`${context}: All retry attempts failed`);
}

// Generate code changes using Claude
async function generateCodeChanges(
  item: BacklogItem,
  repoContext: string,
): Promise<{
  files: Array<{ path: string; content: string; action: string }>;
  summary: string;
  commitMessage: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const client = new AnthropicClient({ apiKey });

  const userPrompt = `Implement the following improvement:

## Title
${item.title}

## Problem
${item.problem}

## Solution
${item.solution}

## PRD Content
${item.prd_content ?? 'No detailed PRD available'}

## Repository Context
${repoContext}

Generate the code changes needed to implement this improvement. Follow existing patterns in the repository.`;

  // Wrap Claude API call with circuit breaker, timeout, and retry
  // Circuit breaker: Fail fast after 3 consecutive failures (prevents wasted time)
  // Timeout: 5 minutes to prevent indefinite hangs
  // Retry: 3 attempts with exponential backoff for transient errors
  const context = `Claude API call for "${item.title}"`;
  const message = await claudeCircuitBreaker.execute(
    () =>
      withTimeout(
        () =>
          withRetry(
            () =>
              client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 8192,
                system: CODE_GENERATION_SYSTEM_PROMPT,
                messages: [
                  {
                    role: 'user',
                    content: userPrompt,
                  },
                ],
              }),
            context,
          ),
        TIMEOUT_CONFIG.codeGenerationMs,
        `Code generation for "${item.title}"`,
      ),
    context,
  );

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in code generation response');
  }

  const responseText = textContent.text.trim();

  try {
    const parsed = JSON.parse(responseText);
    return {
      files: parsed.files ?? [],
      summary: parsed.summary ?? 'Code changes generated',
      commitMessage: parsed.commit_message ?? 'feat: implement improvement',
    };
  } catch {
    throw new Error(
      `Failed to parse code generation response: ${responseText.substring(0, 200)}`,
    );
  }
}

// Main execution function
export async function executeRemotely(
  options: ExecutionOptions,
): Promise<ExecutionResult> {
  const supabase = createServiceClient();
  const { userId, repositoryId, itemIds, accessToken, idempotencyKey } =
    options;

  // Check for existing run with the same idempotency key (request deduplication)
  // This prevents duplicate execution on rapid clicks or network retries
  if (idempotencyKey) {
    const { data: existingRun } = await supabase
      .from(TABLES.REMOTE_EXECUTION_RUNS)
      .select('id, status, pr_url, pr_number, error_message')
      .eq('idempotency_key', idempotencyKey)
      .gt('idempotency_expires_at', new Date().toISOString())
      .single();

    if (existingRun) {
      // Return the existing run instead of creating a duplicate
      return {
        runId: existingRun.id,
        success: existingRun.status === 'success',
        prUrl: existingRun.pr_url || undefined,
        prNumber: existingRun.pr_number || undefined,
        error: existingRun.error_message || undefined,
      };
    }
  }

  // Fetch repository details
  const { data: repo, error: repoError } = await supabase
    .from(TABLES.GITHUB_REPOSITORIES)
    .select('*')
    .eq('id', repositoryId)
    .single();

  if (repoError || !repo) {
    throw new Error(`Repository not found: ${repoError?.message}`);
  }

  const repository = repo as GitHubRepository;

  // Fetch backlog items
  const { data: items, error: itemsError } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('*')
    .in('id', itemIds);

  if (itemsError || !items || items.length === 0) {
    throw new Error(`Items not found: ${itemsError?.message}`);
  }

  const backlogItems = items as BacklogItem[];

  // Generate unique branch name
  const timestamp = Date.now();
  const branchName = `mason/execution-${timestamp}`;

  // Create execution run record
  // Include idempotency key for request deduplication (expires after 24 hours)
  const idempotencyExpiresAt = idempotencyKey
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: run, error: runError } = await supabase
    .from(TABLES.REMOTE_EXECUTION_RUNS)
    .insert({
      user_id: userId,
      repository_id: repositoryId,
      item_ids: itemIds,
      item_count: itemIds.length,
      branch_name: branchName,
      base_branch: repository.github_default_branch,
      status: 'in_progress',
      idempotency_key: idempotencyKey || null,
      idempotency_expires_at: idempotencyExpiresAt,
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create execution run: ${runError?.message}`);
  }

  const runId = run.id;

  try {
    await log(runId, 'info', 'Starting remote execution', {
      itemCount: itemIds.length,
      repository: repository.github_full_name,
    });

    const octokit = createGitHubClient(accessToken);

    // Create branch
    await log(runId, 'info', `Creating branch: ${branchName}`);
    await createBranch(
      octokit,
      repository.github_owner,
      repository.github_name,
      branchName,
      repository.github_default_branch,
    );

    // Get repository context
    await log(runId, 'info', 'Analyzing repository structure');
    const repoContext = await getRepositoryContext(accessToken, repository);

    // Generate code changes for each item with partial success support
    const allFileChanges: FileChange[] = [];
    const summaries: string[] = [];
    const commitMessages: string[] = [];
    const itemResults: ItemResult[] = [];
    const successfulItems: BacklogItem[] = [];
    const failedItems: Array<{ item: BacklogItem; error: string }> = [];

    for (const item of backlogItems) {
      await log(runId, 'info', `Generating code for: ${item.title}`);

      try {
        const changes = await generateCodeChanges(item, repoContext);

        for (const file of changes.files) {
          allFileChanges.push({
            path: file.path,
            content: file.content,
          });
        }

        summaries.push(`- ✅ ${item.title}: ${changes.summary}`);
        commitMessages.push(changes.commitMessage);
        successfulItems.push(item);

        itemResults.push({
          itemId: item.id,
          title: item.title,
          success: true,
          filesChanged: changes.files.length,
        });

        await log(
          runId,
          'info',
          `Generated ${changes.files.length} file changes for: ${item.title}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await log(
          runId,
          'error',
          `Failed to generate code for: ${item.title}`,
          {
            error: errorMessage,
          },
        );

        failedItems.push({ item, error: errorMessage });
        summaries.push(`- ❌ ${item.title}: Failed - ${errorMessage}`);

        itemResults.push({
          itemId: item.id,
          title: item.title,
          success: false,
          error: errorMessage,
        });

        // Continue processing remaining items instead of throwing
        await log(
          runId,
          'warn',
          `Continuing with remaining items after failure on: ${item.title}`,
        );
      }
    }

    // Check if we have any successful items to commit
    if (successfulItems.length === 0) {
      const errorMessage = `All ${failedItems.length} items failed code generation`;
      await log(runId, 'error', errorMessage);

      // Mark all items as rejected (failed)
      await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({ status: 'rejected' })
        .in(
          'id',
          failedItems.map((f) => f.item.id),
        );

      // Update run status to failed
      await supabase
        .from(TABLES.REMOTE_EXECUTION_RUNS)
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return {
        runId,
        success: false,
        error: errorMessage,
        itemResults,
        successCount: 0,
        failureCount: failedItems.length,
      };
    }

    // Update successful items to in_progress
    await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({ status: 'in_progress', branch_name: branchName })
      .in(
        'id',
        successfulItems.map((item) => item.id),
      );

    // Create execution_progress records for BuildingTheater visualization
    // Phase 1: Site Review (analyzing PRD)
    // Use allSettled to ensure all items get progress records even if some fail
    const progressResults = await Promise.allSettled(
      successfulItems.map((item) =>
        ensureExecutionProgress(supabase, item.id, {
          runId,
          totalWaves: 4,
          initialTask: `Analyzing PRD for: ${item.title}`,
        }),
      ),
    );

    // Log any failures but continue - progress is important but not blocking
    const progressFailures = progressResults.filter(
      (r) => r.status === 'rejected',
    );
    if (progressFailures.length > 0) {
      await log(
        runId,
        'warn',
        `${progressFailures.length} items failed to create progress records`,
        {
          failures: progressFailures.map((r) =>
            r.status === 'rejected' ? r.reason?.message : 'unknown',
          ),
        },
      );
    }

    // Phase 2: Foundation (planning complete, code generated)
    await Promise.allSettled(
      successfulItems.map((item) =>
        updateExecutionProgress(supabase, item.id, {
          current_phase: 'foundation',
          current_wave: 1,
          current_task: `Code generated, preparing to commit: ${item.title}`,
        }),
      ),
    );

    // Mark failed items as rejected
    if (failedItems.length > 0) {
      await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({ status: 'rejected' })
        .in(
          'id',
          failedItems.map((f) => f.item.id),
        );
    }

    if (allFileChanges.length === 0) {
      throw new Error('No file changes generated');
    }

    // Commit all changes
    await log(
      runId,
      'info',
      `Committing ${allFileChanges.length} file changes`,
    );

    // Phase 3: Building (committing changes)
    await Promise.allSettled(
      successfulItems.map((item, index) =>
        updateExecutionProgress(supabase, item.id, {
          current_phase: 'building',
          current_wave: index + 2,
          wave_status: 'in_progress',
          current_task: `Committing changes to branch: ${branchName}`,
          current_file: allFileChanges[0]?.path || null,
          lines_changed: allFileChanges.reduce(
            (acc, f) => acc + (f.content?.split('\n').length || 0),
            0,
          ),
        }),
      ),
    );

    const commitMessage = commitMessages[0] ?? 'feat: implement improvements';

    await commitMultipleFiles(
      octokit,
      repository.github_owner,
      repository.github_name,
      branchName,
      `${commitMessage}\n\nImplemented by Mason`,
      allFileChanges,
    );

    // Create pull request
    await log(runId, 'info', 'Creating pull request');

    // Phase 4: Inspection (creating PR, running checks)
    await Promise.allSettled(
      successfulItems.map((item) =>
        updateExecutionProgress(supabase, item.id, {
          current_phase: 'inspection',
          current_wave: 4,
          wave_status: 'completed',
          current_task: 'Creating pull request...',
          validation_typescript: 'running',
          validation_eslint: 'running',
          validation_build: 'running',
          validation_tests: 'pending',
        }),
      ),
    );

    const isPartialSuccess = failedItems.length > 0;
    const statusLine = isPartialSuccess
      ? `⚠️ **Partial Success**: ${successfulItems.length} succeeded, ${failedItems.length} failed`
      : `✅ **All ${successfulItems.length} items implemented successfully**`;

    const failedSection =
      failedItems.length > 0
        ? `\n## ❌ Failed Items\nThe following items could not be implemented:\n${failedItems.map((f) => `- **${f.item.title}**: ${f.error}`).join('\n')}\n`
        : '';

    const prBody = `## Summary
${statusLine}

### Implemented Changes
${summaries.join('\n')}
${failedSection}
## Changes
- ${allFileChanges.length} files modified/created
- ${successfulItems.length} backlog items implemented

## Generated by Mason
This pull request was automatically generated by Mason based on approved backlog items.

---
*Please review the changes carefully before merging.*`;

    // PR title reflects partial success if applicable
    const prTitle = isPartialSuccess
      ? `[Mason] ${successfulItems.map((i) => i.title).join(', ')} (${failedItems.length} failed)`
      : `[Mason] ${successfulItems.map((i) => i.title).join(', ')}`;

    const pr = await createPullRequest(octokit, {
      owner: repository.github_owner,
      repo: repository.github_name,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: repository.github_default_branch,
    });

    // Determine final status
    const finalStatus = isPartialSuccess ? 'success' : 'success'; // Both are success since PR was created

    // Update execution run with PR info and item results
    await supabase
      .from(TABLES.REMOTE_EXECUTION_RUNS)
      .update({
        status: finalStatus,
        pr_url: pr.html_url,
        pr_number: pr.number,
        files_changed: allFileChanges.length,
        completed_at: new Date().toISOString(),
        error_message: isPartialSuccess
          ? `Partial success: ${failedItems.length} of ${backlogItems.length} items failed`
          : null,
        // Store per-item results for partial success tracking
        item_results: itemResults,
        success_count: successfulItems.length,
        failure_count: failedItems.length,
      })
      .eq('id', runId);

    // Update only successful items with PR URL
    await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({ pr_url: pr.html_url })
      .in(
        'id',
        successfulItems.map((item) => item.id),
      );

    const logMessage = isPartialSuccess
      ? `Pull request created with partial success: ${pr.html_url}`
      : `Pull request created: ${pr.html_url}`;
    await log(runId, 'info', logMessage);

    // Phase 5: Complete - mark all successful items as complete
    const completionResults = await Promise.allSettled(
      successfulItems.map((item) =>
        completeExecutionProgress(
          supabase,
          item.id,
          `Pull request created: ${pr.html_url}`,
        ),
      ),
    );

    // Log completion status
    const completionFailures = completionResults.filter(
      (r) => r.status === 'rejected',
    );
    if (completionFailures.length > 0) {
      await log(
        runId,
        'warn',
        `${completionFailures.length} items failed to mark progress complete`,
        {
          failures: completionFailures.map((r) =>
            r.status === 'rejected' ? r.reason?.message : 'unknown',
          ),
        },
      );
    } else {
      await log(
        runId,
        'info',
        `All ${successfulItems.length} items marked complete in BuildingTheater`,
      );
    }

    return {
      runId,
      success: true,
      partialSuccess: isPartialSuccess,
      prUrl: pr.html_url,
      prNumber: pr.number,
      itemResults,
      successCount: successfulItems.length,
      failureCount: failedItems.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isProgressError = error instanceof ExecutionProgressError;

    await log(runId, 'error', `Execution failed: ${errorMessage}`, {
      errorType: error instanceof Error ? error.name : 'Unknown',
      isProgressError,
    });

    // CRITICAL: Clean up items that were marked 'in_progress' but never completed
    // This prevents items from being permanently stuck in 'in_progress' status
    try {
      // Reset any items that were set to in_progress during this run
      const { error: resetError } = await supabase
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({
          status: 'approved', // Reset to approved so they can be re-executed
          branch_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'in_progress')
        .in('id', itemIds);

      if (resetError) {
        console.error(
          '[ExecutionEngine] Failed to reset in_progress items:',
          resetError,
        );
      } else {
        await log(
          runId,
          'info',
          `Reset ${itemIds.length} items from in_progress back to approved`,
        );
      }

      // Mark progress records as failed for visibility in BuildingTheater
      await Promise.allSettled(
        itemIds.map((id) => failExecutionProgress(supabase, id, errorMessage)),
      );
    } catch (cleanupError) {
      console.error(
        '[ExecutionEngine] Failed to cleanup after error:',
        cleanupError,
      );
    }

    // Update run status to failed
    await supabase
      .from(TABLES.REMOTE_EXECUTION_RUNS)
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return {
      runId,
      success: false,
      error: errorMessage,
    };
  }
}

// Get execution run status
export async function getExecutionRun(
  runId: string,
): Promise<RemoteExecutionRun | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from(TABLES.REMOTE_EXECUTION_RUNS)
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as RemoteExecutionRun;
}

// Get execution logs
export async function getExecutionLogs(
  runId: string,
  afterTimestamp?: string,
): Promise<
  Array<{
    id: string;
    created_at: string;
    log_level: LogLevel;
    message: string;
    metadata: Record<string, unknown>;
  }>
> {
  const supabase = createServiceClient();

  let query = supabase
    .from(TABLES.EXECUTION_LOGS)
    .select('*')
    .eq('execution_run_id', runId)
    .order('created_at', { ascending: true });

  if (afterTimestamp) {
    query = query.gt('created_at', afterTimestamp);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

// Get circuit breaker state for monitoring
export function getClaudeCircuitBreakerState(): {
  state: string;
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
} {
  const cbState = claudeCircuitBreaker.getState();
  return {
    state: cbState.state,
    failureCount: cbState.failureCount,
    lastFailureTime: cbState.lastFailureTime,
    isOpen: cbState.state === CircuitState.OPEN,
  };
}
