'use client';

import {
  GitBranch,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { GitHubRepository } from '@/types/auth';

interface RepositoryListProps {
  onDisconnect?: (repository: GitHubRepository) => void;
}

export function RepositoryList({ onDisconnect }: RepositoryListProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github/repositories');

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();
      setRepositories(data.data?.repositories ?? []);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setError('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRepositories();
  }, []);

  const handleDisconnect = async (repository: GitHubRepository) => {
    setDisconnectingId(repository.id);

    try {
      const response = await fetch(
        `/api/github/repositories?id=${repository.id}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect repository');
      }

      setRepositories((prev) => prev.filter((r) => r.id !== repository.id));
      onDisconnect?.(repository);
    } catch (err) {
      console.error('Error disconnecting repository:', err);
      setError('Failed to disconnect repository');
    } finally {
      setDisconnectingId(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchRepositories}
          className="mt-2 flex items-center gap-2 text-sm text-red-300 hover:text-red-200"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-800" />
        ))}
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
        <GitBranch className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">No repositories connected</p>
        <p className="text-sm text-gray-500">
          Connect a repository to start executing improvements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {repositories.map((repo) => (
        <div
          key={repo.id}
          className="flex items-center justify-between rounded-lg bg-black p-4"
        >
          <div className="flex items-center gap-3">
            {repo.github_private ? (
              <Lock className="h-5 w-5 text-gray-400" />
            ) : (
              <Unlock className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {repo.github_full_name}
                </span>
                <a
                  href={repo.github_html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <GitBranch className="h-3 w-3" />
                <span>{repo.github_default_branch}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDisconnect(repo)}
            disabled={disconnectingId === repo.id}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-50"
          >
            {disconnectingId === repo.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Disconnect
          </button>
        </div>
      ))}
    </div>
  );
}
