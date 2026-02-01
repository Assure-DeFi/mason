/**
 * Hook for cross-repository impact analysis
 *
 * Analyzes how changes in one repository might affect other connected repositories.
 */

import { Octokit } from '@octokit/rest';
import { useState, useEffect, useCallback } from 'react';

import { useGitHubToken } from '@/hooks/useGitHubToken';
import {
  buildCrossRepoGraph,
  calculateImpactRadius,
  type CrossRepoGraph,
  type ImpactRadius,
} from '@/lib/analysis/cross-repo-analyzer';
import type { GitHubRepository } from '@/types/auth';

interface UseCrossRepoAnalysisOptions {
  repositories: GitHubRepository[];
  targetRepoId?: string;
  changedFiles?: string[];
  enabled?: boolean;
}

interface UseCrossRepoAnalysisResult {
  graph: CrossRepoGraph | null;
  impactRadius: ImpactRadius | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCrossRepoAnalysis({
  repositories,
  targetRepoId,
  changedFiles = [],
  enabled = true,
}: UseCrossRepoAnalysisOptions): UseCrossRepoAnalysisResult {
  const { token } = useGitHubToken();
  const [graph, setGraph] = useState<CrossRepoGraph | null>(null);
  const [impactRadius, setImpactRadius] = useState<ImpactRadius | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const buildGraph = useCallback(async () => {
    if (!token || repositories.length < 2 || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const octokit = new Octokit({ auth: token });
      const newGraph = await buildCrossRepoGraph(octokit, repositories);
      setGraph(newGraph);

      // Calculate impact if we have a target repo and changed files
      if (targetRepoId && changedFiles.length > 0) {
        const impact = calculateImpactRadius(
          newGraph,
          targetRepoId,
          changedFiles,
        );
        setImpactRadius(impact);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to build graph'));
    } finally {
      setIsLoading(false);
    }
  }, [token, repositories, targetRepoId, changedFiles, enabled]);

  // Build graph when dependencies change
  useEffect(() => {
    if (enabled && repositories.length >= 2 && token) {
      void buildGraph();
    }
  }, [enabled, repositories.length, token, buildGraph]);

  // Recalculate impact when target or files change (if graph exists)
  useEffect(() => {
    if (graph && targetRepoId && changedFiles.length > 0) {
      const impact = calculateImpactRadius(graph, targetRepoId, changedFiles);
      setImpactRadius(impact);
    }
  }, [graph, targetRepoId, changedFiles]);

  const refresh = useCallback(async () => {
    await buildGraph();
  }, [buildGraph]);

  return {
    graph,
    impactRadius,
    isLoading,
    error,
    refresh,
  };
}
