'use client';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

/**
 * Settings layout with error boundary protection.
 * Prevents settings page errors from crashing the entire app.
 */
export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ErrorBoundary context="Settings">
      {children}
    </ErrorBoundary>
  );
}
