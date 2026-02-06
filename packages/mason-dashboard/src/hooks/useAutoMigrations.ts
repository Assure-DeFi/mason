'use client';

/**
 * useAutoMigrations Hook
 *
 * Automatically runs database migrations on every fresh page load when:
 * 1. User has a valid OAuth session with Supabase
 * 2. A project is selected
 *
 * This ensures users always have the latest schema without manual intervention.
 * Migrations are idempotent, so running them on every load is safe.
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

// Storage key for tracking last migration run (used for deduplication within same session)
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
function _getLastMigrationTime(): number {
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
 * Check if migrations have already run in this browser session
 * (prevents duplicate runs on same page load)
 */
function hasRunThisSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // Use sessionStorage to track within browser session only
  return sessionStorage.getItem('mason_migration_ran_this_session') === 'true';
}

/**
 * Mark that migrations have run this session
 */
function markRanThisSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem('mason_migration_ran_this_session', 'true');
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

    // Check if we already ran this session (unless forced)
    if (!force && hasRunThisSession()) {
      setState({ status: 'skipped', message: 'Already ran this session' });
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
        // API returns { error: { code, message } } - extract the message string
        const errorMsg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Migration failed';
        throw new Error(errorMsg);
      }

      // Mark as run this session and update last migration time for reference
      markRanThisSession();
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
