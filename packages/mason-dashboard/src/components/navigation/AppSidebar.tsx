'use client';

/**
 * AppSidebar Component
 *
 * Persistent navigation sidebar for authenticated pages.
 * Features collapsible mobile drawer, active state indicators,
 * and user menu integration.
 */

import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Settings,
  Key,
  Database,
  Github,
  Bot,
  Menu,
  X,
  ChevronRight,
  FileText,
  HelpCircle,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MasonMark } from '@/components/brand';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: 'Backlog',
    href: '/admin/backlog',
    icon: LayoutDashboard,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { title: 'Database', href: '/settings/database' },
      { title: 'GitHub', href: '/settings/github' },
      { title: 'API Keys', href: '/settings/api-keys' },
      { title: 'Autopilot', href: '/settings/autopilot' },
    ],
  },
];

const secondaryNavigation = [
  {
    title: 'Documentation',
    href: '/docs',
    icon: FileText,
  },
  {
    title: 'FAQ',
    href: '/faq',
    icon: HelpCircle,
  },
  {
    title: 'Security',
    href: '/security',
    icon: Shield,
  },
];

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, children?: { href: string }[]) => {
    if (pathname === href) {
      return true;
    }
    if (children?.some((child) => pathname === child.href)) {
      return true;
    }
    // Check for nested routes
    if (href !== '/' && pathname.startsWith(href)) {
      return true;
    }
    return false;
  };

  const isChildActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Mobile toggle button */}
      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 rounded-full bg-gold p-4 text-navy shadow-lg lg:hidden"
        onClick={onToggle}
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-800 bg-navy transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-4">
          <Link href="/admin/backlog" className="flex items-center gap-2">
            <MasonMark size="sm" />
            <span className="text-lg font-bold text-white">Mason</span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href, item.children)
                      ? 'bg-gold/10 text-gold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                  {item.children && (
                    <ChevronRight
                      className={clsx(
                        'ml-auto h-4 w-4 transition-transform',
                        isActive(item.href, item.children) && 'rotate-90',
                      )}
                    />
                  )}
                </Link>

                {/* Children */}
                {item.children && isActive(item.href, item.children) && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-gray-800 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                          isChildActive(child.href)
                            ? 'bg-gold/10 text-gold'
                            : 'text-gray-500 hover:bg-white/5 hover:text-white',
                        )}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Secondary Navigation */}
          <div className="mt-8 border-t border-gray-800 pt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Resources
            </p>
            <div className="space-y-1">
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-gold/10 text-gold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Mason PM
          </p>
        </div>
      </aside>
    </>
  );
}

// Icon mapping for settings pages
export const settingsIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  database: Database,
  github: Github,
  'api-keys': Key,
  autopilot: Bot,
};
