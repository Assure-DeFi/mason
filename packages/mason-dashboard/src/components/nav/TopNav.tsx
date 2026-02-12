'use client';

import { clsx } from 'clsx';
import { LayoutList, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Backlog',
    href: '/admin/backlog',
    icon: LayoutList,
    match: (p) => p.startsWith('/admin/backlog'),
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    match: (p) => p.startsWith('/admin/analytics'),
  },
  {
    label: 'Settings',
    href: '/settings/database',
    icon: Settings,
    match: (p) => p.startsWith('/settings'),
  },
];

/**
 * Persistent top-level navigation bar.
 * Only renders when the user is authenticated and on an app page
 * (not on landing, signin, setup, or docs pages).
 */
export function TopNav() {
  const { status } = useSession();
  const pathname = usePathname();

  // Only show on authenticated app pages
  if (status !== 'authenticated') {
    return null;
  }

  const isAppPage =
    pathname.startsWith('/admin') || pathname.startsWith('/settings');
  if (!isAppPage) {
    return null;
  }

  return (
    <nav className="border-b border-gray-800 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex h-10 items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {isActive && <span className="sr-only">(current page)</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
