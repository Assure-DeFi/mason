/**
 * Edit Tool - String replacement in files with validation.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { z } from 'zod';

export const editToolSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to modify'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The replacement text'),
  replace_all: z
    .boolean()
    .optional()
    .describe('Replace all occurrences (default false)'),
});

export function executeEdit(params: z.infer<typeof editToolSchema>): string {
  try {
    const content = readFileSync(params.file_path, 'utf-8');

    if (!content.includes(params.old_string)) {
      return `Error: old_string not found in ${params.file_path}`;
    }

    const occurrences = content.split(params.old_string).length - 1;
    if (occurrences > 1 && !params.replace_all) {
      return `Error: old_string found ${occurrences} times in ${params.file_path}. Use replace_all=true or provide more context.`;
    }

    const newContent = params.replace_all
      ? content.replaceAll(params.old_string, params.new_string)
      : content.replace(params.old_string, params.new_string);

    writeFileSync(params.file_path, newContent, 'utf-8');
    const replaced = params.replace_all ? occurrences : 1;
    return `Successfully replaced ${replaced} occurrence(s) in ${params.file_path}`;
  } catch (error) {
    return `Error editing file: ${(error as Error).message}`;
  }
}
