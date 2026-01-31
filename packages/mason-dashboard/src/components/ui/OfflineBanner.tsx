'use client';

import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner Component
 *
 * Displays a persistent banner when the browser loses internet connectivity.
 * Uses Mason brand colors: Gold (#E2D243) for warning state.
 */
export function OfflineBanner() {
  return (
    <div
      className="flex items-center justify-center gap-2 bg-gold/20 border-b border-gold/50 px-4 py-2 text-gold"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        You are offline. Some features may be unavailable.
      </span>
    </div>
  );
}

export default OfflineBanner;
