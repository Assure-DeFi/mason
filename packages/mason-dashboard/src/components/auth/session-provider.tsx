'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Global handler for unhandled promise rejections.
 * Catches silent failures from fire-and-forget operations (void Promise).
 * Logs errors with context for debugging and future error monitoring integration.
 */
function useUnhandledRejectionHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if this rejection was already handled
      const reason = event.reason;
      if (reason?.handled) {
        return;
      }

      // Extract error details
      const errorMessage =
        reason instanceof Error ? reason.message : String(reason);
      const errorStack = reason instanceof Error ? reason.stack : undefined;

      // Log with context for debugging
      console.error('[Unhandled Promise Rejection]', {
        message: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      });

      // Prevent default browser error logging (we've handled it)
      event.preventDefault();

      // For critical errors, we could show a toast notification here
      // Currently logging only - toast integration would be added separately
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, []);
}

export function SessionProvider({ children }: SessionProviderProps) {
  useUnhandledRejectionHandler();

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
