'use client';

import { clsx } from 'clsx';
import {
  ArrowLeft,
  Bot,
  Cpu,
  Database,
  Key,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { canAccessAutopilot } from '@/lib/feature-flags';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavItems: NavItem[] = [
  { title: 'Repository Settings', href: '/settings/github', icon: Settings },
  { title: 'API Keys', href: '/settings/api-keys', icon: Key },
  { title: 'AI Providers', href: '/settings/ai-providers', icon: Cpu },
  { title: 'Database', href: '/settings/database', icon: Database },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userEmail = session?.user?.github_email;
  const showAutopilot = canAccessAutopilot(userEmail);

  const navItems: NavItem[] = showAutopilot
    ? [...baseNavItems, { title: 'Autopilot', href: '/settings/autopilot', icon: Bot }]
    : baseNavItems;

  return (
    <>
      {/* Mobile: horizontal scrollable tabs */}
      <div className="mb-6 lg:hidden">
        <Link
          href="/admin/backlog"
          className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Backlog
        </Link>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-gold/10 text-gold'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <Link
          href="/admin/backlog"
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Backlog
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-gold/10 text-gold'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
              {item.href === '/settings/autopilot' && (
                <span className="rounded bg-gold/20 px-1 py-0.5 text-[10px]">
                  BETA
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
