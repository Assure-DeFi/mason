'use client';

/**
 * AppShell Component
 *
 * Wrapper component that provides the sidebar navigation layout
 * for authenticated pages. Handles sidebar state and responsive behavior.
 */

import { useState, useCallback } from 'react';

import { AppSidebar } from './AppSidebar';
import { Breadcrumbs } from './Breadcrumbs';

interface AppShellProps {
  children: React.ReactNode;
  /** Whether to show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Page title to display in the header */
  pageTitle?: string;
  /** Optional header actions (buttons, etc.) */
  headerActions?: React.ReactNode;
}

export function AppShell({
  children,
  showBreadcrumbs = true,
  pageTitle,
  headerActions,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex min-h-screen bg-navy">
      {/* Sidebar */}
      <AppSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:ml-0">
        {/* Top header bar */}
        {(showBreadcrumbs || pageTitle || headerActions) && (
          <header className="sticky top-0 z-30 border-b border-gray-800 bg-navy/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-1">
                {showBreadcrumbs && <Breadcrumbs className="hidden sm:flex" />}
                {pageTitle && (
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    {pageTitle}
                  </h1>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center gap-2">{headerActions}</div>
              )}
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
