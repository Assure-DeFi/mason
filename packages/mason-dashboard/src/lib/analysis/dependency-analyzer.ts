/**
 * Dependency Analyzer
 *
 * Analyzes code dependencies to identify risks before approving changes.
 * Works via GitHub API - no local repo required.
 */

import type { Octokit } from '@octokit/rest';

import { getFileContent, getRepositoryTree } from '@/lib/github/client';
import type {
  BacklogItem,
  DependencyAnalysis,
  BreakingChange,
} from '@/types/backlog';

/**
 * File path patterns extracted from solution text
 */
interface ExtractedPaths {
  explicit: string[]; // Paths mentioned directly
  inferred: string[]; // Paths inferred from component names, etc.
}

/**
 * Extract file paths from solution text
 */
function extractFilePaths(solution: string): ExtractedPaths {
  const explicit: string[] = [];
  const inferred: string[] = [];

  // Match explicit file paths (src/..., packages/..., etc.)
  const pathPatterns = [
    /(?:src|packages|lib|app|components|pages|api)\/[a-zA-Z0-9_\-/.]+\.[a-zA-Z]+/g,
    /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|css|scss|json)/g,
  ];

  for (const pattern of pathPatterns) {
    const matches = solution.match(pattern);
    if (matches) {
      explicit.push(...matches);
    }
  }

  // Match component names (PascalCase) that might map to files
  const componentPattern =
    /(?:component|Component|page|Page)\s+(?:named\s+)?`?([A-Z][a-zA-Z0-9]+)`?/g;
  let match;
  while ((match = componentPattern.exec(solution)) !== null) {
    // Convert PascalCase to kebab-case for potential file match
    const kebabCase = match[1]
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    inferred.push(`**/${kebabCase}.tsx`, `**/${kebabCase}.ts`);
  }

  // Deduplicate
  return {
    explicit: Array.from(new Set(explicit)),
    inferred: Array.from(new Set(inferred)),
  };
}

/**
 * Find test file for a given source file
 */
function findTestFile(filePath: string, allFiles: string[]): string | null {
  const baseName = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  const testPatterns = [
    `${baseName}.test.ts`,
    `${baseName}.test.tsx`,
    `${baseName}.spec.ts`,
    `${baseName}.spec.tsx`,
    `__tests__/${filePath
      .split('/')
      .pop()
      ?.replace(/\.(ts|tsx|js|jsx)$/, '')}.test.ts`,
    `__tests__/${filePath
      .split('/')
      .pop()
      ?.replace(/\.(ts|tsx|js|jsx)$/, '')}.test.tsx`,
  ];

  for (const pattern of testPatterns) {
    const found = allFiles.find(
      (f) => f.endsWith(pattern.split('/').pop() ?? '') || f === pattern,
    );
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Parse import statements from file content
 */
function parseImports(content: string): string[] {
  const imports: string[] = [];

  // Match various import patterns
  const patterns = [
    /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Resolve import path to actual file path
 */
function resolveImportPath(
  importPath: string,
  currentFile: string,
  allFiles: string[],
): string | null {
  // Skip external packages
  if (
    !importPath.startsWith('.') &&
    !importPath.startsWith('@/') &&
    !importPath.startsWith('~/')
  ) {
    return null;
  }

  // Handle alias imports (@/, ~/)
  let resolvedPath = importPath;
  if (importPath.startsWith('@/')) {
    resolvedPath = importPath.replace('@/', 'src/');
  } else if (importPath.startsWith('~/')) {
    resolvedPath = importPath.replace('~/', 'src/');
  } else if (importPath.startsWith('.')) {
    // Handle relative imports
    const currentDir = currentFile.split('/').slice(0, -1).join('/');
    const parts = importPath.split('/');
    const dirParts = currentDir.split('/');

    for (const part of parts) {
      if (part === '..') {
        dirParts.pop();
      } else if (part !== '.') {
        dirParts.push(part);
      }
    }
    resolvedPath = dirParts.join('/');
  }

  // Try to find matching file with extensions
  const extensions = [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '/index.ts',
    '/index.tsx',
  ];
  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    if (allFiles.includes(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Build import graph for target files
 */
async function buildImportGraph(
  octokit: Octokit,
  owner: string,
  repo: string,
  targetFiles: string[],
  allFiles: string[],
): Promise<{
  upstream: Map<string, string[]>;
  downstream: Map<string, string[]>;
}> {
  const upstream = new Map<string, string[]>();
  const downstream = new Map<string, string[]>();

  // Get content for target files to find upstream dependencies
  for (const file of targetFiles) {
    const content = await getFileContent(octokit, owner, repo, file);
    if (content) {
      const imports = parseImports(content.content);
      const resolvedImports = imports
        .map((imp) => resolveImportPath(imp, file, allFiles))
        .filter((p): p is string => p !== null);
      upstream.set(file, resolvedImports);
    }
  }

  // Scan all source files to find who imports the target files
  const sourceFiles = allFiles.filter(
    (f) =>
      (f.endsWith('.ts') ||
        f.endsWith('.tsx') ||
        f.endsWith('.js') ||
        f.endsWith('.jsx')) &&
      !f.includes('.test.') &&
      !f.includes('.spec.') &&
      !f.includes('__tests__'),
  );

  // Limit scanning to reasonable number to avoid rate limits
  const filesToScan = sourceFiles.slice(0, 200);

  for (const file of filesToScan) {
    // Skip if this is one of our target files
    if (targetFiles.includes(file)) {
      continue;
    }

    const content = await getFileContent(octokit, owner, repo, file);
    if (!content) {
      continue;
    }

    const imports = parseImports(content.content);
    for (const targetFile of targetFiles) {
      // Check if any import resolves to the target file
      const importsTarget = imports.some((imp) => {
        const resolved = resolveImportPath(imp, file, allFiles);
        return resolved === targetFile;
      });

      if (importsTarget) {
        const existing = downstream.get(targetFile) || [];
        existing.push(file);
        downstream.set(targetFile, existing);
      }
    }
  }

  return { upstream, downstream };
}

/**
 * Detect potential breaking changes in a file
 */
async function detectBreakingChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  file: string,
  solution: string,
): Promise<BreakingChange[]> {
  const changes: BreakingChange[] = [];
  const content = await getFileContent(octokit, owner, repo, file);

  if (!content) {
    return changes;
  }

  // Check if solution mentions removing or changing exports
  const exportPattern =
    /export\s+(?:const|function|class|type|interface)\s+(\w+)/g;
  const exports: string[] = [];
  let match;
  while ((match = exportPattern.exec(content.content)) !== null) {
    exports.push(match[1]);
  }

  // Check if solution mentions removing any of these exports
  const removePatterns = [
    /remov(?:e|ing)\s+(?:the\s+)?`?(\w+)`?/gi,
    /delet(?:e|ing)\s+(?:the\s+)?`?(\w+)`?/gi,
    /deprecat(?:e|ing)\s+(?:the\s+)?`?(\w+)`?/gi,
  ];

  for (const pattern of removePatterns) {
    while ((match = pattern.exec(solution)) !== null) {
      const name = match[1];
      if (exports.includes(name)) {
        changes.push({
          file,
          type: 'export_removed',
          description: `Export '${name}' may be removed`,
          severity: 'high',
        });
      }
    }
  }

  // Check for API route changes
  if (file.includes('/api/') && file.includes('route.ts')) {
    if (
      solution.toLowerCase().includes('change') ||
      solution.toLowerCase().includes('modify') ||
      solution.toLowerCase().includes('update')
    ) {
      changes.push({
        file,
        type: 'api_endpoint_changed',
        description: 'API endpoint may be modified',
        severity: 'medium',
      });
    }
  }

  // Check for type changes
  const typePattern = /(?:interface|type)\s+(\w+)/g;
  const types: string[] = [];
  while ((match = typePattern.exec(content.content)) !== null) {
    types.push(match[1]);
  }

  const typeChangePatterns = [
    /chang(?:e|ing)\s+(?:the\s+)?(?:type|interface)\s+`?(\w+)`?/gi,
    /modif(?:y|ying)\s+(?:the\s+)?`?(\w+)`?\s+(?:type|interface)/gi,
  ];

  for (const pattern of typeChangePatterns) {
    while ((match = pattern.exec(solution)) !== null) {
      const name = match[1];
      if (types.includes(name)) {
        changes.push({
          file,
          type: 'type_changed',
          description: `Type '${name}' may be modified`,
          severity: 'medium',
        });
      }
    }
  }

  return changes;
}

/**
 * Calculate risk scores based on analysis
 */
function calculateRiskScores(
  targetFiles: string[],
  affectedFiles: string[],
  upstreamDependencies: string[],
  filesWithoutTests: string[],
  breakingChanges: BreakingChange[],
  hasMigration: boolean,
  hasApiChanges: boolean,
): {
  fileCountScore: number;
  dependencyDepthScore: number;
  testCoverageScore: number;
  cascadePotentialScore: number;
  apiSurfaceScore: number;
} {
  // File count score (1 = single file, 10 = 20+ files)
  const totalFiles = targetFiles.length;
  const fileCountScore = Math.min(10, Math.max(1, Math.ceil(totalFiles / 2)));

  // Dependency depth score (how central are the files)
  const avgUpstream =
    upstreamDependencies.length / Math.max(1, targetFiles.length);
  const dependencyDepthScore = Math.min(
    10,
    Math.max(1, Math.ceil(avgUpstream / 3)),
  );

  // Test coverage score (1 = fully tested, 10 = no tests)
  const testCoverageRatio =
    filesWithoutTests.length / Math.max(1, targetFiles.length);
  const testCoverageScore = Math.min(
    10,
    Math.max(1, Math.ceil(testCoverageRatio * 10)),
  );

  // Cascade potential score (how many files depend on these)
  const cascadePotentialScore = Math.min(
    10,
    Math.max(1, Math.ceil(affectedFiles.length / 5)),
  );

  // API surface score (database/external API impact)
  let apiSurfaceScore = 1;
  if (hasApiChanges) {
    apiSurfaceScore += 3;
  }
  if (hasMigration) {
    apiSurfaceScore += 4;
  }
  if (breakingChanges.some((bc) => bc.severity === 'high')) {
    apiSurfaceScore += 2;
  }
  apiSurfaceScore = Math.min(10, apiSurfaceScore);

  return {
    fileCountScore,
    dependencyDepthScore,
    testCoverageScore,
    cascadePotentialScore,
    apiSurfaceScore,
  };
}

/**
 * Main analysis function
 */
export async function analyzeDependencies(
  octokit: Octokit,
  owner: string,
  repo: string,
  item: BacklogItem,
): Promise<
  Omit<
    DependencyAnalysis,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'item_id'
    | 'overall_risk_score'
    | 'has_breaking_changes'
  >
> {
  // Get repository tree
  const tree = await getRepositoryTree(octokit, owner, repo);
  const allFiles = tree.filter((t) => t.type === 'blob').map((t) => t.path);

  // Extract target files from solution
  const { explicit, inferred } = extractFilePaths(item.solution);

  // Match explicit paths to actual files
  const targetFiles = explicit.filter((p) => allFiles.includes(p));

  // Try to match inferred paths
  for (const pattern of inferred) {
    const regex = new RegExp(pattern.replace('**/', '.*').replace('.', '\\.'));
    const matches = allFiles.filter((f) => regex.test(f));
    targetFiles.push(...matches.slice(0, 3)); // Limit to avoid too many matches
  }

  // Deduplicate
  const uniqueTargetFiles = Array.from(new Set(targetFiles));

  // Build import graph
  const { upstream, downstream } = await buildImportGraph(
    octokit,
    owner,
    repo,
    uniqueTargetFiles,
    allFiles,
  );

  // Flatten dependencies
  const upstreamDependencies = Array.from(
    new Set(Array.from(upstream.values()).flat()),
  );
  const affectedFiles = Array.from(
    new Set(Array.from(downstream.values()).flat()),
  );

  // Check test coverage
  const filesWithoutTests: string[] = [];
  for (const file of uniqueTargetFiles) {
    if (!findTestFile(file, allFiles)) {
      filesWithoutTests.push(file);
    }
  }

  // Detect breaking changes
  const allBreakingChanges: BreakingChange[] = [];
  for (const file of uniqueTargetFiles.slice(0, 10)) {
    // Limit to avoid rate limits
    const changes = await detectBreakingChanges(
      octokit,
      owner,
      repo,
      file,
      item.solution,
    );
    allBreakingChanges.push(...changes);
  }

  // Check for migration/API indicators
  const solutionLower = item.solution.toLowerCase();
  const hasMigration =
    solutionLower.includes('migration') ||
    solutionLower.includes('alter table') ||
    solutionLower.includes('create table') ||
    solutionLower.includes('database schema');

  const hasApiChanges =
    uniqueTargetFiles.some(
      (f) => f.includes('/api/') && f.includes('route.ts'),
    ) ||
    solutionLower.includes('api endpoint') ||
    solutionLower.includes('api route');

  // Calculate risk scores
  const scores = calculateRiskScores(
    uniqueTargetFiles,
    affectedFiles,
    upstreamDependencies,
    filesWithoutTests,
    allBreakingChanges,
    hasMigration,
    hasApiChanges,
  );

  return {
    target_files: uniqueTargetFiles,
    affected_files: affectedFiles,
    upstream_dependencies: upstreamDependencies,
    file_count_score: scores.fileCountScore,
    dependency_depth_score: scores.dependencyDepthScore,
    test_coverage_score: scores.testCoverageScore,
    cascade_potential_score: scores.cascadePotentialScore,
    api_surface_score: scores.apiSurfaceScore,
    breaking_changes: allBreakingChanges,
    files_without_tests: filesWithoutTests,
    migration_needed: hasMigration,
    api_changes_detected: hasApiChanges,
  };
}

/**
 * Calculate overall risk score from component scores
 * Weighted average: file_count(20%) + dependency_depth(25%) + test_coverage(25%) + cascade(20%) + api_surface(10%)
 */
export function calculateOverallRiskScore(scores: {
  file_count_score: number;
  dependency_depth_score: number;
  test_coverage_score: number;
  cascade_potential_score: number;
  api_surface_score: number;
}): number {
  return Math.round(
    (scores.file_count_score * 20 +
      scores.dependency_depth_score * 25 +
      scores.test_coverage_score * 25 +
      scores.cascade_potential_score * 20 +
      scores.api_surface_score * 10) /
      100,
  );
}
