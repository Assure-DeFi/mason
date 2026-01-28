'use client';

/**
 * useGitHubToken Hook
 *
 * Manages GitHub access token storage in localStorage.
 * Automatically captures the token from the session during initial sign-in
 * and stores it locally for privacy.
 *
 * Privacy Model:
 * - Token is stored in localStorage only
 * - Token is passed once during OAuth callback via tempAccessToken
 * - After storage, token is cleared from session
 * - Central server never stores the token
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import {
  getGitHubToken,
  saveGitHubToken,
  clearGitHubToken,
  hasGitHubToken,
} from '@/lib/supabase/user-client';

export interface UseGitHubTokenReturn {
  token: string | null;
  hasToken: boolean;
  isLoading: boolean;
  clearToken: () => void;
  refresh: () => void;
}

export function useGitHubToken(): UseGitHubTokenReturn {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  const loadToken = useCallback(() => {
    const storedToken = getGitHubToken();
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  // Capture token from session during initial sign-in
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    // Check if there's a temp access token from fresh OAuth sign-in
    const tempToken = session?.user?.tempAccessToken;

    if (tempToken) {
      // Store the token locally
      saveGitHubToken(tempToken);
      setToken(tempToken);
      setIsLoading(false);
      // Note: The tempAccessToken will naturally disappear from subsequent
      // session reads since it's not persisted in the JWT
    } else {
      // Load existing token from localStorage
      loadToken();
    }
  }, [session, status, loadToken]);

  const clearTokenHandler = useCallback(() => {
    clearGitHubToken();
    setToken(null);
  }, []);

  return {
    token,
    hasToken: Boolean(token),
    isLoading: status === 'loading' || isLoading,
    clearToken: clearTokenHandler,
    refresh: loadToken,
  };
}

export default useGitHubToken;
