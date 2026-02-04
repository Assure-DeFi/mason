'use client';

/**
 * Breadcrumbs Component
 *
 * Displays the current page location in a hierarchical trail.
 * Automatically builds breadcrumbs from the current pathname.
 */

import { clsx } from 'clsx';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

interface BreadcrumbItem {
  title: string;
  href: string;
}

// Route title mappings
const routeTitles: Record<string, string> = {
  admin: 'Dashboard',
  backlog: 'Backlog',
  settings: 'Settings',
  database: 'Database',
  github: 'GitHub',
  'api-keys': 'API Keys',
  autopilot: 'Autopilot',
  docs: 'Documentation',
  faq: 'FAQ',
  security: 'Security',
  setup: 'Setup',
  analytics: 'Analytics',
};

interface BreadcrumbsProps {
  /** Optional custom breadcrumb items to override auto-generation */
  items?: BreadcrumbItem[];
  /** Whether to show the home icon */
  showHome?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function Breadcrumbs({
  items: customItems,
  showHome = true,
  className,
}: BreadcrumbsProps) {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    if (customItems) {
      return customItems;
    }

    // Auto-generate breadcrumbs from pathname
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const title = routeTitles[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      crumbs.push({
        title,
        href: currentPath,
      });
    }

    return crumbs;
  }, [pathname, customItems]);

  // Don't render if only one breadcrumb (we're at root level)
  if (breadcrumbs.length <= 1 && !showHome) {
    return null;
  }

  return (
    <nav
      className={clsx('flex items-center gap-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            href="/admin/backlog"
            className="flex items-center text-gray-500 hover:text-white transition-colors"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.length > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
          )}
        </>
      )}

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="text-gray-300 font-medium" aria-current="page">
                {crumb.title}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {crumb.title}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
