'use client';

import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';

interface ConnectionWarningBannerProps {
  error: string | null;
  isValidating: boolean;
  onRevalidate: () => void;
}

/**
 * Banner shown when Supabase credentials are invalid or revoked.
 * Provides user feedback and self-service recovery options.
 */
export function ConnectionWarningBanner({
  error,
  isValidating,
  onRevalidate,
}: ConnectionWarningBannerProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-yellow-600/50 bg-yellow-900/20 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
        <div>
          <div className="font-medium text-yellow-300">
            Database Connection Issue
          </div>
          <div className="mt-1 text-sm text-yellow-200/80">
            {error || 'Your Supabase credentials may be invalid or revoked.'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRevalidate}
          disabled={isValidating}
          className="flex items-center gap-1.5 rounded-md bg-yellow-800/50 px-3 py-1.5 text-sm text-yellow-200 transition-colors hover:bg-yellow-800/70 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`}
          />
          {isValidating ? 'Checking...' : 'Retry'}
        </button>

        <Link
          href="/settings/database"
          className="flex items-center gap-1.5 rounded-md bg-yellow-700/50 px-3 py-1.5 text-sm text-yellow-100 transition-colors hover:bg-yellow-700/70"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
