'use client';

import { X, Search, Lock, Unlock, GitBranch, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  listUserRepositories,
  type GitHubRepo,
} from '@/lib/github/client-side';

import { InstallMasonModal } from './install-mason-modal';

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (owner: string, name: string) => Promise<void>;
  connectedRepoIds: number[];
}

export function ConnectRepoModal({
  isOpen,
  onClose,
  onConnect,
  connectedRepoIds,
}: ConnectRepoModalProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [connectedRepoName, setConnectedRepoName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (isOpen) {
      void fetchRepos();
    }
  }, [isOpen]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredRepos(
      repos.filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query),
      ),
    );
  }, [searchQuery, repos]);

  // Use client-side GitHub API (token from localStorage)
  const fetchRepos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listUserRepositories();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setRepos(result.repositories);
      setFilteredRepos(result.repositories);
    } catch (err) {
      console.error('Error fetching repos:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load repositories',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (repo: GitHubRepo) => {
    setIsConnecting(repo.full_name);

    try {
      await onConnect(repo.owner, repo.name);
      // Show install modal after successful connection
      setConnectedRepoName(repo.full_name);
      setShowInstallModal(true);
    } catch (err) {
      console.error('Error connecting repo:', err);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleInstallModalClose = () => {
    setShowInstallModal(false);
    setConnectedRepoName(null);
    onClose();
  };

  if (!isOpen && !showInstallModal) {
    return null;
  }

  // Show install modal if active
  if (showInstallModal) {
    return (
      <InstallMasonModal
        isOpen={showInstallModal}
        onClose={handleInstallModalClose}
        repoName={connectedRepoName || undefined}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-navy shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-white">
            Connect a Repository
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-800 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-black py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4">
          {error && (
            <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          )}

          {!isLoading && !error && filteredRepos.length === 0 && (
            <div className="py-8 text-center text-gray-400">
              {searchQuery
                ? 'No repositories match your search'
                : 'No repositories found'}
            </div>
          )}

          {!isLoading && !error && filteredRepos.length > 0 && (
            <div className="space-y-2">
              {filteredRepos.map((repo) => {
                const isConnected = connectedRepoIds.includes(repo.id);

                return (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between rounded-lg bg-black p-3"
                  >
                    <div className="flex items-center gap-3">
                      {repo.private ? (
                        <Lock className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Unlock className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <span className="font-medium text-white">
                          {repo.full_name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <GitBranch className="h-3 w-3" />
                          <span>{repo.default_branch}</span>
                        </div>
                      </div>
                    </div>

                    {isConnected ? (
                      <span className="text-sm text-gray-500">Connected</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(repo)}
                        disabled={isConnecting === repo.full_name}
                        className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isConnecting === repo.full_name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
