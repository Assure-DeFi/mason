'use client';

import {
  Key,
  Database,
  GitBranch,
  Bot,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { canAccessAutopilot } from '@/lib/feature-flags';

interface SettingsNavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Key;
  /** If set, item only shown when this returns true */
  gate?: (email: string | null | undefined) => boolean;
  badge?: string;
}

const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/settings/github',
    label: 'Repositories',
    description: 'Manage connected GitHub repos',
    icon: GitBranch,
  },
  {
    href: '/settings/api-keys',
    label: 'API Keys',
    description: 'CLI authentication tokens',
    icon: Key,
  },
  {
    href: '/settings/database',
    label: 'Database',
    description: 'Supabase connection & schema',
    icon: Database,
  },
  {
    href: '/settings/autopilot',
    label: 'Autopilot',
    description: 'Automated analysis & execution',
    icon: Bot,
    gate: canAccessAutopilot,
    badge: 'BETA',
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userEmail = session?.user?.github_email;

  const visibleItems = SETTINGS_NAV.filter(
    (item) => !item.gate || item.gate(userEmail),
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
        aria-label="Toggle settings menu"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          w-64 border-r border-gray-800 bg-black/95 lg:bg-transparent
          transform transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-4">
          {/* Back to Backlog */}
          <Link
            href="/admin/backlog"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 mt-2 lg:mt-0"
            onClick={() => setIsMobileOpen(false)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Backlog
          </Link>

          {/* Settings heading */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
            Settings
          </h2>

          {/* Navigation items */}
          <nav className="flex flex-col gap-1">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-start gap-3 px-3 py-3 rounded-md transition-all
                    ${
                      isActive
                        ? 'bg-gold/10 border border-gold/20 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      isActive ? 'text-gold' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isActive
                              ? 'bg-gold/20 text-gold'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
