'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, GitBranch, Settings } from 'lucide-react';
import Link from 'next/link';
import type { GitHubRepository } from '@/types/auth';

interface RepositorySelectorProps {
  value: string | null;
  onChange: (repositoryId: string | null) => void;
}

export function RepositorySelector({
  value,
  onChange,
}: RepositorySelectorProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/github/repositories');
      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories);

        // Auto-select first repo if none selected
        if (!value && data.repositories.length > 0) {
          onChange(data.repositories[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRepo = repositories.find((r) => r.id === value);

  if (isLoading) {
    return <div className="h-9 w-48 animate-pulse rounded-md bg-gray-800" />;
  }

  if (repositories.length === 0) {
    return (
      <Link
        href="/settings/github"
        className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:border-gray-600"
      >
        <Settings className="h-4 w-4" />
        Connect a repository
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm text-white hover:border-gray-600"
      >
        <GitBranch className="h-4 w-4 text-gray-400" />
        <span className="max-w-[150px] truncate">
          {selectedRepo?.github_full_name ?? 'Select repository'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md bg-black shadow-lg ring-1 ring-gray-800">
          <div className="py-1">
            {repositories.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  onChange(repo.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-900 ${
                  repo.id === value ? 'text-gold' : 'text-white'
                }`}
              >
                <GitBranch className="h-4 w-4 text-gray-400" />
                <span className="truncate">{repo.github_full_name}</span>
              </button>
            ))}

            <div className="border-t border-gray-800 px-4 py-2">
              <Link
                href="/settings/github"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
              >
                <Settings className="h-3 w-3" />
                Manage repositories
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
