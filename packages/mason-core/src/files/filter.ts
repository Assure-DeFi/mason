import { statSync } from 'node:fs';
import { join } from 'node:path';

import fg from 'fast-glob';

import {
  DEFAULT_IGNORE_PATTERNS,
  HIGH_PRIORITY_PATTERNS,
} from '../ignore/patterns.js';

/**
 * File filtering options
 */
export interface FileFilterOptions {
  /** Base directory to search in */
  basePath: string;

  /** Additional patterns to ignore */
  additionalIgnore?: string[];

  /** Patterns to include (override ignores) */
  include?: string[];

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Only include high-priority files */
  priorityOnly?: boolean;
}

/**
 * Result of file filtering
 */
export interface FilteredFiles {
  /** Files that passed filtering */
  files: string[];

  /** Files that were skipped with reasons */
  skipped: Array<{ path: string; reason: string }>;

  /** Total files scanned */
  totalScanned: number;
}

/**
 * Build the ignore patterns array
 */
function buildIgnorePatterns(additionalIgnore?: string[]): string[] {
  const patterns = [...DEFAULT_IGNORE_PATTERNS];

  if (additionalIgnore) {
    patterns.push(...additionalIgnore);
  }

  return patterns;
}

/**
 * Check if a file should be skipped due to size
 */
function checkFileSize(
  filePath: string,
  maxSize: number,
): { skip: boolean; reason?: string } {
  try {
    const stats = statSync(filePath);
    if (stats.size > maxSize) {
      return {
        skip: true,
        reason: `File too large: ${Math.round(stats.size / 1024)}KB > ${Math.round(maxSize / 1024)}KB limit`,
      };
    }
    return { skip: false };
  } catch {
    return { skip: true, reason: 'Could not read file stats' };
  }
}

/**
 * Get all files matching criteria
 */
export async function getFilteredFiles(
  options: FileFilterOptions,
): Promise<FilteredFiles> {
  const {
    basePath,
    additionalIgnore,
    include,
    maxFileSize = 102400, // 100KB default
    priorityOnly = false,
  } = options;

  const ignorePatterns = buildIgnorePatterns(additionalIgnore);
  const skipped: Array<{ path: string; reason: string }> = [];

  // Determine patterns to search
  const searchPatterns = priorityOnly
    ? HIGH_PRIORITY_PATTERNS.map((p) => p.toString())
    : ['**/*'];

  // Get files using fast-glob
  let files = await fg(searchPatterns, {
    cwd: basePath,
    ignore: ignorePatterns,
    onlyFiles: true,
    absolute: false,
    dot: false, // Ignore dotfiles by default
    followSymbolicLinks: false,
  });

  // If include patterns specified, also get those
  if (include && include.length > 0) {
    const includeFiles = await fg(include, {
      cwd: basePath,
      onlyFiles: true,
      absolute: false,
      dot: false,
      followSymbolicLinks: false,
    });

    // Merge without duplicates
    const fileSet = new Set(files);
    for (const f of includeFiles) {
      fileSet.add(f);
    }
    files = Array.from(fileSet);
  }

  const totalScanned = files.length;

  // Filter by file size
  const filteredFiles: string[] = [];
  for (const file of files) {
    const fullPath = join(basePath, file);
    const sizeCheck = checkFileSize(fullPath, maxFileSize);

    if (sizeCheck.skip) {
      skipped.push({ path: file, reason: sizeCheck.reason! });
    } else {
      filteredFiles.push(file);
    }
  }

  return {
    files: filteredFiles,
    skipped,
    totalScanned,
  };
}

/**
 * Get files grouped by extension
 */
export async function getFilesByExtension(
  options: FileFilterOptions,
): Promise<Map<string, string[]>> {
  const { files } = await getFilteredFiles(options);

  const byExtension = new Map<string, string[]>();

  for (const file of files) {
    const ext = file.split('.').pop()?.toLowerCase() ?? '';
    const existing = byExtension.get(ext) ?? [];
    existing.push(file);
    byExtension.set(ext, existing);
  }

  return byExtension;
}

/**
 * Get a summary of files in the repository
 */
export async function getFileSummary(basePath: string): Promise<{
  totalFiles: number;
  byExtension: Record<string, number>;
  largeFiles: string[];
}> {
  const maxFileSize = 1024 * 1024; // 1MB for summary purposes

  const { files, skipped } = await getFilteredFiles({
    basePath,
    maxFileSize,
  });

  const byExtension: Record<string, number> = {};

  for (const file of files) {
    const ext = file.split('.').pop()?.toLowerCase() ?? 'no-ext';
    byExtension[ext] = (byExtension[ext] ?? 0) + 1;
  }

  return {
    totalFiles: files.length,
    byExtension,
    largeFiles: skipped
      .filter((s) => s.reason.includes('too large'))
      .map((s) => s.path),
  };
}

/**
 * Estimate token count for files (rough estimate)
 * Assumes ~4 characters per token on average
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
