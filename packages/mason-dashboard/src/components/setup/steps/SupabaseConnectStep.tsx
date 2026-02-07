'use client';

import {
  Database,
  Loader2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';
import {
  listProjects,
  checkMasonTablesExist,
  runMasonMigrations,
  getApiKeys,
  buildProjectUrl,
  type SupabaseProject,
} from '@/lib/supabase/management-api';
import {
  getOAuthSession,
  saveOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
  getRefreshToken,
  setSelectedProject,
  getSelectedProject,
  clearOAuthSession,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import { saveMasonConfig } from '@/lib/supabase/user-client';
import { createMasonUserRecord } from '@/lib/supabase/user-record';

import type { WizardStepProps } from '../SetupWizard';

type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'fetching_projects'
  | 'selecting'
  | 'setting_up'
  | 'success'
  | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  message?: string;
  projects?: SupabaseProject[];
}

export function SupabaseConnectStep({ onNext, onBack }: WizardStepProps) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { refresh, client, isConfigured: _isConfigured } = useUserDatabase();
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const [selectedProjectRef, setSelectedProjectRef] = useState<string | null>(
    null,
  );
  const [setupProgress, setSetupProgress] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const oauthSuccess = searchParams.get('oauth_success');
      const oauthError = searchParams.get('oauth_error');

      if (oauthError) {
        setConnection({
          status: 'error',
          message: decodeURIComponent(oauthError),
        });
        return;
      }

      if (oauthSuccess === 'true') {
        // Fetch tokens from httpOnly cookie via server endpoint
        try {
          const res = await fetch('/api/auth/supabase/session');
          if (!res.ok) {
            setConnection({
              status: 'error',
              message: 'Failed to retrieve OAuth session',
            });
            return;
          }
          const json = await res.json();
          const tokenData = json.data.tokens as SupabaseOAuthTokens;

          // Save to localStorage
          saveOAuthSession({ tokens: tokenData });

          // Clear the flag cookie
          document.cookie =
            'supabase_oauth_ready=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

          // Fetch projects
          await fetchProjects(tokenData.accessToken);
        } catch (err) {
          console.error('Failed to parse OAuth tokens:', err);
          setConnection({
            status: 'error',
            message: 'Failed to process OAuth response',
          });
        }
      }
    };

    void handleOAuthCallback();
  }, [searchParams]);

  // Check for existing session on mount
  useEffect(() => {
    if (hasValidOAuthSession()) {
      const accessToken = getAccessToken();
      const selectedProject = getSelectedProject();

      if (selectedProject) {
        setSelectedProjectRef(selectedProject.ref);
        setConnection({
          status: 'success',
          message: `Connected to ${selectedProject.name}`,
        });
      } else if (accessToken) {
        void fetchProjects(accessToken);
      }
    }
  }, []);

  const fetchProjects = async (accessToken: string) => {
    setConnection({ status: 'fetching_projects' });

    try {
      const projects = await listProjects(accessToken);

      if (projects.length === 0) {
        setConnection({
          status: 'error',
          message: 'No Supabase projects found. Please create a project first.',
        });
        return;
      }

      // Filter to only active projects
      const activeProjects = projects.filter(
        (p) => p.status === 'ACTIVE_HEALTHY' || p.status === 'ACTIVE_UNHEALTHY',
      );

      if (activeProjects.length === 0) {
        setConnection({
          status: 'error',
          message: 'No active Supabase projects found.',
        });
        return;
      }

      setConnection({
        status: 'selecting',
        projects: activeProjects,
      });
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setConnection({
        status: 'error',
        message:
          `Failed to fetch Supabase projects: ${errorMsg}. ` +
          'Try disconnecting and reconnecting Supabase, or check that your Supabase account has projects available.',
      });
    }
  };

  const handleConnect = () => {
    setConnection({ status: 'connecting' });
    window.location.href = '/api/auth/supabase/login';
  };

  const handleSelectProject = useCallback(
    async (project: SupabaseProject) => {
      setSelectedProjectRef(project.id);
      setSelectedProject(project.id, project.name);
      setConnection({
        status: 'setting_up',
        message: `Setting up ${project.name}...`,
        projects: connection.projects,
      });

      // Get access token
      const accessToken = getAccessToken();
      if (!accessToken) {
        setConnection({
          status: 'error',
          message: 'Session expired. Please reconnect.',
        });
        return;
      }

      try {
        // Step 1: Check if tables exist
        setSetupProgress('Checking database...');
        const tableCheck = await checkMasonTablesExist(accessToken, project.id);

        // Step 2: Run migrations if needed
        if (!tableCheck.exists) {
          setSetupProgress('Creating tables...');
          const migrationResult = await runMasonMigrations(
            accessToken,
            project.id,
          );
          if (!migrationResult.success) {
            throw new Error(migrationResult.error || 'Migration failed');
          }
        }

        // Step 3: Fetch API keys
        setSetupProgress('Fetching credentials...');
        const keys = await getApiKeys(accessToken, project.id);
        const projectUrl = buildProjectUrl(project.id);

        // Step 4: Save Mason config
        saveMasonConfig({
          supabaseUrl: projectUrl,
          supabaseAnonKey: keys.anonKey,
          setupComplete: false, // Will be set true after full wizard completion
        });
        refresh();

        // Step 5: Create user record in mason_users (now that DB is configured)
        if (session?.user) {
          setSetupProgress('Creating user record...');
          // Need to create a new client with the fresh config
          const { createClient } = await import('@supabase/supabase-js');
          const freshClient = createClient(projectUrl, keys.anonKey);
          const userResult = await createMasonUserRecord(freshClient, {
            github_id: session.user.github_id,
            github_username: session.user.github_username,
            github_email: session.user.github_email,
            github_avatar_url: session.user.github_avatar_url,
          });
          if (!userResult.success) {
            console.warn('Failed to create user record:', userResult.error);
            // Don't fail the step, just log the warning - RepoStep will retry
          }
        }

        setSetupProgress(null);
        setConnection({
          status: 'success',
          message: `Connected to ${project.name}`,
          projects: connection.projects,
        });
      } catch (err) {
        console.error('Setup failed:', err);
        setSetupProgress(null);
        setConnection({
          status: 'error',
          message: err instanceof Error ? err.message : 'Setup failed',
        });
      }
    },
    [connection.projects, refresh, session],
  );

  const _handleRefreshToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      setConnection({
        status: 'error',
        message: 'Session expired. Please reconnect.',
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/supabase/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = (await response.json()) as SupabaseOAuthTokens;
      const session = getOAuthSession();
      if (session) {
        saveOAuthSession({ ...session, tokens });
      }

      // Retry fetching projects
      await fetchProjects(tokens.accessToken);
    } catch (err) {
      setConnection({
        status: 'error',
        message: 'Session expired. Please reconnect.',
      });
    }
  };

  const handleVerifyConnection = async () => {
    const previousMessage = connection.message;
    setConnection({ status: 'setting_up', message: 'Verifying connection...' });

    try {
      if (!client) {
        throw new Error('Database client not available');
      }

      const { error } = await client.from(TABLES.USERS).select('id').limit(1);

      if (error) {
        throw error;
      }

      setConnection({
        status: 'success',
        message: previousMessage || 'Connection verified',
      });
    } catch (err) {
      console.error('Connection verification failed:', err);
      setConnection({
        status: 'error',
        message: 'Connection failed. Please reconnect.',
      });
    }
  };

  const handleUseDifferentProject = () => {
    clearOAuthSession();
    // Also clear Mason config to prevent stale state
    localStorage.removeItem('mason-config');
    setSelectedProjectRef(null);
    setConnection({ status: 'idle' });
    refresh();
  };

  const isStepComplete = connection.status === 'success' && selectedProjectRef;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Connect to Supabase</h2>
        <p className="mt-1 text-gray-400">
          Connect Mason to your Supabase project with one click
        </p>
      </div>

      {/* New Project Warning */}
      <div className="rounded-lg border-2 border-gold bg-gold/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-gold" />
          <div>
            <h3 className="text-base font-bold text-gold">
              Create a NEW Supabase Project for Mason
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              Mason needs its own dedicated database. Do NOT use an existing
              project that has other data in it.{' '}
              <a
                href="https://supabase.com/dashboard/new/_"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-gold underline hover:opacity-80"
              >
                Create a free project now
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <p className="flex items-center gap-2 text-xs text-gray-500">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          <span className="font-medium text-gray-400">
            Your Data, Your Database
          </span>{' '}
          &mdash; Mason stores all analysis data in YOUR Supabase project. We
          never have access to your code or data.
        </span>
      </p>

      {/* OAuth Connect Button - Always shown when idle */}
      {connection.status === 'idle' && (
        <button
          onClick={handleConnect}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-gold px-6 py-4 font-medium text-navy transition-colors hover:opacity-90"
        >
          <Database className="h-5 w-5" />
          Connect to Supabase
          <ExternalLink className="h-4 w-4" />
        </button>
      )}

      {/* Connecting State */}
      {connection.status === 'connecting' && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-6 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting to Supabase...</span>
        </div>
      )}

      {/* Fetching Projects State */}
      {connection.status === 'fetching_projects' && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-6 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Fetching your projects...</span>
        </div>
      )}

      {/* Setting Up Database State */}
      {connection.status === 'setting_up' && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-6 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{setupProgress || 'Setting up database...'}</span>
          </div>
          <p className="text-center text-sm text-gray-500">
            This usually takes 5-10 seconds
          </p>
        </div>
      )}

      {/* Project Selection */}
      {connection.status === 'selecting' && connection.projects && (
        <div className="space-y-4">
          <h3 className="font-medium text-white">Select a Project</h3>
          <p className="text-sm text-gray-400">
            Pick the project you created for Mason. Don&apos;t see it?{' '}
            <a
              href="https://supabase.com/dashboard/new/_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:underline"
            >
              Create a new one
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            and refresh.
          </p>
          <div className="grid gap-3">
            {connection.projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  selectedProjectRef === project.id
                    ? 'border-gold bg-gold/10'
                    : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                }`}
              >
                <div>
                  <p className="font-medium text-white">{project.name}</p>
                  <p className="text-sm text-gray-400">
                    {project.region} - {project.id}
                  </p>
                </div>
                {selectedProjectRef === project.id && (
                  <Check className="h-5 w-5 text-gold" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success State */}
      {connection.status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
            <Check className="h-5 w-5" />
            <span>{connection.message}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleVerifyConnection}
              className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-900"
            >
              <RefreshCw className="h-4 w-4" />
              Verify Connection
            </button>
            <button
              onClick={handleUseDifferentProject}
              className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Use Different Project
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {connection.status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-4 text-red-400">
            <X className="h-5 w-5" />
            <span>{connection.message}</span>
          </div>
          <button
            onClick={handleConnect}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Manual Setup - Hidden as small text link */}
      {connection.status === 'idle' && (
        <p className="text-center text-xs text-gray-500">
          Having trouble?{' '}
          <button
            onClick={() => {
              // Signal to parent to switch to legacy DatabaseStep
              window.dispatchEvent(new CustomEvent('use-legacy-db-setup'));
            }}
            className="underline transition-colors hover:text-gray-400"
          >
            Use manual setup
          </button>
        </p>
      )}

      {/* Navigation */}
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
          disabled={!isStepComplete}
          className="flex-1 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default SupabaseConnectStep;
