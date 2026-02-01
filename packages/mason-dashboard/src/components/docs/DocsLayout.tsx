'use client';

import { clsx } from 'clsx';
import {
  Book,
  ChevronRight,
  Terminal,
  LayoutDashboard,
  Shield,
  Zap,
  Settings,
  Code,
  Menu,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';

import { LandingHeader } from '@/components/landing';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '/docs',
    icon: Book,
    children: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quickstart' },
      { title: 'Setup Guide', href: '/docs/setup' },
      { title: 'Your First Review', href: '/docs/first-review' },
    ],
  },
  {
    title: 'Commands',
    href: '/docs/commands',
    icon: Terminal,
    children: [
      { title: 'Overview', href: '/docs/commands' },
      { title: '/pm-review', href: '/docs/commands/pm-review' },
      { title: '/execute-approved', href: '/docs/commands/execute-approved' },
      { title: '/mason-update', href: '/docs/commands/mason-update' },
    ],
  },
  {
    title: 'Dashboard',
    href: '/docs/dashboard',
    icon: LayoutDashboard,
    children: [
      { title: 'Overview', href: '/docs/dashboard' },
      { title: 'Backlog Management', href: '/docs/dashboard/backlog' },
      { title: 'Item Details', href: '/docs/dashboard/items' },
      { title: 'Execution Tracking', href: '/docs/dashboard/execution' },
      { title: 'Settings', href: '/docs/dashboard/settings' },
    ],
  },
  {
    title: 'Concepts',
    href: '/docs/concepts',
    icon: Zap,
    children: [
      { title: 'How Mason Works', href: '/docs/concepts' },
      { title: 'Categories', href: '/docs/concepts/categories' },
      { title: 'Scoring System', href: '/docs/concepts/scoring' },
      { title: 'PRDs & Tasks', href: '/docs/concepts/prds' },
      { title: 'Banger Ideas', href: '/docs/concepts/bangers' },
    ],
  },
  {
    title: 'Privacy & Security',
    href: '/docs/privacy',
    icon: Shield,
    children: [
      { title: 'BYOD Architecture', href: '/docs/privacy' },
      { title: 'Data Isolation', href: '/docs/privacy/data' },
      { title: 'Authentication', href: '/docs/privacy/auth' },
    ],
  },
  {
    title: 'API Reference',
    href: '/docs/api',
    icon: Code,
    children: [
      { title: 'Overview', href: '/docs/api' },
      { title: 'Authentication', href: '/docs/api/auth' },
      { title: 'Backlog Endpoints', href: '/docs/api/backlog' },
      { title: 'Execution Endpoints', href: '/docs/api/execution' },
    ],
  },
  {
    title: 'Configuration',
    href: '/docs/config',
    icon: Settings,
    children: [
      { title: 'Configuration File', href: '/docs/config' },
      { title: 'Environment Variables', href: '/docs/config/env' },
    ],
  },
];

interface DocsLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function DocsLayout({ children, title, description }: DocsLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find current section and page
  const currentSection = useMemo(() => {
    for (const section of navigation) {
      if (section.children?.some((child) => child.href === pathname)) {
        return section;
      }
      if (section.href === pathname) {
        return section;
      }
    }
    return navigation[0];
  }, [pathname]);

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ title: 'Docs', href: '/docs' }];
    if (currentSection && currentSection.href !== '/docs') {
      crumbs.push({ title: currentSection.title, href: currentSection.href });
    }
    const currentPage = currentSection?.children?.find(
      (child) => child.href === pathname,
    );
    if (currentPage && currentPage.href !== currentSection?.href) {
      crumbs.push({ title: currentPage.title, href: currentPage.href });
    }
    return crumbs;
  }, [pathname, currentSection]);

  // Filter navigation based on search
  const filteredNav = useMemo(() => {
    if (!searchQuery) {
      return navigation;
    }
    const query = searchQuery.toLowerCase();
    return navigation
      .map((section) => ({
        ...section,
        children: section.children?.filter(
          (child) =>
            child.title.toLowerCase().includes(query) ||
            section.title.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (section) =>
          section.children?.length ||
          section.title.toLowerCase().includes(query),
      );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-navy">
      <LandingHeader />

      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {/* Mobile sidebar toggle */}
          <button
            type="button"
            className="fixed right-4 z-50 rounded-lg bg-gold p-3 text-navy shadow-lg lg:hidden fixed-bottom-safe gpu-accelerated"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Sidebar */}
          <aside
            className={clsx(
              'fixed inset-y-0 left-0 z-40 w-72 transform overflow-y-auto border-r border-gray-800 bg-navy pb-8 pt-20 transition-transform lg:static lg:translate-x-0 lg:pt-8',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {/* Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-800 bg-black/30 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/50"
                />
              </div>
            </div>

            {/* Navigation */}
            <nav className="px-2">
              {filteredNav.map((section) => (
                <div key={section.href} className="mb-4">
                  <Link
                    href={section.href}
                    className={clsx(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                      pathname === section.href ||
                        section.children?.some(
                          (child) => child.href === pathname,
                        )
                        ? 'bg-gold/10 text-gold'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white',
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {section.icon && <section.icon className="h-4 w-4" />}
                    {section.title}
                  </Link>
                  {section.children && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-800 pl-3">
                      {section.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-gold/10 text-gold'
                              : 'text-gray-500 hover:bg-white/5 hover:text-white',
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* External Links */}
            <div className="mt-8 border-t border-gray-800 px-4 pt-6">
              <a
                href="https://github.com/Assure-DeFi/mason"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                GitHub Repository
              </a>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 py-8 lg:pl-8">
            {/* Breadcrumbs */}
            <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-4 w-4" />}
                  <Link
                    href={crumb.href}
                    className={clsx(
                      'hover:text-white',
                      index === breadcrumbs.length - 1 && 'text-gray-300',
                    )}
                  >
                    {crumb.title}
                  </Link>
                </span>
              ))}
            </nav>

            {/* Page header */}
            {title && (
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {title}
                </h1>
                {description && (
                  <p className="mt-3 text-lg text-gray-400">{description}</p>
                )}
              </header>
            )}

            {/* Content */}
            <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-gold prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:rounded prose-code:bg-black/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-gold prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-gray-800">
              {children}
            </div>

            {/* Page navigation */}
            <nav className="mt-12 flex items-center justify-between border-t border-gray-800 pt-6">
              {(() => {
                const allPages = navigation.flatMap(
                  (section) => section.children || [],
                );
                const currentIndex = allPages.findIndex(
                  (page) => page.href === pathname,
                );
                const prevPage =
                  currentIndex > 0 ? allPages[currentIndex - 1] : null;
                const nextPage =
                  currentIndex < allPages.length - 1
                    ? allPages[currentIndex + 1]
                    : null;
                return (
                  <>
                    {prevPage ? (
                      <Link
                        href={prevPage.href}
                        className="group flex items-center gap-2 text-gray-400 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                        <span className="text-sm">{prevPage.title}</span>
                      </Link>
                    ) : (
                      <div />
                    )}
                    {nextPage ? (
                      <Link
                        href={nextPage.href}
                        className="group flex items-center gap-2 text-gray-400 hover:text-white"
                      >
                        <span className="text-sm">{nextPage.title}</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    ) : (
                      <div />
                    )}
                  </>
                );
              })()}
            </nav>
          </main>
        </div>
      </div>
    </div>
  );
}
