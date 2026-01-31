'use client';

import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function DashboardPage() {
  return (
    <DocsLayout
      title="Dashboard Overview"
      description="Navigate and use the Mason dashboard effectively."
    >
      <p>
        The Mason dashboard is where you manage your improvement backlog, review
        PRDs, track execution, and configure settings. Access it at{' '}
        <a href="https://mason.assuredefi.com/admin/backlog">
          mason.assuredefi.com/admin/backlog
        </a>
        .
      </p>

      <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/docs/dashboard/backlog"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <h3 className="mb-2 text-lg font-semibold text-white">
            Backlog Management
          </h3>
          <p className="text-sm text-gray-400">
            View, filter, approve, and reject improvement items.
          </p>
        </Link>

        <Link
          href="/docs/dashboard/items"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <h3 className="mb-2 text-lg font-semibold text-white">
            Item Details
          </h3>
          <p className="text-sm text-gray-400">
            PRDs, risk analysis, benefits, and timeline views.
          </p>
        </Link>

        <Link
          href="/docs/dashboard/execution"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <h3 className="mb-2 text-lg font-semibold text-white">
            Execution Tracking
          </h3>
          <p className="text-sm text-gray-400">
            Monitor progress and view real-time logs.
          </p>
        </Link>

        <Link
          href="/docs/dashboard/settings"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <h3 className="mb-2 text-lg font-semibold text-white">Settings</h3>
          <p className="text-sm text-gray-400">
            Configure database, repositories, and API keys.
          </p>
        </Link>
      </div>

      <h2>Main Sections</h2>

      <h3>Status Tabs</h3>
      <p>Items are organized by status:</p>
      <ul>
        <li>
          <strong>New</strong> - Fresh suggestions from PM review
        </li>
        <li>
          <strong>Approved</strong> - Ready for execution
        </li>
        <li>
          <strong>Completed</strong> - Successfully implemented
        </li>
        <li>
          <strong>Rejected</strong> - Declined items
        </li>
      </ul>

      <h3>Mason Recommends</h3>
      <p>
        A curated section showing the highest-priority items based on the
        priority score formula: (Impact &times; 2) - Effort. Quick wins (high
        impact, low effort) appear here.
      </p>

      <h3>Banger Idea</h3>
      <p>
        A highlighted card showing the current &quot;banger&quot; - a
        transformative feature suggestion. Only one banger exists at a time.
      </p>

      <h3>Feature Ideas</h3>
      <p>
        New feature suggestions (is_new_feature: true) are displayed separately
        from improvements and bug fixes.
      </p>

      <h2>Repository Selector</h2>
      <p>
        If you have multiple repositories connected, use the dropdown to filter
        items by repository. Each repository has its own separate backlog.
      </p>

      <h2>Real-Time Updates</h2>
      <p>
        The dashboard updates in real-time when items change. This includes:
      </p>
      <ul>
        <li>New items from PM review</li>
        <li>Status changes during execution</li>
        <li>Changes from other browser tabs</li>
      </ul>
    </DocsLayout>
  );
}
