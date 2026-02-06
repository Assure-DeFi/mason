/**
 * Glob Tool - File pattern matching.
 */

import { execSync } from 'node:child_process';

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
    // Use find with glob-style matching via -name or rg --files with glob
    const output = execSync(
      `rg --files --glob '${params.pattern}' '${searchPath}' 2>/dev/null | sort | head -200`,
      {
        encoding: 'utf-8',
        timeout: 15_000,
        maxBuffer: 2 * 1024 * 1024,
        cwd,
      },
    );
    return output.trim() || 'No files matched the pattern.';
  } catch {
    return 'No files matched the pattern.';
  }
}
