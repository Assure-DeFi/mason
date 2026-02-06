/**
 * Skill Tool - Load and execute skill markdown files as nested agent calls.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { z } from 'zod';

export const skillToolSchema = z.object({
  skill: z.string().describe('The skill name to invoke'),
  args: z.string().optional().describe('Optional arguments for the skill'),
});

/**
 * Load skill content from .claude/commands directories.
 * Returns the skill markdown or null if not found.
 */
export function loadSkillContent(
  skillName: string,
  repoPath: string,
): string | null {
  // Try repo-local commands first
  const localPath = join(repoPath, '.claude', 'commands', `${skillName}.md`);
  if (existsSync(localPath)) {
    return readFileSync(localPath, 'utf-8');
  }

  // Fallback to user-global commands
  const userPath = join(homedir(), '.claude', 'commands', `${skillName}.md`);
  if (existsSync(userPath)) {
    return readFileSync(userPath, 'utf-8');
  }

  return null;
}
