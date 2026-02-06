/**
 * Read Tool - Read file contents with optional offset/limit.
 */

import { readFileSync } from 'node:fs';

import { z } from 'zod';

export const readToolSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to read'),
  offset: z.number().optional().describe('Line number to start reading from'),
  limit: z
    .number()
    .optional()
    .describe('Number of lines to read (default 2000)'),
});

export function executeRead(params: z.infer<typeof readToolSchema>): string {
  try {
    const content = readFileSync(params.file_path, 'utf-8');
    const lines = content.split('\n');
    const offset = (params.offset ?? 1) - 1; // Convert 1-based to 0-based
    const limit = params.limit ?? 2000;
    const slice = lines.slice(offset, offset + limit);

    return slice
      .map((line, i) => {
        const lineNum = offset + i + 1;
        const truncated = line.length > 2000 ? line.slice(0, 2000) + '...' : line;
        return `${String(lineNum).padStart(6)}\t${truncated}`;
      })
      .join('\n');
  } catch (error) {
    return `Error reading file: ${(error as Error).message}`;
  }
}
