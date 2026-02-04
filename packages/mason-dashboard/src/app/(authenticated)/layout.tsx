'use client';

/**
 * Authenticated Layout
 *
 * This layout wraps all authenticated pages with the AppShell component,
 * providing consistent sidebar navigation. Pages can manage their own
 * headers and breadcrumbs through AppShell props or by rendering their own.
 *
 * Used by:
 * - /admin/* routes (backlog, analytics)
 * - /settings/* routes (database, github, api-keys, autopilot)
 */

import { AppShell } from '@/components/navigation/AppShell';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // showBreadcrumbs=false allows pages with custom headers to render their own
  // Pages like backlog have complex headers that need more control
  return (
    <AppShell showBreadcrumbs={false}>
      {children}
    </AppShell>
  );
}
