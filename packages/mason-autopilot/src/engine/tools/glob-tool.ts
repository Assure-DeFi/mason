/**
 * Glob Tool - File pattern matching.
 */

import { execFileSync } from 'node:child_process';

import { z } from 'zod';

export const globToolSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files against'),
  path: z.string().optional().describe('Directory to search in'),
});

export function executeGlob(
  params: z.infer<typeof globToolSchema>,
  cwd: string,
): string {
  const searchPath = params.path || cwd;

  try {
    const output = execFileSync(
      'rg',
      ['--files', `--glob=${params.pattern}`, searchPath],
      {
        encoding: 'utf-8',
        timeout: 15_000,
        maxBuffer: 2 * 1024 * 1024,
        cwd,
      },
    );

    // Sort and limit results
    const lines = output.trim().split('\n').filter(Boolean).sort();
    return lines.slice(0, 200).join('\n') || 'No files matched the pattern.';
  } catch {
    return 'No files matched the pattern.';
  }
}
