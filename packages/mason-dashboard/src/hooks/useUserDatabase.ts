'use client';

/**
 * useUserDatabase Hook
 *
 * Manages the user's Supabase database connection state.
 * Provides connection status, configuration, and utility functions.
 */

import { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<MasonConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const loadConfig = useCallback(() => {
    setIsLoading(true);
    const storedConfig = getMasonConfig();
    setConfig(storedConfig);
    setIsConfigured(hasUserDatabase());
    setSetupComplete(isSetupComplete());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
