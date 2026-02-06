/**
 * Task Tool - Launch nested agent calls for complex subtasks.
 * Uses recursive generateText() calls with the same provider.
 */

import { z } from 'zod';

export const taskToolSchema = z.object({
  description: z.string().describe('Short description of the subtask'),
  prompt: z.string().describe('The task for the subagent to perform'),
  subagent_type: z
    .string()
    .optional()
    .describe('Type of agent (general-purpose, Explore, Bash, etc.)'),
});

// The actual execution is handled in multi-provider-agent.ts
// which has access to the provider config for nested calls.
// This schema is used for tool definition only.
