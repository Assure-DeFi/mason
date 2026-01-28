import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { StackType } from '../types/config.js';

/**
 * Stack detection result
 */
export interface StackDetectionResult {
  /** Detected stack type */
  type: StackType;

  /** Confidence level (0-1) */
  confidence: number;

  /** Evidence that led to detection */
  evidence: string[];

  /** Framework version if detected */
  version?: string;

  /** Package manager detected */
  packageManager?: 'npm' | 'yarn' | 'pnpm';
}

/**
 * Read and parse package.json
 */
function readPackageJson(repoPath: string): Record<string, unknown> | null {
  const packagePath = join(repoPath, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }

  try {
    const content = readFileSync(packagePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Check if a file exists in the repo
 */
function hasFile(repoPath: string, filename: string): boolean {
  return existsSync(join(repoPath, filename));
}

/**
 * Check if any of the files exist
 */
function hasAnyFile(repoPath: string, filenames: string[]): boolean {
  return filenames.some((f) => hasFile(repoPath, f));
}

/**
 * Detect the package manager used
 */
function detectPackageManager(
  repoPath: string,
): 'npm' | 'yarn' | 'pnpm' | undefined {
  if (hasFile(repoPath, 'pnpm-lock.yaml')) {
    return 'pnpm';
  }
  if (hasFile(repoPath, 'yarn.lock')) {
    return 'yarn';
  }
  if (hasFile(repoPath, 'package-lock.json')) {
    return 'npm';
  }
  return undefined;
}

/**
 * Get dependency version from package.json
 */
function getDependencyVersion(
  pkg: Record<string, unknown>,
  name: string,
): string | undefined {
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  return deps?.[name] ?? devDeps?.[name];
}

/**
 * Detect Next.js stack
 */
function detectNextjs(
  repoPath: string,
  pkg: Record<string, unknown>,
): StackDetectionResult | null {
  const evidence: string[] = [];
  let confidence = 0;

  // Check for next dependency
  const nextVersion = getDependencyVersion(pkg, 'next');
  if (nextVersion) {
    evidence.push(`next dependency: ${nextVersion}`);
    confidence += 0.5;
  }

  // Check for Next.js config files
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  if (hasAnyFile(repoPath, configFiles)) {
    evidence.push('next.config file found');
    confidence += 0.3;
  }

  // Check for app or pages directory
  if (hasFile(repoPath, 'app') || hasFile(repoPath, 'src/app')) {
    evidence.push('app directory (App Router)');
    confidence += 0.15;
  }
  if (hasFile(repoPath, 'pages') || hasFile(repoPath, 'src/pages')) {
    evidence.push('pages directory (Pages Router)');
    confidence += 0.15;
  }

  if (confidence >= 0.5) {
    return {
      type: 'nextjs',
      confidence: Math.min(confidence, 1),
      evidence,
      version: nextVersion?.replace(/[\^~]/, ''),
      packageManager: detectPackageManager(repoPath),
    };
  }

  return null;
}

/**
 * Detect React stack (non-Next.js)
 */
function detectReact(
  repoPath: string,
  pkg: Record<string, unknown>,
): StackDetectionResult | null {
  const evidence: string[] = [];
  let confidence = 0;

  // Check for react dependency
  const reactVersion = getDependencyVersion(pkg, 'react');
  if (reactVersion) {
    evidence.push(`react dependency: ${reactVersion}`);
    confidence += 0.4;
  }

  // Check for common React tooling
  if (getDependencyVersion(pkg, 'vite')) {
    evidence.push('vite bundler');
    confidence += 0.2;
  }

  if (getDependencyVersion(pkg, 'react-scripts')) {
    evidence.push('create-react-app (react-scripts)');
    confidence += 0.3;
  }

  if (hasAnyFile(repoPath, ['vite.config.ts', 'vite.config.js'])) {
    evidence.push('vite config found');
    confidence += 0.1;
  }

  // Check for src/index.tsx or src/main.tsx
  if (
    hasAnyFile(repoPath, [
      'src/index.tsx',
      'src/index.jsx',
      'src/main.tsx',
      'src/main.jsx',
    ])
  ) {
    evidence.push('React entry point');
    confidence += 0.1;
  }

  if (confidence >= 0.5) {
    return {
      type: 'react',
      confidence: Math.min(confidence, 1),
      evidence,
      version: reactVersion?.replace(/[\^~]/, ''),
      packageManager: detectPackageManager(repoPath),
    };
  }

  return null;
}

/**
 * Detect generic Node.js stack
 */
function detectNode(
  repoPath: string,
  pkg: Record<string, unknown>,
): StackDetectionResult | null {
  const evidence: string[] = [];
  let confidence = 0;

  // Has package.json
  if (pkg) {
    evidence.push('package.json found');
    confidence += 0.3;
  }

  // Check for TypeScript
  if (getDependencyVersion(pkg, 'typescript')) {
    evidence.push('typescript dependency');
    confidence += 0.2;
  }

  if (hasAnyFile(repoPath, ['tsconfig.json'])) {
    evidence.push('tsconfig.json found');
    confidence += 0.1;
  }

  // Check for common Node patterns
  if (
    hasAnyFile(repoPath, [
      'src/index.ts',
      'src/index.js',
      'index.ts',
      'index.js',
    ])
  ) {
    evidence.push('Node entry point');
    confidence += 0.1;
  }

  // Express/Fastify/Koa
  const serverFrameworks = ['express', 'fastify', 'koa', 'hapi'];
  for (const framework of serverFrameworks) {
    if (getDependencyVersion(pkg, framework)) {
      evidence.push(`${framework} server framework`);
      confidence += 0.2;
      break;
    }
  }

  if (confidence >= 0.3) {
    return {
      type: 'node',
      confidence: Math.min(confidence, 1),
      evidence,
      packageManager: detectPackageManager(repoPath),
    };
  }

  return null;
}

/**
 * Detect the stack type of a repository
 */
export function detectStack(repoPath: string): StackDetectionResult {
  const pkg = readPackageJson(repoPath);

  if (!pkg) {
    return {
      type: 'unknown',
      confidence: 1,
      evidence: ['No package.json found'],
    };
  }

  // Try to detect specific stacks in priority order
  const nextjs = detectNextjs(repoPath, pkg);
  if (nextjs) {
    return nextjs;
  }

  const react = detectReact(repoPath, pkg);
  if (react) {
    return react;
  }

  const node = detectNode(repoPath, pkg);
  if (node) {
    return node;
  }

  return {
    type: 'unknown',
    confidence: 0.5,
    evidence: ['Could not determine stack type'],
    packageManager: detectPackageManager(repoPath),
  };
}

/**
 * Get a human-readable description of the stack
 */
export function getStackDescription(result: StackDetectionResult): string {
  switch (result.type) {
    case 'nextjs':
      return `Next.js${result.version ? ` ${result.version}` : ''}`;
    case 'react':
      return `React${result.version ? ` ${result.version}` : ''}`;
    case 'node':
      return 'Node.js';
    default:
      return 'Unknown stack';
  }
}
