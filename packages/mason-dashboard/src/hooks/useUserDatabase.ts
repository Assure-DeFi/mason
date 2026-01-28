'use client';

/**
 * useUserDatabase Hook
 *
 * Manages the user's Supabase database connection state.
 * Provides connection status, configuration, and utility functions.
 *
 * Auto-loads credentials from central database on login if not in localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  type MasonConfig,
  getMasonConfig,
  saveMasonConfig,
  clearMasonConfig,
  hasUserDatabase,
  isSetupComplete,
  getUserSupabase,
  testUserConnection,
  checkTablesExist,
  clearUserClients,
} from '@/lib/supabase/user-client';
import { getSupabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UseUserDatabaseReturn {
  isConfigured: boolean;
  isSetupComplete: boolean;
  isLoading: boolean;
  config: MasonConfig | null;
  client: SupabaseClient | null;

  saveConfig: (config: MasonConfig) => void;
  clearConfig: () => void;
  testConnection: (
    url: string,
    anonKey: string,
  ) => Promise<{ success: boolean; error?: string }>;
  checkTables: (
    url: string,
    serviceKey: string,
  ) => Promise<{ exists: boolean; missing: string[] }>;
  refresh: () => void;
}

export function useUserDatabase(): UseUserDatabaseReturn {
  const { data: session, status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<MasonConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [hasFetchedFromCentral, setHasFetchedFromCentral] = useState(false);

  const loadConfig = useCallback(() => {
    const storedConfig = getMasonConfig();
    setConfig(storedConfig);
    setIsConfigured(hasUserDatabase());
    setSetupComplete(isSetupComplete());
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Auto-fetch credentials from central database if user is logged in
  // but localStorage doesn't have credentials
  useEffect(() => {
    async function fetchCredentialsFromCentral() {
      // Only run if:
      // 1. Session is authenticated
      // 2. localStorage doesn't have credentials
      // 3. We haven't already tried fetching
      if (
        sessionStatus !== 'authenticated' ||
        !session?.user?.github_id ||
        hasUserDatabase() ||
        hasFetchedFromCentral
      ) {
        setIsLoading(false);
        return;
      }

      setHasFetchedFromCentral(true);

      try {
        const centralClient = getSupabase();
        const { data: userData, error } = await centralClient
          .from('mason_users')
          .select('supabase_url, supabase_anon_key')
          .eq('github_id', session.user.github_id)
          .single();

        if (error || !userData?.supabase_url || !userData?.supabase_anon_key) {
          // No credentials in central DB - user needs to complete setup
          setIsLoading(false);
          return;
        }

        // Save to localStorage and reload config
        saveMasonConfig({
          supabaseUrl: userData.supabase_url,
          supabaseAnonKey: userData.supabase_anon_key,
          setupComplete: true,
        });

        loadConfig();
      } catch (err) {
        console.error('Failed to fetch credentials from central DB:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredentialsFromCentral();
  }, [session, sessionStatus, hasFetchedFromCentral, loadConfig]);

  const saveConfigHandler = useCallback(
    (newConfig: MasonConfig) => {
      saveMasonConfig(newConfig);
      loadConfig();
    },
    [loadConfig],
  );

  const clearConfigHandler = useCallback(() => {
    clearMasonConfig();
    clearUserClients();
    loadConfig();
  }, [loadConfig]);

  const testConnectionHandler = useCallback(
    async (
      url: string,
      anonKey: string,
    ): Promise<{ success: boolean; error?: string }> => {
      return testUserConnection(url, anonKey);
    },
    [],
  );

  const checkTablesHandler = useCallback(
    async (
      url: string,
      serviceKey: string,
    ): Promise<{ exists: boolean; missing: string[] }> => {
      return checkTablesExist(url, serviceKey);
    },
    [],
  );

  let client: SupabaseClient | null = null;
  if (isConfigured && !isLoading) {
    try {
      client = getUserSupabase();
    } catch {
      client = null;
    }
  }

  return {
    isConfigured,
    isSetupComplete: setupComplete,
    isLoading,
    config,
    client,
    saveConfig: saveConfigHandler,
    clearConfig: clearConfigHandler,
    testConnection: testConnectionHandler,
    checkTables: checkTablesHandler,
    refresh: loadConfig,
  };
}

export default useUserDatabase;
