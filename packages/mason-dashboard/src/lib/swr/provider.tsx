'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';

import { swrConfig } from './config';

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * SWR Provider for Mason dashboard
 *
 * Wraps the app with SWR configuration for:
 * - Consistent caching behavior across components
 * - Automatic revalidation on focus/reconnect
 * - Error retry with backoff
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
