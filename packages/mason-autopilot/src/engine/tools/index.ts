/**
 * Tool Registry - Creates all tools for the multi-provider runtime.
 *
 * Exports a factory that produces Vercel AI SDK compatible tool definitions
 * for use with generateText().
 */

import { tool } from 'ai';

import type { ProviderConfig } from '../providers.js';

import { bashToolSchema, executeBash } from './bash-tool.js';
import { editToolSchema, executeEdit } from './edit-tool.js';
import { globToolSchema, executeGlob } from './glob-tool.js';
import { grepToolSchema, executeGrep } from './grep-tool.js';
import { readToolSchema, executeRead } from './read-tool.js';
import { skillToolSchema, loadSkillContent } from './skill-tool.js';
import { taskToolSchema } from './task-tool.js';
import { writeToolSchema, executeWrite } from './write-tool.js';

/**
 * Create all tools for the multi-provider agent runtime.
 *
 * Task and Skill tools return special markers - they are handled
 * by the agent loop in multi-provider-agent.ts which has access
 * to the provider config for nested generateText() calls.
 */
export function createAllTools(
  cwd: string,
  _providerConfig: ProviderConfig,
) {
  return {
    Bash: tool({
      description: 'Execute a bash command',
      parameters: bashToolSchema,
      execute: async (params) => executeBash(params, cwd),
    }),
    Read: tool({
      description: 'Read a file from the filesystem',
      parameters: readToolSchema,
      execute: async (params) => executeRead(params),
    }),
    Write: tool({
      description: 'Write content to a file',
      parameters: writeToolSchema,
      execute: async (params) => executeWrite(params),
    }),
    Edit: tool({
      description: 'Replace text in a file',
      parameters: editToolSchema,
      execute: async (params) => executeEdit(params),
    }),
    Grep: tool({
      description: 'Search file contents using regex',
      parameters: grepToolSchema,
      execute: async (params) => executeGrep(params, cwd),
    }),
    Glob: tool({
      description: 'Find files by pattern',
      parameters: globToolSchema,
      execute: async (params) => executeGlob(params, cwd),
    }),
    Task: tool({
      description:
        'Launch a subagent to handle a complex subtask autonomously',
      parameters: taskToolSchema,
      execute: async (params) => {
        // Marker - actual execution handled by onStepFinish in multi-provider-agent
        return `[TASK_SUBTASK] ${params.description}: ${params.prompt.slice(0, 500)}`;
      },
    }),
    Skill: tool({
      description: 'Invoke a skill (slash command) by name',
      parameters: skillToolSchema,
      execute: async (params) => {
        const content = loadSkillContent(params.skill, cwd);
        if (!content) {
          return `Skill not found: ${params.skill}`;
        }
        // Return the skill content for the agent to follow inline
        return `[SKILL_CONTENT:${params.skill}]\n${content}`;
      },
    }),
  };
}
