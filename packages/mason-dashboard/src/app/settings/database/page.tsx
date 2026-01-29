'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Link from 'next/link';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import {
  getOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
} from '@/lib/supabase/oauth';

type MigrationStatus = 'idle' | 'running' | 'success' | 'error';

interface MigrationState {
  status: MigrationStatus;
  message?: string;
}

export default function DatabaseSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { config, isConfigured, isLoading: isDbLoading } = useUserDatabase();

  const [databasePassword, setDatabasePassword] = useState('');
  const [migration, setMigration] = useState<MigrationState>({ status: 'idle' });
  const [showPassword, setShowPassword] = useState(false);
  const [hasOAuth, setHasOAuth] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Check for OAuth session on mount
  useEffect(() => {
    setHasOAuth(hasValidOAuthSession());
  }, []);

  const handleRunMigrationsOAuth = async () => {
    const oauthSession = getOAuthSession();
    const accessToken = getAccessToken();

    if (!oauthSession?.selectedProjectRef || !accessToken) {
      setMigration({
        status: 'error',
        message: 'OAuth session expired. Please use the manual method below.',
      });
      setShowManualFallback(true);
      return;
    }

    setMigration({ status: 'running', message: 'Running migrations...' });

    try {
      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: oauthSession.selectedProjectRef,
          accessToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      setMigration({
        status: 'success',
        message: 'Migrations completed successfully! Your database is up to date.',
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
        message: 'Migrations completed successfully! Your database is up to date.',
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

                  {/* OAuth One-Click Button */}
                  {hasOAuth && !showManualFallback && (
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

                  {/* Manual Fallback Section */}
                  {(!hasOAuth || showManualFallback) && (
                    <div className="mt-6 border-t border-gray-800 pt-6">
                      {hasOAuth && showManualFallback && (
                        <p className="mb-4 text-sm text-yellow-400">
                          OAuth method failed. Try the manual method below:
                        </p>
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
                            onChange={(e) => setDatabasePassword(e.target.value)}
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
                          Found in Supabase → Project Settings → Database → Database
                          password
                        </p>
                      </div>

                      {/* Security Notice */}
                      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          Your password is sent directly to your Supabase instance
                          and is never stored.
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
