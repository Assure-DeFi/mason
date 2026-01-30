'use client';

/**
 * useUserDatabase Hook
 *
 * Manages the user's Supabase database connection state.
 * Provides connection status, configuration, and utility functions.
 *
 * Auto-loads credentials from central database on login if not in localStorage.
 * Validates credentials on mount with 1-hour caching to detect stale/revoked keys.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { TABLES } from '@/lib/constants';
import { getSupabase } from '@/lib/supabase/client';
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

// Validation cache configuration
const VALIDATION_CACHE_KEY = 'mason_connection_validated';
const VALIDATION_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface ValidationCache {
  isValid: boolean;
  timestamp: number;
  error?: string;
}

function getValidationCache(): ValidationCache | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const cached = localStorage.getItem(VALIDATION_CACHE_KEY);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as ValidationCache;
  } catch {
    return null;
  }
}

function setValidationCache(isValid: boolean, error?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const cache: ValidationCache = {
    isValid,
    timestamp: Date.now(),
    error,
  };
  localStorage.setItem(VALIDATION_CACHE_KEY, JSON.stringify(cache));
}

function clearValidationCache(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(VALIDATION_CACHE_KEY);
}

function isValidationCacheValid(cache: ValidationCache | null): boolean {
  if (!cache) {
    return false;
  }
  return Date.now() - cache.timestamp < VALIDATION_CACHE_DURATION_MS;
}

export interface UseUserDatabaseReturn {
  isConfigured: boolean;
  isSetupComplete: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isValid: boolean;
  validationError: string | null;
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
  revalidate: () => Promise<void>;
}

export function useUserDatabase(): UseUserDatabaseReturn {
  const { data: session, status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true); // Assume valid until proven otherwise
  const [validationError, setValidationError] = useState<string | null>(null);
  const [config, setConfig] = useState<MasonConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [hasFetchedFromCentral, setHasFetchedFromCentral] = useState(false);
  const validationInProgress = useRef(false);

  const loadConfig = useCallback(() => {
    const storedConfig = getMasonConfig();
    setConfig(storedConfig);
    setIsConfigured(hasUserDatabase());
    setSetupComplete(isSetupComplete());
  }, []);

  // Validate connection and update cache
  const validateConnection = useCallback(
    async (skipCache = false): Promise<void> => {
      const currentConfig = getMasonConfig();
      if (!currentConfig?.supabaseUrl || !currentConfig?.supabaseAnonKey) {
        setIsValid(true); // No config = nothing to validate
        return;
      }

      // Check cache first (unless skipping)
      if (!skipCache) {
        const cache = getValidationCache();
        if (cache && isValidationCacheValid(cache)) {
          setIsValid(cache.isValid);
          setValidationError(cache.error || null);
          return;
        }
      }

      // Prevent concurrent validation
      if (validationInProgress.current) {
        return;
      }
      validationInProgress.current = true;
      setIsValidating(true);

      try {
        const result = await testUserConnection(
          currentConfig.supabaseUrl,
          currentConfig.supabaseAnonKey,
        );

        setIsValid(result.success);
        setValidationError(result.error || null);
        setValidationCache(result.success, result.error);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Connection validation failed';
        setIsValid(false);
        setValidationError(errorMessage);
        setValidationCache(false, errorMessage);
      } finally {
        setIsValidating(false);
        validationInProgress.current = false;
      }
    },
    [],
  );

  // Load from localStorage on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Validate connection when config is loaded/changed (with caching)
  useEffect(() => {
    if (isConfigured && !isLoading) {
      void validateConnection();
    }
  }, [isConfigured, isLoading, validateConnection]);

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
          .from(TABLES.USERS)
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

    void fetchCredentialsFromCentral();
  }, [session, sessionStatus, hasFetchedFromCentral, loadConfig]);

  const saveConfigHandler = useCallback(
    (newConfig: MasonConfig) => {
      saveMasonConfig(newConfig);
      clearValidationCache(); // Clear cache since config changed
      loadConfig();
    },
    [loadConfig],
  );

  const clearConfigHandler = useCallback(() => {
    clearMasonConfig();
    clearUserClients();
    clearValidationCache();
    setIsValid(true);
    setValidationError(null);
    loadConfig();
  }, [loadConfig]);

  const revalidateHandler = useCallback(async () => {
    await validateConnection(true); // Skip cache
  }, [validateConnection]);

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
    isValidating,
    isValid,
    validationError,
    config,
    client,
    saveConfig: saveConfigHandler,
    clearConfig: clearConfigHandler,
    testConnection: testConnectionHandler,
    checkTables: checkTablesHandler,
    refresh: loadConfig,
    revalidate: revalidateHandler,
  };
}

export default useUserDatabase;
