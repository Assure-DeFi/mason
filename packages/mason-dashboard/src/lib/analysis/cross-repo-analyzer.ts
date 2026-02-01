/**
 * Cross-Repository Impact Analyzer
 *
 * Extends dependency analysis to identify cross-repository impacts.
 * Maps imports between connected repositories to surface improvements
 * that might affect dependent packages in monorepos.
 */

import type { Octokit } from '@octokit/rest';

import { getFileContent, getRepositoryTree } from '@/lib/github/client';
import type { GitHubRepository } from '@/types/auth';

/**
 * Represents a cross-repository dependency
 */
export interface CrossRepoDependency {
  sourceRepo: string; // Repository containing the import
  targetRepo: string; // Repository being imported from
  sourceFile: string; // File containing the import
  importPath: string; // The import statement path
  type: 'package' | 'relative' | 'workspace'; // Type of dependency
}

/**
 * Impact radius for a change
 */
export interface ImpactRadius {
  directlyAffected: AffectedRepository[];
  indirectlyAffected: AffectedRepository[];
  totalReposAffected: number;
  hasBreakingPotential: boolean;
}

/**
 * Repository affected by a change
 */
export interface AffectedRepository {
  repository: GitHubRepository;
  affectedFiles: string[];
  impactSeverity: 'high' | 'medium' | 'low';
  dependencyType: 'direct' | 'transitive';
  description: string;
}

/**
 * Cross-repository dependency graph
 */
export interface CrossRepoGraph {
  repositories: Map<string, RepositoryNode>;
  edges: CrossRepoDependency[];
  builtAt: Date;
}

/**
 * Node in the repository graph
 */
interface RepositoryNode {
  repository: GitHubRepository;
  exports: ExportInfo[];
  imports: ImportInfo[];
  packageName: string | null;
}

/**
 * Export information from a repository
 */
interface ExportInfo {
  file: string;
  exportedNames: string[];
  isDefaultExport: boolean;
}

/**
 * Import information in a repository
 */
interface ImportInfo {
  file: string;
  importPath: string;
  resolvedRepo: string | null;
  importedNames: string[];
}

/**
 * Parse package.json to get package name
 */
async function getPackageName(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const content = await getFileContent(octokit, owner, repo, 'package.json');
    if (content) {
      const pkg = JSON.parse(content.content);
      return pkg.name || null;
    }
  } catch {
    // Package.json not found or not valid JSON
  }
  return null;
}

/**
 * Parse exports from a TypeScript/JavaScript file
 */
function parseExports(content: string): ExportInfo['exportedNames'] {
  const exports: string[] = [];

  const patterns = [
    // Named exports: export const/function/class/type/interface Name
    /export\s+(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g,
    // Export list: export { a, b, c }
    /export\s*\{([^}]+)\}/g,
    // Re-exports: export { a, b } from './module'
    /export\s*\{([^}]+)\}\s*from/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (pattern.source.includes('{')) {
        // Parse export list
        const names = match[1].split(',').map((n) => n.trim().split(' ')[0]);
        exports.push(...names);
      } else {
        exports.push(match[1]);
      }
    }
  }

  // Check for default export
  if (/export\s+default/.test(content)) {
    exports.push('default');
  }

  return Array.from(new Set(exports));
}

/**
 * Parse imports from a file and categorize them
 */
function parseImportsWithContext(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // Match import statements
  const importPattern =
    /import\s+(?:(?:\{([^}]+)\})|(?:(\w+)(?:\s*,\s*\{([^}]+)\})?)|(?:\*\s+as\s+(\w+)))\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const namedImports = match[1] || match[3];
    const defaultImport = match[2];
    const namespaceImport = match[4];
    const importPath = match[5];

    const importedNames: string[] = [];
    if (namedImports) {
      importedNames.push(
        ...namedImports.split(',').map((n) => n.trim().split(' ')[0]),
      );
    }
    if (defaultImport) {
      importedNames.push('default');
    }
    if (namespaceImport) {
      importedNames.push('*');
    }

    imports.push({
      file: '', // Will be set by caller
      importPath,
      resolvedRepo: null, // Will be resolved later
      importedNames,
    });
  }

  return imports;
}

/**
 * Determine if an import path refers to another connected repository
 */
function resolveImportToRepo(
  importPath: string,
  currentRepo: GitHubRepository,
  allRepos: GitHubRepository[],
  packageNames: Map<string, string>,
): string | null {
  // Check if it's a package import (not relative)
  if (importPath.startsWith('.') || importPath.startsWith('@/')) {
    return null; // Local import
  }

  // Check if it matches any connected repository's package name
  const pkgEntries = Array.from(packageNames.entries());
  for (const [repoId, pkgName] of pkgEntries) {
    if (repoId === currentRepo.id) {
      continue; // Skip self
    }

    // Direct package match
    if (importPath === pkgName || importPath.startsWith(`${pkgName}/`)) {
      return repoId;
    }
  }

  // Check for workspace imports (e.g., @workspace/package-name)
  const workspacePattern = /^@(\w+)\/(\w+)/;
  const workspaceMatch = importPath.match(workspacePattern);
  if (workspaceMatch) {
    // Try to find a repo with matching name
    for (const repo of allRepos) {
      if (repo.id === currentRepo.id) {
        continue;
      }
      if (
        repo.github_name === workspaceMatch[2] ||
        repo.github_name === importPath.split('/')[0]
      ) {
        return repo.id;
      }
    }
  }

  return null;
}

/**
 * Build a cross-repository dependency graph
 */
export async function buildCrossRepoGraph(
  octokit: Octokit,
  repositories: GitHubRepository[],
): Promise<CrossRepoGraph> {
  const graph: CrossRepoGraph = {
    repositories: new Map(),
    edges: [],
    builtAt: new Date(),
  };

  // First pass: Get package names for all repos
  const packageNames = new Map<string, string>();
  for (const repo of repositories) {
    const pkgName = await getPackageName(
      octokit,
      repo.github_owner,
      repo.github_name,
    );
    if (pkgName) {
      packageNames.set(repo.id, pkgName);
    }
  }

  // Second pass: Build repository nodes with exports and imports
  for (const repo of repositories) {
    const tree = await getRepositoryTree(
      octokit,
      repo.github_owner,
      repo.github_name,
    );
    const sourceFiles = tree
      .filter(
        (t) =>
          t.type === 'blob' &&
          (t.path.endsWith('.ts') ||
            t.path.endsWith('.tsx') ||
            t.path.endsWith('.js') ||
            t.path.endsWith('.jsx')) &&
          !t.path.includes('node_modules') &&
          !t.path.includes('.test.') &&
          !t.path.includes('.spec.'),
      )
      .map((t) => t.path);

    const exports: ExportInfo[] = [];
    const imports: ImportInfo[] = [];

    // Limit file scanning to avoid rate limits
    const filesToScan = sourceFiles.slice(0, 50);

    for (const file of filesToScan) {
      const content = await getFileContent(
        octokit,
        repo.github_owner,
        repo.github_name,
        file,
      );
      if (!content) {
        continue;
      }

      // Parse exports
      const exportedNames = parseExports(content.content);
      if (exportedNames.length > 0) {
        exports.push({
          file,
          exportedNames,
          isDefaultExport: exportedNames.includes('default'),
        });
      }

      // Parse imports
      const fileImports = parseImportsWithContext(content.content);
      for (const imp of fileImports) {
        imp.file = file;
        imp.resolvedRepo = resolveImportToRepo(
          imp.importPath,
          repo,
          repositories,
          packageNames,
        );
        imports.push(imp);

        // Add edge if this imports from another connected repo
        if (imp.resolvedRepo) {
          graph.edges.push({
            sourceRepo: repo.id,
            targetRepo: imp.resolvedRepo,
            sourceFile: file,
            importPath: imp.importPath,
            type: imp.importPath.startsWith('@')
              ? 'workspace'
              : imp.importPath.startsWith('.')
                ? 'relative'
                : 'package',
          });
        }
      }
    }

    graph.repositories.set(repo.id, {
      repository: repo,
      exports,
      imports,
      packageName: packageNames.get(repo.id) ?? null,
    });
  }

  return graph;
}

/**
 * Calculate impact radius for a change in a specific repository
 */
export function calculateImpactRadius(
  graph: CrossRepoGraph,
  targetRepoId: string,
  changedFiles: string[],
): ImpactRadius {
  const directlyAffected: AffectedRepository[] = [];
  const indirectlyAffected: AffectedRepository[] = [];
  let hasBreakingPotential = false;

  const targetNode = graph.repositories.get(targetRepoId);
  if (!targetNode) {
    return {
      directlyAffected: [],
      indirectlyAffected: [],
      totalReposAffected: 0,
      hasBreakingPotential: false,
    };
  }

  // Find changed exports
  const changedExports = new Set<string>();
  for (const file of changedFiles) {
    const exportInfo = targetNode.exports.find((e) => e.file === file);
    if (exportInfo) {
      exportInfo.exportedNames.forEach((name: string) =>
        changedExports.add(name),
      );
    }
  }

  // Check which repos import from the target repo
  const repoEntries = Array.from(graph.repositories.entries());
  for (const [repoId, node] of repoEntries) {
    if (repoId === targetRepoId) {
      continue;
    }

    const affectedFiles: string[] = [];
    let maxSeverity: 'high' | 'medium' | 'low' = 'low';

    for (const imp of node.imports) {
      if (imp.resolvedRepo === targetRepoId) {
        // Check if any imported names are in the changed exports
        const hasChangedExport = imp.importedNames.some(
          (name: string) => changedExports.has(name) || changedExports.has('*'),
        );

        if (hasChangedExport) {
          affectedFiles.push(imp.file);
          if (imp.importedNames.includes('*')) {
            maxSeverity = 'high';
            hasBreakingPotential = true;
          } else if (
            imp.importedNames.some(
              (n: string) => n === 'default' || changedExports.has(n),
            )
          ) {
            maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
          }
        }
      }
    }

    if (affectedFiles.length > 0) {
      directlyAffected.push({
        repository: node.repository,
        affectedFiles: Array.from(new Set(affectedFiles)),
        impactSeverity: maxSeverity,
        dependencyType: 'direct',
        description: `${affectedFiles.length} file(s) import from changed files`,
      });
    }
  }

  // Find transitive dependencies (repos that depend on directly affected repos)
  const directlyAffectedIds = new Set(
    directlyAffected.map((a) => a.repository.id),
  );
  const repoEntriesForTransitive = Array.from(graph.repositories.entries());
  for (const [repoId, node] of repoEntriesForTransitive) {
    if (repoId === targetRepoId || directlyAffectedIds.has(repoId)) {
      continue;
    }

    const transitiveFiles: string[] = [];
    for (const imp of node.imports) {
      if (imp.resolvedRepo && directlyAffectedIds.has(imp.resolvedRepo)) {
        transitiveFiles.push(imp.file);
      }
    }

    if (transitiveFiles.length > 0) {
      indirectlyAffected.push({
        repository: node.repository,
        affectedFiles: Array.from(new Set(transitiveFiles)),
        impactSeverity: 'low',
        dependencyType: 'transitive',
        description: 'Depends on directly affected repositories',
      });
    }
  }

  return {
    directlyAffected,
    indirectlyAffected,
    totalReposAffected: directlyAffected.length + indirectlyAffected.length,
    hasBreakingPotential,
  };
}

/**
 * Get a simplified impact summary for display
 */
export function getImpactSummary(impactRadius: ImpactRadius): {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  color: string;
} {
  if (impactRadius.totalReposAffected === 0) {
    return {
      level: 'none',
      message: 'No cross-repository impact',
      color: 'text-gray-400',
    };
  }

  if (impactRadius.hasBreakingPotential) {
    return {
      level: 'critical',
      message: `Breaking changes may affect ${impactRadius.totalReposAffected} repository(s)`,
      color: 'text-red-400',
    };
  }

  if (impactRadius.directlyAffected.some((a) => a.impactSeverity === 'high')) {
    return {
      level: 'high',
      message: `High impact on ${impactRadius.directlyAffected.length} repository(s)`,
      color: 'text-orange-400',
    };
  }

  if (impactRadius.directlyAffected.length > 0) {
    return {
      level: 'medium',
      message: `Affects ${impactRadius.directlyAffected.length} repository(s)`,
      color: 'text-yellow-400',
    };
  }

  return {
    level: 'low',
    message: `Indirect impact on ${impactRadius.indirectlyAffected.length} repository(s)`,
    color: 'text-blue-400',
  };
}
