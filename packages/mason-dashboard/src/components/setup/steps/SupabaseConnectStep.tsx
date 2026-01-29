'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Database,
  Loader2,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';
import {
  getOAuthSession,
  saveOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
  getRefreshToken,
  setSelectedProject,
  getSelectedProject,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import {
  listProjects,
  checkMasonTablesExist,
  runMasonMigrations,
  getApiKeys,
  buildProjectUrl,
  type SupabaseProject,
} from '@/lib/supabase/management-api';
import { saveMasonConfig } from '@/lib/supabase/user-client';
import { useUserDatabase } from '@/hooks/useUserDatabase';

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
  const { refresh } = useUserDatabase();
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const [selectedProjectRef, setSelectedProjectRef] = useState<string | null>(
    null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(true);
  const [setupProgress, setSetupProgress] = useState<string | null>(null);

  // Check if OAuth is configured
  useEffect(() => {
    const checkOAuthConfig = async () => {
      try {
        const response = await fetch('/api/auth/supabase/login', {
          method: 'HEAD',
        });
        setOauthConfigured(response.status !== 500);
      } catch {
        setOauthConfigured(false);
      }
    };
    checkOAuthConfig();
  }, []);

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
        // Read tokens from cookie (set by callback)
        const tokenCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('supabase_oauth_tokens='));

        if (tokenCookie) {
          try {
            const tokenData = JSON.parse(
              decodeURIComponent(tokenCookie.split('=')[1]),
            ) as SupabaseOAuthTokens;

            // Save to localStorage
            saveOAuthSession({ tokens: tokenData });

            // Clear the cookie
            document.cookie =
              'supabase_oauth_tokens=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

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
      }
    };

    handleOAuthCallback();
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
        fetchProjects(accessToken);
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
      setConnection({
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to fetch projects',
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
    [connection.projects, refresh],
  );

  const handleRefreshToken = async () => {
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

  const isStepComplete = connection.status === 'success' && selectedProjectRef;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Connect to Supabase</h2>
        <p className="mt-1 text-gray-400">
          Connect Mason to your Supabase project with one click
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
          <div>
            <h3 className="font-medium text-white">Your Data, Your Database</h3>
            <p className="mt-1 text-sm text-gray-400">
              Mason stores all analysis data in YOUR Supabase project. We never
              have access to your code or data.
            </p>
          </div>
        </div>
      </div>

      {/* OAuth Connect Button */}
      {oauthConfigured && connection.status === 'idle' && (
        <button
          onClick={handleConnect}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gold bg-gold/10 px-6 py-4 font-medium text-gold transition-colors hover:bg-gold/20"
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
        <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
          <Check className="h-5 w-5" />
          <span>{connection.message}</span>
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

      {/* OAuth Not Configured - Show Advanced Setup */}
      {!oauthConfigured && connection.status === 'idle' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div className="text-sm text-yellow-200">
              <p className="font-medium">OAuth Not Configured</p>
              <p className="mt-1 text-yellow-200/80">
                Supabase OAuth is not configured on this instance. Please use
                the advanced setup below.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAdvanced(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            <Database className="h-4 w-4" />
            Use Advanced Setup
          </button>
        </div>
      )}

      {/* Advanced Setup Toggle (when OAuth is configured) */}
      {oauthConfigured && connection.status === 'idle' && (
        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-sm text-gray-400 hover:text-gray-300"
          >
            <span>Advanced: Manual Setup</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Advanced Setup Content */}
      {showAdvanced && (
        <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <p className="text-sm text-gray-400">
            If you prefer to set up manually or are using a self-hosted Supabase
            instance, you can use the legacy setup process.
          </p>
          <button
            onClick={() => {
              // Signal to parent to switch to legacy DatabaseStep
              // This is handled by the SetupWizard via a custom event or prop
              window.dispatchEvent(new CustomEvent('use-legacy-db-setup'));
            }}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Use Manual Credential Entry
          </button>
        </div>
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
