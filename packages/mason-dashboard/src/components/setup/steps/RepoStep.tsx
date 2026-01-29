'use client';

import {
  Search,
  Lock,
  Unlock,
  GitBranch,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';


import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { createMasonUserRecord } from '@/lib/supabase/user-record';

import type { WizardStepProps } from '../SetupWizard';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
}

interface ConnectedRepo {
  id: string;
  github_repo_id: number;
  github_full_name: string;
}

export function RepoStep({ onNext, onBack }: WizardStepProps) {
  const { data: session } = useSession();
  const { client, isConfigured } = useUserDatabase();
  const { token: githubToken, hasToken } = useGitHubToken();

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const userRecordCreatedRef = useRef(false);

  // Ensure user record exists (fallback in case SupabaseConnectStep didn't create it)
  useEffect(() => {
    async function ensureUserRecord() {
      if (
        !isConfigured ||
        !client ||
        !session?.user ||
        userRecordCreatedRef.current
      ) {
        return;
      }

      userRecordCreatedRef.current = true;

      try {
        const result = await createMasonUserRecord(client, {
          github_id: session.user.github_id,
          github_username: session.user.github_username,
          github_email: session.user.github_email,
          github_avatar_url: session.user.github_avatar_url,
        });

        if (!result.success) {
          console.warn(
            'Failed to create user record in RepoStep:',
            result.error,
          );
        }
      } catch (err) {
        console.error('Error ensuring user record:', err);
      }
    }

    void ensureUserRecord();
  }, [isConfigured, client, session]);

  // Fetch repos using token from localStorage (not session)
  useEffect(() => {
    async function fetchRepos() {
      if (!hasToken || !githubToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          'https://api.github.com/user/repos?per_page=100&sort=updated',
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const data: GitHubRepo[] = await response.json();
        setRepos(data);
        setFilteredRepos(data);
      } catch (err) {
        console.error('Error fetching repos:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load repositories',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRepos();
  }, [hasToken, githubToken]);

  useEffect(() => {
    async function fetchConnectedRepos() {
      // Clear any previous DB errors when dependencies change
      setDbError(null);

      if (!isConfigured) {
        setDbError(
          'Database not configured. Please go back to step 2 to connect Supabase.',
        );
        return;
      }

      if (!client) {
        setDbError(
          'Database connection not ready. Please go back to step 2 and verify your connection.',
        );
        return;
      }

      if (!session?.user) {
        return;
      }

      try {
        const { data: userData, error: userError } = await client
          .from('mason_users')
          .select('id')
          .eq('github_id', session.user.github_id)
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          setDbError(
            'Could not connect to database. Please go back to step 2 and reconnect.',
          );
          return;
        }

        if (!userData) {
          setDbError(
            'User record not found. Please go back to step 2 and reconnect.',
          );
          return;
        }

        const { data: connected, error: repoError } = await client
          .from('mason_github_repositories')
          .select('id, github_repo_id, github_full_name')
          .eq('user_id', userData.id)
          .eq('is_active', true);

        if (repoError) {
          console.error('Error fetching connected repos:', repoError);
          setDbError(
            'Database connection error. Please go back to step 2 and verify your Supabase connection.',
          );
          return;
        }

        if (connected) {
          setConnectedRepos(connected);
        }
      } catch (err) {
        console.error('Error fetching connected repos:', err);
        setDbError(
          'Database connection error. Please go back to step 2 and verify your Supabase connection.',
        );
      }
    }

    void fetchConnectedRepos();
  }, [client, isConfigured, session]);

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

  const handleConnect = async (repo: GitHubRepo) => {
    if (!client || !session?.user) {
      setDbError(
        'Database not configured. Please go back to step 2 to connect Supabase.',
      );
      return;
    }

    setIsConnecting(repo.id);
    setError(null);

    try {
      const { data: userData, error: userError } = await client
        .from('mason_users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (userError || !userData) {
        setDbError(
          'User not found in database. Please go back to step 2 and reconnect.',
        );
        return;
      }

      const { data: existingRepo } = await client
        .from('mason_github_repositories')
        .select('id')
        .eq('github_repo_id', repo.id)
        .eq('user_id', userData.id)
        .single();

      if (existingRepo) {
        await client
          .from('mason_github_repositories')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existingRepo.id);
      } else {
        await client.from('mason_github_repositories').insert({
          user_id: userData.id,
          github_repo_id: repo.id,
          github_owner: repo.owner.login,
          github_name: repo.name,
          github_full_name: repo.full_name,
          github_default_branch: repo.default_branch,
          github_private: repo.private,
          github_clone_url: repo.clone_url,
          github_html_url: repo.html_url,
          is_active: true,
        });
      }

      setConnectedRepos((prev) => [
        ...prev,
        {
          id: existingRepo?.id || crypto.randomUUID(),
          github_repo_id: repo.id,
          github_full_name: repo.full_name,
        },
      ]);
    } catch (err) {
      console.error('Error connecting repo:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to connect repository',
      );
    } finally {
      setIsConnecting(null);
    }
  };

  const isRepoConnected = (repoId: number) =>
    connectedRepos.some((r) => r.github_repo_id === repoId);

  const hasConnectedRepo = connectedRepos.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Select Repository</h2>
        <p className="mt-1 text-gray-400">
          Choose a repository to analyze with Mason
        </p>
      </div>

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

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {dbError && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-400">{dbError}</p>
              <button
                onClick={onBack}
                className="mt-2 text-sm text-gold underline hover:no-underline"
              >
                Go back to fix Supabase connection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {searchQuery
              ? 'No repositories match your search'
              : 'No repositories found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredRepos.map((repo) => {
              const isConnected = isRepoConnected(repo.id);
              const isCurrentlyConnecting = isConnecting === repo.id;

              return (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-4"
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
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <Check className="h-4 w-4" />
                      Connected
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(repo)}
                      disabled={isCurrentlyConnecting}
                      className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isCurrentlyConnecting ? (
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

      {hasConnectedRepo && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-green-400">
          <Check className="h-4 w-4" />
          <span>
            {connectedRepos.length} repository connected to your database
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-900"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!hasConnectedRepo}
          className="flex-1 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default RepoStep;
