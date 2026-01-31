'use client';

import type { ReactNode } from 'react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

import { OfflineBanner } from './OfflineBanner';

interface NetworkStatusProviderProps {
  children: ReactNode;
}

/**
 * NetworkStatusProvider Component
 *
 * Wraps children and displays the OfflineBanner when network connectivity is lost.
 * Should be placed high in the component tree (inside SessionProvider in layout).
 */
export function NetworkStatusProvider({
  children,
}: NetworkStatusProviderProps) {
  const { isOnline, isReady } = useNetworkStatus();

  return (
    <>
      {isReady && !isOnline && <OfflineBanner />}
      {children}
    </>
  );
}

export default NetworkStatusProvider;
