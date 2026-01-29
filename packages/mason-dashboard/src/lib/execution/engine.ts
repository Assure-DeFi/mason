import AnthropicClient from '@anthropic-ai/sdk';

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
async function log(
  runId: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.from('mason_execution_logs').insert({
    execution_run_id: runId,
    log_level: level,
    message,
    metadata: metadata ?? {},
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

  const message = await withRetry(
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
    `Claude API call for "${item.title}"`,
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
  const { userId, repositoryId, itemIds, accessToken } = options;

  // Fetch repository details
  const { data: repo, error: repoError } = await supabase
    .from('mason_github_repositories')
    .select('*')
    .eq('id', repositoryId)
    .single();

  if (repoError || !repo) {
    throw new Error(`Repository not found: ${repoError?.message}`);
  }

  const repository = repo as GitHubRepository;

  // Fetch backlog items
  const { data: items, error: itemsError } = await supabase
    .from('mason_pm_backlog_items')
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
  const { data: run, error: runError } = await supabase
    .from('mason_remote_execution_runs')
    .insert({
      user_id: userId,
      repository_id: repositoryId,
      item_ids: itemIds,
      item_count: itemIds.length,
      branch_name: branchName,
      base_branch: repository.github_default_branch,
      status: 'in_progress',
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
        .from('mason_pm_backlog_items')
        .update({ status: 'rejected' })
        .in(
          'id',
          failedItems.map((f) => f.item.id),
        );

      // Update run status to failed
      await supabase
        .from('mason_remote_execution_runs')
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
      .from('mason_pm_backlog_items')
      .update({ status: 'in_progress', branch_name: branchName })
      .in(
        'id',
        successfulItems.map((item) => item.id),
      );

    // Mark failed items as rejected
    if (failedItems.length > 0) {
      await supabase
        .from('mason_pm_backlog_items')
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

    // Update execution run with PR info
    await supabase
      .from('mason_remote_execution_runs')
      .update({
        status: finalStatus,
        pr_url: pr.html_url,
        pr_number: pr.number,
        files_changed: allFileChanges.length,
        completed_at: new Date().toISOString(),
        error_message: isPartialSuccess
          ? `Partial success: ${failedItems.length} of ${backlogItems.length} items failed`
          : null,
      })
      .eq('id', runId);

    // Update only successful items with PR URL
    await supabase
      .from('mason_pm_backlog_items')
      .update({ pr_url: pr.html_url })
      .in(
        'id',
        successfulItems.map((item) => item.id),
      );

    const logMessage = isPartialSuccess
      ? `Pull request created with partial success: ${pr.html_url}`
      : `Pull request created: ${pr.html_url}`;
    await log(runId, 'info', logMessage);

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

    await log(runId, 'error', `Execution failed: ${errorMessage}`);

    // Update run status to failed
    await supabase
      .from('mason_remote_execution_runs')
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
    .from('mason_remote_execution_runs')
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
    .from('mason_execution_logs')
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
