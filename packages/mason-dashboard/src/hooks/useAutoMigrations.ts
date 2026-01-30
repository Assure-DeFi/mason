'use client';

/**
 * useAutoMigrations Hook
 *
 * Automatically runs database migrations on site load when:
 * 1. User has a valid OAuth session with Supabase
 * 2. A project is selected
 * 3. Migrations haven't been run in the last 24 hours
 *
 * This ensures users always have the latest schema without manual intervention.
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';

// Note: STORAGE_KEYS was previously imported but not used - removed to fix lint
import {
  getOAuthSession,
  hasValidOAuthSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
  type SupabaseOAuthTokens,
} from '@/lib/supabase/oauth';
import { getMasonConfig } from '@/lib/supabase/user-client';

// How often to auto-run migrations (24 hours)
const MIGRATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Storage key for tracking last migration run
const LAST_MIGRATION_KEY = 'mason_last_auto_migration';

interface MigrationState {
  status: 'idle' | 'checking' | 'running' | 'success' | 'skipped' | 'error';
  message?: string;
}

export interface UseAutoMigrationsReturn {
  state: MigrationState;
  runNow: () => Promise<void>;
}

/**
 * Get the timestamp of the last auto-migration run
 */
function getLastMigrationTime(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const stored = localStorage.getItem(LAST_MIGRATION_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Set the timestamp of the last auto-migration run
 */
function setLastMigrationTime(timestamp: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(LAST_MIGRATION_KEY, timestamp.toString());
}

/**
 * Check if migrations should run based on time elapsed
 */
function shouldRunMigrations(): boolean {
  const lastRun = getLastMigrationTime();
  const now = Date.now();
  return now - lastRun > MIGRATION_INTERVAL_MS;
}

export function useAutoMigrations(): UseAutoMigrationsReturn {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<MigrationState>({ status: 'idle' });
  const [hasRun, setHasRun] = useState(false);

  const runMigrations = useCallback(async (force = false): Promise<void> => {
    // Check prerequisites
    if (!hasValidOAuthSession()) {
      setState({ status: 'skipped', message: 'No OAuth session' });
      return;
    }

    const oauthSession = getOAuthSession();
    if (!oauthSession?.selectedProjectRef) {
      setState({ status: 'skipped', message: 'No project selected' });
      return;
    }

    const config = getMasonConfig();
    if (!config?.supabaseUrl) {
      setState({ status: 'skipped', message: 'No Supabase configured' });
      return;
    }

    // Check if we should skip based on time (unless forced)
    if (!force && !shouldRunMigrations()) {
      setState({ status: 'skipped', message: 'Already ran recently' });
      return;
    }

    // Validate project ref matches config
    const configRef = config.supabaseUrl.match(
      /https:\/\/([^.]+)\.supabase\.co/,
    )?.[1];
    if (configRef && configRef !== oauthSession.selectedProjectRef) {
      setState({ status: 'skipped', message: 'Project mismatch' });
      return;
    }

    setState({ status: 'running', message: 'Updating schema...' });

    let accessToken = getAccessToken();

    // Try to refresh token if expired
    if (!accessToken) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
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
            setState({ status: 'skipped', message: 'Token refresh failed' });
            return;
          }
        } catch {
          setState({ status: 'skipped', message: 'Token refresh error' });
          return;
        }
      } else {
        setState({ status: 'skipped', message: 'No valid token' });
        return;
      }
    }

    try {
      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRef: oauthSession.selectedProjectRef,
          accessToken,
          supabaseUrl: config.supabaseUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      // Update last migration time
      setLastMigrationTime(Date.now());
      setState({ status: 'success', message: 'Schema updated' });
    } catch (err) {
      console.error('Auto-migration failed:', err);
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Migration failed',
      });
    }
  }, []);

  // Auto-run on mount when session is ready
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || hasRun) {
      return;
    }

    // Small delay to let other hooks initialize
    const timer = setTimeout(() => {
      setHasRun(true);
      void runMigrations();
    }, 1000);

    return () => clearTimeout(timer);
  }, [sessionStatus, hasRun, runMigrations]);

  return {
    state,
    runNow: () => runMigrations(true),
  };
}

export default useAutoMigrations;
