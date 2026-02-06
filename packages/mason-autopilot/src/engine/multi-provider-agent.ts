/**
 * Multi-Provider Agent Runtime
 *
 * Uses Vercel AI SDK generateText() to run Mason commands with any
 * supported provider (Anthropic, OpenAI, Google). This is Path B
 * in the dual runtime architecture - used when Claude Code OAuth
 * is not available.
 *
 * Tool names match Claude Code's tool names so command markdown files
 * work identically regardless of provider.
 */

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';

import type { ProviderConfig } from './providers.js';
import type { AgentResult } from './agent-runner.js';
import { createAllTools } from './tools/index.js';

/**
 * Get a Vercel AI SDK language model instance from a ProviderConfig.
 */
function getLanguageModel(config: ProviderConfig): LanguageModelV1 {
  switch (config.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
      return google(config.model);
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

interface MultiProviderOptions {
  cwd: string;
  verbose: boolean;
  maxSteps?: number;
  onHeartbeat?: () => Promise<void>;
}

/**
 * Run a prompt using the multi-provider runtime.
 *
 * Uses generateText with maxSteps for agentic looping -
 * the model can call tools repeatedly until done.
 */
export async function runWithMultiProvider(
  prompt: string,
  providerConfig: ProviderConfig,
  options: MultiProviderOptions,
): Promise<AgentResult> {
  const model = getLanguageModel(providerConfig);
  const tools = createAllTools(options.cwd, providerConfig);
  const maxSteps = options.maxSteps ?? 200;

  let stepCount = 0;

  try {
    const result = await generateText({
      model,
      tools,
      maxSteps,
      system: `You are Mason, an AI-powered codebase improvement agent. You have access to tools for reading, writing, editing files, running bash commands, searching code, and launching subtasks. Follow the instructions in the prompt exactly. Work autonomously and complete the full task.

Working directory: ${options.cwd}

Important:
- Use Bash for git commands and running tests/builds
- Use Read/Write/Edit for file operations
- Use Grep/Glob for searching code
- Always complete the full task before stopping`,
      prompt,
      onStepFinish: async ({ toolResults }) => {
        stepCount++;

        if (options.verbose && toolResults) {
          for (const result of toolResults) {
            const toolResult = result as { toolName?: string; result?: string };
            if (toolResult.toolName) {
              console.log(`  [Step ${stepCount}] Tool: ${toolResult.toolName}`);
            }
          }
        }

        // Heartbeat callback for Supabase updates
        if (options.onHeartbeat && stepCount % 5 === 0) {
          await options.onHeartbeat();
        }
      },
    });

    if (options.verbose) {
      console.log(`  Multi-provider execution completed in ${stepCount} steps.`);
      if (result.text) {
        console.log(
          `  Final response: ${result.text.slice(0, 200)}${result.text.length > 200 ? '...' : ''}`,
        );
      }
    }

    return {
      success: true,
      messages: [{ type: 'result', text: result.text }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.verbose) {
      console.error(`  Multi-provider execution failed at step ${stepCount}:`, errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: categorizeError(errorMessage),
      errorDetails: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    };
  }
}

/**
 * Categorize error messages into error codes.
 */
function categorizeError(message: string): string | undefined {
  if (message.includes('rate limit') || message.includes('429')) {
    return 'RATE_LIMIT';
  }
  if (
    message.includes('authentication') ||
    message.includes('401') ||
    message.includes('Invalid API Key') ||
    message.includes('Incorrect API key')
  ) {
    return 'AUTH_FAILED';
  }
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'TIMEOUT';
  }
  if (message.includes('insufficient_quota') || message.includes('billing')) {
    return 'QUOTA_EXCEEDED';
  }
  return undefined;
}
