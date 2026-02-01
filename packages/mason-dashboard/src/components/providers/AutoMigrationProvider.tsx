'use client';

/**
 * AutoMigrationProvider
 *
 * Wrapper component that runs database migrations automatically on page load.
 * This ensures all users have the latest schema without manual intervention.
 *
 * Migrations are idempotent (safe to run multiple times) and only run:
 * - Once per browser session (tracked in sessionStorage)
 * - When user has valid OAuth session with Supabase
 * - When a project is selected
 */

import { useAutoMigrations } from '@/hooks/useAutoMigrations';

interface AutoMigrationProviderProps {
  children: React.ReactNode;
}

export function AutoMigrationProvider({
  children,
}: AutoMigrationProviderProps) {
  // This hook automatically runs migrations when conditions are met
  // It's safe to call - it checks prerequisites and deduplicates
  useAutoMigrations();

  // This component is purely for side effects - just render children
  return <>{children}</>;
}

export default AutoMigrationProvider;
