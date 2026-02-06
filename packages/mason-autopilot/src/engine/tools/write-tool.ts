/**
 * Write Tool - Write file contents with recursive directory creation.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { z } from 'zod';

export const writeToolSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

export function executeWrite(params: z.infer<typeof writeToolSchema>): string {
  try {
    mkdirSync(dirname(params.file_path), { recursive: true });
    writeFileSync(params.file_path, params.content, 'utf-8');
    return `Successfully wrote ${params.content.length} bytes to ${params.file_path}`;
  } catch (error) {
    return `Error writing file: ${(error as Error).message}`;
  }
}
