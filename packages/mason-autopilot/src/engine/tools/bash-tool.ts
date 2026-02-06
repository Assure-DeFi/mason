/**
 * Bash Tool - Execute shell commands with timeout and error capture.
 */

import { execSync } from 'node:child_process';

import { z } from 'zod';

export const bashToolSchema = z.object({
  command: z.string().describe('The bash command to execute'),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds (default 120000)'),
});

export function executeBash(
  params: z.infer<typeof bashToolSchema>,
  cwd: string,
): string {
  const timeout = params.timeout ?? 120_000;
  try {
    const output = execSync(params.command, {
      cwd,
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.slice(0, 30_000);
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
      message: string;
    };
    const stdout = (err.stdout || '').slice(0, 10_000);
    const stderr = (err.stderr || '').slice(0, 10_000);
    return `Exit code: ${err.status ?? 'unknown'}\nstdout:\n${stdout}\nstderr:\n${stderr}`;
  }
}
