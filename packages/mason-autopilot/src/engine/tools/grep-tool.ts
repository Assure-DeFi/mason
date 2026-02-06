/**
 * Grep Tool - Search file contents using ripgrep.
 */

import { execSync } from 'node:child_process';

import { z } from 'zod';

export const grepToolSchema = z.object({
  pattern: z.string().describe('Regex pattern to search for'),
  path: z.string().optional().describe('Directory or file to search in'),
  glob: z.string().optional().describe('Glob pattern to filter files'),
  output_mode: z
    .enum(['content', 'files_with_matches', 'count'])
    .optional()
    .describe('Output mode (default files_with_matches)'),
  context: z.number().optional().describe('Lines of context around matches'),
});

export function executeGrep(
  params: z.infer<typeof grepToolSchema>,
  cwd: string,
): string {
  const searchPath = params.path || cwd;
  const mode = params.output_mode || 'files_with_matches';

  const args: string[] = ['rg', '--no-heading'];

  if (mode === 'files_with_matches') {
    args.push('-l');
  } else if (mode === 'count') {
    args.push('-c');
  } else {
    args.push('-n');
  }

  if (params.context && mode === 'content') {
    args.push(`-C${params.context}`);
  }

  if (params.glob) {
    args.push(`--glob=${params.glob}`);
  }

  args.push('--', params.pattern, searchPath);

  try {
    const output = execSync(args.join(' '), {
      encoding: 'utf-8',
      timeout: 30_000,
      maxBuffer: 5 * 1024 * 1024,
      cwd,
    });
    return output.slice(0, 30_000);
  } catch (error) {
    const err = error as { stdout?: string; status?: number };
    if (err.status === 1) {
      return 'No matches found.';
    }
    return (err.stdout || '').slice(0, 10_000) || 'Grep error';
  }
}
