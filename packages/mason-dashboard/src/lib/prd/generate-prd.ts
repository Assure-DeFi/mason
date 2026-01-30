import AnthropicClient from '@anthropic-ai/sdk';
import OpenAIClient from 'openai';

import type { BacklogItem } from '@/types/backlog';

export type AIProvider = 'anthropic' | 'openai';

// Timeout configuration for PRD generation
const PRD_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

// Custom error class for timeouts
class PrdTimeoutError extends Error {
  constructor(provider: string) {
    super(`PRD generation timed out after ${PRD_TIMEOUT_MS / 1000} seconds using ${provider}`);
    this.name = 'PrdTimeoutError';
  }
}

// Helper: Wrap operation with timeout
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorFactory: () => Error,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(errorFactory()), timeoutMs);
  });
  return Promise.race([operation(), timeoutPromise]);
}

const PRD_SYSTEM_PROMPT = `You are a senior product manager creating a detailed PRD (Product Requirements Document) for a development team.

Your PRD must be:
1. Clear and actionable
2. Include wave-based task breakdown for parallel execution
3. Specify which type of agent should handle each task

Wave structure guidelines:
- Wave 1: Foundation tasks (research, understanding patterns) - use Explore subagent
- Wave 2: Implementation tasks (actual coding) - use general-purpose subagent
- Wave 3: Validation tasks (testing, review) - use code-reviewer subagent

Subagent types:
- Explore: Finding patterns, understanding architecture, researching
- general-purpose: Implementation, complex multi-step work
- Bash: Running commands, tests, builds
- code-reviewer: Reviewing changes, checking standards
- frontend-design: UI/UX work, component styling`;

export interface GeneratePrdOptions {
  item: BacklogItem;
  additionalContext?: string;
  provider?: AIProvider;
  apiKey?: string;
}

async function generateWithAnthropic(
  apiKey: string,
  userPrompt: string,
): Promise<string> {
  const client = new AnthropicClient({ apiKey });

  // Wrap API call with timeout to prevent indefinite hangs
  const message = await withTimeout(
    () =>
      client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: PRD_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    PRD_TIMEOUT_MS,
    () => new PrdTimeoutError('Anthropic'),
  );

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in PRD generation response');
  }

  return textContent.text;
}

async function generateWithOpenAI(
  apiKey: string,
  userPrompt: string,
): Promise<string> {
  const client = new OpenAIClient({ apiKey });

  // Wrap API call with timeout to prevent indefinite hangs
  const completion = await withTimeout(
    () =>
      client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: PRD_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    PRD_TIMEOUT_MS,
    () => new PrdTimeoutError('OpenAI'),
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in PRD generation response');
  }

  return content;
}

export async function generatePrd(
  options: GeneratePrdOptions,
): Promise<string> {
  const { provider = 'anthropic', apiKey } = options;

  // Check for provided API key first, then fall back to environment variable
  let resolvedApiKey = apiKey;

  if (!resolvedApiKey) {
    if (provider === 'anthropic') {
      resolvedApiKey = process.env.ANTHROPIC_API_KEY;
    } else if (provider === 'openai') {
      resolvedApiKey = process.env.OPENAI_API_KEY;
    }
  }

  if (!resolvedApiKey) {
    throw new Error(
      `AI_KEY_NOT_CONFIGURED: No API key configured for ${provider}. Please configure your AI provider key in Settings > AI Providers.`,
    );
  }

  const userPrompt = `Create a detailed PRD for the following improvement:

## Title
${options.item.title}

## Problem
${options.item.problem}

## Proposed Solution
${options.item.solution}

## Classification
- Area: ${options.item.area}
- Type: ${options.item.type}
- Complexity: ${options.item.complexity}
- Impact Score: ${options.item.impact_score}/10
- Effort Score: ${options.item.effort_score}/10

## Benefits
${options.item.benefits.map((b) => `- **${b.title}**: ${b.description}`).join('\n')}

${options.additionalContext ? `## Additional Context\n${options.additionalContext}` : ''}

---

Generate a comprehensive PRD with the following sections:
1. Problem Statement
2. Proposed Solution (detailed)
3. Success Criteria (measurable)
4. Technical Approach (with wave-based task breakdown)
5. Risks & Mitigations
6. Out of Scope

For the Technical Approach, break down into waves with specific tasks and subagent assignments.`;

  // Generate using the appropriate provider
  if (provider === 'openai') {
    return generateWithOpenAI(resolvedApiKey, userPrompt);
  }

  // Default to Anthropic
  return generateWithAnthropic(resolvedApiKey, userPrompt);
}

export function parsePrdWaves(prdContent: string): Array<{
  waveNumber: number;
  waveName: string;
  tasks: Array<{
    taskNumber: number;
    description: string;
    subagentType: string;
  }>;
}> {
  const waves: Array<{
    waveNumber: number;
    waveName: string;
    tasks: Array<{
      taskNumber: number;
      description: string;
      subagentType: string;
    }>;
  }> = [];

  // Parse wave sections from PRD content
  const _waveRegex = /###\s*Wave\s*(\d+):\s*([^\n]+)/gi;
  const _taskRegex = /\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;

  let waveMatch: RegExpExecArray | null;
  let currentWave: {
    waveNumber: number;
    waveName: string;
    tasks: Array<{
      taskNumber: number;
      description: string;
      subagentType: string;
    }>;
  } | null = null;

  const lines = prdContent.split('\n');
  let inWave = false;

  for (const line of lines) {
    waveMatch = /###\s*Wave\s*(\d+):\s*(.+)/i.exec(line);
    if (waveMatch) {
      if (currentWave) {
        waves.push(currentWave);
      }
      currentWave = {
        waveNumber: parseInt(waveMatch[1], 10),
        waveName: waveMatch[2].trim(),
        tasks: [],
      };
      inWave = true;
      continue;
    }

    if (inWave && currentWave) {
      const taskMatch =
        /\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/.exec(line);
      if (taskMatch) {
        const [, taskNum, subagent, description] = taskMatch;
        // Skip header rows
        if (subagent.trim().toLowerCase() === 'subagent') {
          continue;
        }

        currentWave.tasks.push({
          taskNumber: parseFloat(taskNum),
          subagentType: subagent.trim(),
          description: description.trim(),
        });
      }
    }
  }

  if (currentWave) {
    waves.push(currentWave);
  }

  return waves;
}
