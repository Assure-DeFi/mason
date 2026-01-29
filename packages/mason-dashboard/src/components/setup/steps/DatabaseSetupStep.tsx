'use client';

import {
  Database,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import {
  checkMasonTablesExist,
  runMasonMigrations,
  getApiKeys,
  buildProjectUrl,
} from '@/lib/supabase/management-api';
import {
  getAccessToken,
  getSelectedProject,
  getRefreshToken,
  getOAuthSession,
  saveOAuthSession,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import { saveMasonConfig } from '@/lib/supabase/user-client';

import type { WizardStepProps } from '../SetupWizard';


type SetupStatus =
  | 'checking'
  | 'tables_exist'
  | 'needs_setup'
  | 'running'
  | 'success'
  | 'error';

interface SetupState {
  status: SetupStatus;
  message?: string;
  missingTables?: string[];
}

export function DatabaseSetupStep({ onNext, onBack }: WizardStepProps) {
  const { refresh } = useUserDatabase();
  const [setup, setSetup] = useState<SetupState>({ status: 'checking' });
  const [apiKeysFetched, setApiKeysFetched] = useState(false);

  // Refresh access token if needed
  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    let accessToken = getAccessToken();

    if (!accessToken) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setSetup({
          status: 'error',
          message: 'Session expired. Please go back and reconnect.',
        });
        return null;
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
        accessToken = tokens.accessToken;
      } catch {
        setSetup({
          status: 'error',
          message: 'Session expired. Please go back and reconnect.',
        });
        return null;
      }
    }

    return accessToken;
  }, []);

  // Check if tables exist on mount
  useEffect(() => {
    const checkTables = async () => {
      const selectedProject = getSelectedProject();
      if (!selectedProject) {
        setSetup({
          status: 'error',
          message: 'No project selected. Please go back and select a project.',
        });
        return;
      }

      const accessToken = await ensureValidToken();
      if (!accessToken) {return;}

      try {
        const result = await checkMasonTablesExist(
          accessToken,
          selectedProject.ref,
        );

        if (result.exists) {
          // Tables already exist, fetch API keys and continue
          setSetup({ status: 'tables_exist', message: 'Database is ready!' });
          await fetchAndSaveCredentials(accessToken, selectedProject.ref);
        } else {
          setSetup({
            status: 'needs_setup',
            message: 'Ready to set up your database',
            missingTables: result.missing,
          });
        }
      } catch (err) {
        console.error('Failed to check tables:', err);
        setSetup({
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Failed to check database',
        });
      }
    };

    void checkTables();
  }, [ensureValidToken]);

  const fetchAndSaveCredentials = async (
    accessToken: string,
    projectRef: string,
  ) => {
    try {
      const keys = await getApiKeys(accessToken, projectRef);
      const projectUrl = buildProjectUrl(projectRef);

      // Save to Mason config
      saveMasonConfig({
        supabaseUrl: projectUrl,
        supabaseAnonKey: keys.anonKey,
        // Note: We don't store serviceRoleKey as it's not needed after setup
        setupComplete: false, // Will be set true after full wizard completion
      });

      refresh();
      setApiKeysFetched(true);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
      setSetup({
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to fetch API keys',
      });
    }
  };

  const handleRunMigrations = async () => {
    const selectedProject = getSelectedProject();
    if (!selectedProject) {
      setSetup({
        status: 'error',
        message: 'No project selected.',
      });
      return;
    }

    const accessToken = await ensureValidToken();
    if (!accessToken) {return;}

    setSetup({ status: 'running', message: 'Setting up database...' });

    try {
      const result = await runMasonMigrations(accessToken, selectedProject.ref);

      if (!result.success) {
        throw new Error(result.error || 'Migration failed');
      }

      // Migrations successful, now fetch API keys
      setSetup({ status: 'success', message: 'Database setup complete!' });
      await fetchAndSaveCredentials(accessToken, selectedProject.ref);
    } catch (err) {
      console.error('Migration failed:', err);
      setSetup({
        status: 'error',
        message: err instanceof Error ? err.message : 'Migration failed',
      });
    }
  };

  const handleRetry = () => {
    setSetup({ status: 'checking' });
    // Re-trigger the useEffect by changing state
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      void ensureValidToken().then((token) => {
        if (token) {
          void checkMasonTablesExist(token, selectedProject.ref).then((result) => {
            if (result.exists) {
              setSetup({
                status: 'tables_exist',
                message: 'Database is ready!',
              });
              void fetchAndSaveCredentials(token, selectedProject.ref);
            } else {
              setSetup({
                status: 'needs_setup',
                missingTables: result.missing,
              });
            }
          });
        }
      });
    }
  };

  const isStepComplete =
    (setup.status === 'success' || setup.status === 'tables_exist') &&
    apiKeysFetched;

  const selectedProject = getSelectedProject();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Database Setup</h2>
        <p className="mt-1 text-gray-400">
          {selectedProject
            ? `Setting up Mason tables in ${selectedProject.name}`
            : 'Preparing your database'}
        </p>
      </div>

      {/* Checking State */}
      {setup.status === 'checking' && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-8 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking database status...</span>
        </div>
      )}

      {/* Tables Already Exist */}
      {setup.status === 'tables_exist' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
            <Check className="h-5 w-5" />
            <span>{setup.message}</span>
          </div>
          {apiKeysFetched && (
            <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
              <Check className="h-5 w-5" />
              <span>API keys configured automatically</span>
            </div>
          )}
        </div>
      )}

      {/* Needs Setup */}
      {setup.status === 'needs_setup' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
              <div>
                <h3 className="font-medium text-white">
                  Database Setup Required
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Mason needs to create {setup.missingTables?.length || 0}{' '}
                  tables in your database to store analysis data.
                </p>
              </div>
            </div>
          </div>

          {setup.missingTables && setup.missingTables.length > 0 && (
            <div className="rounded-lg bg-gray-900/50 p-4">
              <p className="mb-2 text-sm text-gray-400">Tables to create:</p>
              <div className="flex flex-wrap gap-2">
                {setup.missingTables.map((table) => (
                  <span
                    key={table}
                    className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleRunMigrations}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 font-medium text-navy transition-opacity hover:opacity-90"
          >
            <Database className="h-4 w-4" />
            Set Up Database
          </button>
        </div>
      )}

      {/* Running Migrations */}
      {setup.status === 'running' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{setup.message}</span>
          </div>
          <div className="text-center text-sm text-gray-500">
            This usually takes 5-10 seconds...
          </div>
        </div>
      )}

      {/* Success State */}
      {setup.status === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
            <Check className="h-5 w-5" />
            <span>{setup.message}</span>
          </div>
          {apiKeysFetched && (
            <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-4 text-green-400">
              <Check className="h-5 w-5" />
              <span>API keys configured automatically</span>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {setup.status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-red-900/20 p-4 text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Setup Failed</p>
              <p className="mt-1 text-sm">{setup.message}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* What Gets Created */}
      {(setup.status === 'needs_setup' || setup.status === 'running') && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
          <h3 className="mb-2 font-medium text-white">What Gets Created</h3>
          <ul className="space-y-1 text-sm text-gray-400">
            <li>User and API key management tables</li>
            <li>Repository connection tracking</li>
            <li>Backlog items and analysis history</li>
            <li>Execution logs and results</li>
            <li>Row-level security policies for data isolation</li>
          </ul>
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

export default DatabaseSetupStep;
