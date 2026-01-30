'use client';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin layout with error boundary protection.
 * Catches errors in any admin page and displays a recovery UI
 * instead of crashing the entire application.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ErrorBoundary context="Admin Dashboard">
      {children}
    </ErrorBoundary>
  );
}
