'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Info,
  Zap,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import {
  getOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
  saveOAuthSession,
  setSelectedProject,
  clearOAuthSession,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import {
  listProjects,
  type SupabaseProject,
} from '@/lib/supabase/management-api';

type MigrationStatus = 'idle' | 'running' | 'success' | 'error';

interface MigrationState {
  status: MigrationStatus;
  message?: string;
}

// Loading fallback for Suspense
function DatabaseSettingsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

// Main page wrapper with Suspense for useSearchParams
export default function DatabaseSettingsPage() {
  return (
    <Suspense fallback={<DatabaseSettingsLoading />}>
      <DatabaseSettingsContent />
    </Suspense>
  );
}

function DatabaseSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { config, isConfigured, isLoading: isDbLoading } = useUserDatabase();

  const [databasePassword, setDatabasePassword] = useState('');
  const [migration, setMigration] = useState<MigrationState>({
    status: 'idle',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [hasOAuth, setHasOAuth] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Check for OAuth session on mount
  useEffect(() => {
    setHasOAuth(hasValidOAuthSession());
  }, []);

  // Fetch projects for the project selector
  const fetchProjectsForSelector = async (accessToken: string) => {
    setFetchingProjects(true);
    try {
      const projectList = await listProjects(accessToken);
      const activeProjects = projectList.filter(
        (p) => p.status === 'ACTIVE_HEALTHY' || p.status === 'ACTIVE_UNHEALTHY',
      );
      setProjects(activeProjects);
      if (activeProjects.length > 0) {
        setShowProjectSelector(true);
      } else {
        setOauthError('No active Supabase projects found');
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setOauthError('Failed to fetch Supabase projects');
    } finally {
      setFetchingProjects(false);
    }
  };

  // Handle OAuth callback from Supabase
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const oauthSuccess = searchParams.get('oauth_success');
      const oauthErrorParam = searchParams.get('oauth_error');

      if (oauthErrorParam) {
        setOauthError(decodeURIComponent(oauthErrorParam));
        router.replace('/settings/database');
        return;
      }

      if (oauthSuccess !== 'true') return;

      // Read tokens from cookie
      const tokenCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('supabase_oauth_tokens='));

      if (!tokenCookie) {
        router.replace('/settings/database');
        return;
      }

      try {
        const tokenData = JSON.parse(
          decodeURIComponent(tokenCookie.split('=')[1]),
        ) as SupabaseOAuthTokens;

        // Clear the cookie immediately
        document.cookie =
          'supabase_oauth_tokens=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

        // Save OAuth tokens
        saveOAuthSession({ tokens: tokenData });

        // Always fetch projects to ensure we have the current list
        const projectList = await listProjects(tokenData.accessToken);
        const activeProjects = projectList.filter(
          (p) =>
            p.status === 'ACTIVE_HEALTHY' || p.status === 'ACTIVE_UNHEALTHY',
        );

        if (activeProjects.length === 0) {
          setOauthError('No active Supabase projects found in your account');
          router.replace('/settings/database');
          return;
        }

        // Try to auto-detect current project from config
        let matchedProject: SupabaseProject | undefined;
        if (config?.supabaseUrl) {
          const urlMatch = config.supabaseUrl.match(
            /https:\/\/([^.]+)\.supabase\.co/,
          );
          if (urlMatch) {
            const configProjectRef = urlMatch[1];
            matchedProject = activeProjects.find(
              (p) => p.id === configProjectRef,
            );
          }
        }

        if (matchedProject) {
          // Auto-detected successfully - set and continue
          setSelectedProject(matchedProject.id, matchedProject.name);
          setHasOAuth(true);
          setOauthError(null);
          setMigration({
            status: 'success',
            message: `Connected to ${matchedProject.name}! You can now use one-click updates.`,
          });
        } else {
          // Auto-detection failed - show project selector
          setProjects(activeProjects);
          setShowProjectSelector(true);
          setHasOAuth(true); // We have valid OAuth, just need project selection
          setOauthError(null);
        }
      } catch (err) {
        console.error('Failed to process OAuth callback:', err);
        setOauthError('Failed to process OAuth response');
      }

      router.replace('/settings/database');
    };

    handleOAuthCallback();
  }, [searchParams, router, config?.supabaseUrl]);

  const handleConnectOAuth = () => {
    setOauthConnecting(true);
    setOauthError(null);
    // Redirect to OAuth login with return_to pointing back here
    window.location.href =
      '/api/auth/supabase/login?return_to=/settings/database';
  };

  const handleSelectProject = (project: SupabaseProject) => {
    // Check if user is selecting a different project than configured
    if (config?.supabaseUrl) {
      const existingRef = config.supabaseUrl.match(
        /https:\/\/([^.]+)\.supabase\.co/,
      )?.[1];
      if (existingRef && existingRef !== project.id) {
        const confirmSwitch = window.confirm(
          `Warning: You're selecting a different project than currently configured.\n\n` +
            `Current project: ${existingRef}\n` +
            `Selected project: ${project.name} (${project.id})\n\n` +
            `This will change where Mason stores your data. Continue?`,
        );
        if (!confirmSwitch) return;

        // If switching projects, warn about data access
        const confirmDataLoss = window.confirm(
          `IMPORTANT: Switching projects means your existing Mason data ` +
            `(backlog items, analysis runs, etc.) will not be accessible.\n\n` +
            `The old data remains in ${existingRef}, but Mason will now use ${project.id}.\n\n` +
            `Are you sure you want to switch?`,
        );
        if (!confirmDataLoss) return;
      }
    }

    // Update OAuth session with selected project
    setSelectedProject(project.id, project.name);
    setShowProjectSelector(false);
    setMigration({
      status: 'success',
      message: `Connected to ${project.name}! You can now use one-click updates.`,
    });
  };

  const handleRunMigrationsOAuth = async () => {
    const oauthSession = getOAuthSession();
    let accessToken = getAccessToken();

    // If no project selected, try to help user select one
    if (!oauthSession?.selectedProjectRef) {
      if (accessToken) {
        // We have OAuth tokens but no project selected - show selector
        await fetchProjectsForSelector(accessToken);
        return;
      } else {
        setMigration({
          status: 'error',
          message: 'No Supabase project selected. Please reconnect with OAuth.',
        });
        setShowManualFallback(true);
        return;
      }
    }

    // Validate consistency before making request
    if (config?.supabaseUrl) {
      const configRef = config.supabaseUrl.match(
        /https:\/\/([^.]+)\.supabase\.co/,
      )?.[1];
      if (configRef && configRef !== oauthSession.selectedProjectRef) {
        setMigration({
          status: 'error',
          message: `Configuration mismatch: OAuth session points to project "${oauthSession.selectedProjectRef}" but config points to "${configRef}". Please reconnect with OAuth.`,
        });
        setShowManualFallback(true);
        return;
      }
    }

    // If access token expired, try to refresh it
    if (!accessToken) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        setMigration({
          status: 'running',
          message: 'Refreshing OAuth session...',
        });
        try {
          const response = await fetch('/api/auth/supabase/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const newTokens = (await response.json()) as SupabaseOAuthTokens;
            updateTokens(newTokens);
            accessToken = newTokens.accessToken;
          } else {
            // Refresh failed - session is truly expired
            clearOAuthSession();
            setHasOAuth(false);
            setMigration({
              status: 'error',
              message:
                'OAuth session expired. Please reconnect with Supabase or use the manual method below.',
            });
            setShowManualFallback(true);
            return;
          }
        } catch (err) {
          console.error('Token refresh failed:', err);
          clearOAuthSession();
          setHasOAuth(false);
          setMigration({
            status: 'error',
            message:
              'Failed to refresh OAuth session. Please reconnect with Supabase or use the manual method below.',
          });
          setShowManualFallback(true);
          return;
        }
      } else {
        // No refresh token available
        clearOAuthSession();
        setHasOAuth(false);
        setMigration({
          status: 'error',
          message:
            'OAuth session expired. Please reconnect with Supabase or use the manual method below.',
        });
        setShowManualFallback(true);
        return;
      }
    }

    setMigration({ status: 'running', message: 'Running migrations...' });

    try {
      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: oauthSession.selectedProjectRef,
          accessToken,
          supabaseUrl: config?.supabaseUrl, // Include for server-side validation
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      setMigration({
        status: 'success',
        message:
          'Migrations completed successfully! Your database is up to date.',
      });
    } catch (err) {
      setMigration({
        status: 'error',
        message: err instanceof Error ? err.message : 'Migration failed',
      });
      setShowManualFallback(true);
    }
  };

  const handleRunMigrationsManual = async () => {
    if (!databasePassword) {
      setMigration({
        status: 'error',
        message: 'Database password is required to run migrations',
      });
      return;
    }

    if (!config?.supabaseUrl) {
      setMigration({
        status: 'error',
        message: 'Supabase URL not configured. Please complete setup first.',
      });
      return;
    }

    setMigration({ status: 'running', message: 'Running migrations...' });

    try {
      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: config.supabaseUrl,
          databasePassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      setMigration({
        status: 'success',
        message:
          'Migrations completed successfully! Your database is up to date.',
      });
      setDatabasePassword('');
    } catch (err) {
      setMigration({
        status: 'error',
        message: err instanceof Error ? err.message : 'Migration failed',
      });
    }
  };

  if (status === 'loading' || isDbLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/backlog"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Database Settings</h1>
            <p className="mt-1 text-gray-400">
              Manage your database connection and run schema updates
            </p>
          </div>

          {/* Connection Status */}
          <div className="mb-6 rounded-lg border border-gray-800 bg-black/50 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-gray-900 p-3">
                <Database className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  Database Connection
                </h2>
                {isConfigured ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-gray-300">Connected</span>
                      {hasOAuth && (
                        <span className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold">
                          OAuth
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-mono break-all">
                      {config?.supabaseUrl}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-gray-400">
                      Not configured.{' '}
                      <Link href="/setup" className="text-gold hover:underline">
                        Complete setup
                      </Link>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Re-run Migrations Section */}
          {isConfigured && (
            <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-gray-900 p-3">
                  <RefreshCw className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    Update Database Schema
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Run this after Mason updates to ensure your database has the
                    latest tables and columns.
                  </p>

                  {/* Info Box */}
                  <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                      <div className="text-sm text-gray-400">
                        <p>
                          This will apply any missing tables, indexes, and
                          policies to your database. Existing data is preserved.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* OAuth One-Click Button - hide when showing project selector */}
                  {hasOAuth &&
                    !showManualFallback &&
                    !showProjectSelector &&
                    !fetchingProjects && (
                      <div className="mt-4">
                        <button
                          onClick={handleRunMigrationsOAuth}
                          disabled={migration.status === 'running'}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-medium text-navy transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {migration.status === 'running' ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Running Migrations...
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              Update Database Schema (One-Click)
                            </>
                          )}
                        </button>
                        <p className="mt-2 text-center text-xs text-gray-500">
                          Using your connected Supabase OAuth session
                        </p>
                      </div>
                    )}

                  {/* Migration Status */}
                  {migration.status !== 'idle' && (
                    <div
                      className={`mt-4 rounded-lg p-4 ${
                        migration.status === 'running'
                          ? 'bg-blue-900/20 border border-blue-800'
                          : migration.status === 'success'
                            ? 'bg-green-900/20 border border-green-800'
                            : 'bg-red-900/20 border border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {migration.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        )}
                        {migration.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                        {migration.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span
                          className={`text-sm ${
                            migration.status === 'running'
                              ? 'text-blue-300'
                              : migration.status === 'success'
                                ? 'text-green-300'
                                : 'text-red-300'
                          }`}
                        >
                          {migration.message}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Project Selection UI */}
                  {showProjectSelector && projects.length > 0 && (
                    <div className="mt-4 space-y-3 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          Select Your Supabase Project
                        </h4>
                        <p className="mt-1 text-xs text-gray-400">
                          Choose the project where Mason should store your data.
                          {config?.supabaseUrl && (
                            <span className="text-gold">
                              {' '}
                              Your current project is highlighted.
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {projects.map((project) => {
                          const isCurrentProject =
                            config?.supabaseUrl?.includes(project.id);
                          return (
                            <button
                              key={project.id}
                              onClick={() => handleSelectProject(project)}
                              className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                                isCurrentProject
                                  ? 'border-gold bg-gold/10'
                                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {project.name}
                                  {isCurrentProject && (
                                    <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-xs text-gold">
                                      Current
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {project.region} &bull; {project.id}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {fetchingProjects && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading your Supabase projects...</span>
                    </div>
                  )}

                  {/* Manual Fallback Section */}
                  {(!hasOAuth || showManualFallback) && (
                    <div className="mt-6 border-t border-gray-800 pt-6">
                      {hasOAuth && showManualFallback && (
                        <div className="mb-4">
                          <p className="text-sm text-yellow-400">
                            OAuth method failed. Try the manual method below:
                          </p>
                          <button
                            onClick={() => {
                              setShowManualFallback(false);
                              setMigration({ status: 'idle' });
                              handleConnectOAuth();
                            }}
                            disabled={oauthConnecting}
                            className="mt-3 flex items-center gap-2 text-sm text-gold hover:underline"
                          >
                            {oauthConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Reconnecting...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Retry OAuth Connection
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* OAuth Connect Option - for users without OAuth session */}
                      {!hasOAuth && !showManualFallback && (
                        <div className="mb-6">
                          <p className="mb-3 text-sm text-gray-400">
                            Connect with Supabase OAuth for one-click schema
                            updates:
                          </p>
                          <button
                            onClick={handleConnectOAuth}
                            disabled={oauthConnecting}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-medium text-navy transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {oauthConnecting ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Database className="h-5 w-5" />
                                Connect with Supabase
                                <ExternalLink className="h-4 w-4" />
                              </>
                            )}
                          </button>
                          {oauthError && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              {oauthError}
                            </div>
                          )}
                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-black/50 px-2 text-gray-500">
                                Or use manual method
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Password Input */}
                      <div>
                        <label
                          htmlFor="db-password"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Database Password
                        </label>
                        <div className="relative mt-1">
                          <input
                            id="db-password"
                            type={showPassword ? 'text' : 'password'}
                            value={databasePassword}
                            onChange={(e) =>
                              setDatabasePassword(e.target.value)
                            }
                            placeholder="Enter your Supabase database password"
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                            disabled={migration.status === 'running'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Found in Supabase → Project Settings → Database →
                          Database password
                        </p>
                      </div>

                      {/* Security Notice */}
                      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          Your password is sent directly to your Supabase
                          instance and is never stored.
                        </span>
                      </div>

                      {/* Run Button */}
                      <button
                        onClick={handleRunMigrationsManual}
                        disabled={
                          !databasePassword || migration.status === 'running'
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {migration.status === 'running' ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Running Migrations...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5" />
                            Update Database Schema
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other Settings Links */}
          <div className="mt-6 rounded-lg border border-gray-800 bg-black/50 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Other Settings
            </h3>
            <div className="space-y-2">
              <Link
                href="/settings/api-keys"
                className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                API Keys
              </Link>
              <Link
                href="/settings/ai-providers"
                className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                AI Providers
              </Link>
              <Link
                href="/settings/github"
                className="block rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                GitHub Repositories
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PoweredByFooter />
    </div>
  );
}
