'use client';

/**
 * useNetworkStatus Hook
 *
 * Detects browser network connectivity using navigator.onLine and online/offline events.
 * Returns current online status for UI feedback and disabling mutations when offline.
 *
 * Usage:
 * ```tsx
 * const { isOnline } = useNetworkStatus();
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseNetworkStatusReturn {
  /** Whether the browser has network connectivity */
  isOnline: boolean;
  /** Whether the status has been determined (false during SSR) */
  isReady: boolean;
}

/**
 * Hook for detecting browser network connectivity status.
 *
 * Uses navigator.onLine for initial state and listens to online/offline events
 * for real-time updates when connectivity changes.
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  // Start with true to avoid flash of offline UI during SSR
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    // Set initial state from navigator.onLine
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      setIsReady(true);
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isReady,
  };
}

export default useNetworkStatus;
