import Anthropic from '@anthropic-ai/sdk';
import type { BacklogItem } from '@/types/backlog';

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
}

export async function generatePrd(
  options: GeneratePrdOptions,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required for PRD generation',
    );
  }

  const client = new Anthropic({ apiKey });

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
${options.item.benefits_json.map((b) => `- ${b}`).join('\n')}

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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: PRD_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  // Extract text content from response
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in PRD generation response');
  }

  return textContent.text;
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
  const waveRegex = /###\s*Wave\s*(\d+):\s*([^\n]+)/gi;
  const taskRegex = /\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;

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
        if (subagent.trim().toLowerCase() === 'subagent') continue;

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
