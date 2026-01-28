'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  GitBranch,
  Settings,
  Check,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import type { GitHubRepository } from '@/types/auth';

const STORAGE_KEY = 'mason-last-repository';

interface RepositorySelectorProps {
  value: string | null;
  onChange: (repositoryId: string | null) => void;
  /** Show compact "Using [repo]" format when single repo */
  compact?: boolean;
}

/**
 * Get last used repository from localStorage
 */
function getLastUsedRepository(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save last used repository to localStorage
 */
function saveLastUsedRepository(repoId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, repoId);
  } catch {
    // Ignore storage errors
  }
}

export function RepositorySelector({
  value,
  onChange,
  compact = false,
}: RepositorySelectorProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleChange = useCallback(
    (repoId: string) => {
      onChange(repoId);
      saveLastUsedRepository(repoId);
      setIsOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/github/repositories');
      if (!response.ok) {
        const errorText =
          response.status === 401
            ? 'GitHub authentication expired. Please reconnect.'
            : 'Failed to load repositories';
        setError(errorText);
        return;
      }

      const data = await response.json();
      setRepositories(data.repositories);

      // Smart auto-selection priority:
      // 1. If value already set, keep it
      // 2. Try last used repository from localStorage
      // 3. Fall back to first repository
      if (!value && data.repositories.length > 0) {
        const lastUsed = getLastUsedRepository();
        const lastUsedRepo = lastUsed
          ? data.repositories.find((r: GitHubRepository) => r.id === lastUsed)
          : null;

        if (lastUsedRepo) {
          onChange(lastUsedRepo.id);
        } else {
          onChange(data.repositories[0].id);
          saveLastUsedRepository(data.repositories[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setError('Unable to connect. Check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRepo = repositories.find((r) => r.id === value);

  if (isLoading) {
    return <div className="h-9 w-48 animate-pulse rounded-md bg-gray-800" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/30 px-3 py-2 text-sm">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-red-400">{error}</span>
        <button
          onClick={fetchRepositories}
          className="ml-1 p-1 text-gray-400 hover:text-white"
          title="Retry"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
    );
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

  // Compact mode for single repository - just show "Using [repo]" with optional change
  if (compact && repositories.length === 1 && selectedRepo) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <GitBranch className="h-4 w-4" />
        <span>Using</span>
        <span className="text-white font-medium">
          {selectedRepo.github_full_name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm text-white hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gold/50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <GitBranch className="h-4 w-4 text-gray-400" />
        <span className="max-w-[150px] truncate">
          {selectedRepo?.github_full_name ?? 'Select repository'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-64 rounded-md bg-black shadow-lg ring-1 ring-gray-800"
          role="listbox"
        >
          <div className="py-1">
            {repositories.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleChange(repo.id)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-900 ${
                  repo.id === value ? 'text-gold bg-gold/5' : 'text-white'
                }`}
                role="option"
                aria-selected={repo.id === value}
              >
                <GitBranch className="h-4 w-4 text-gray-400" />
                <span className="flex-1 truncate">{repo.github_full_name}</span>
                {repo.id === value && <Check className="h-4 w-4 text-gold" />}
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
