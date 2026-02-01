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
        The Mason dashboard is your command center for managing improvements.
        Here you can browse your backlog, review detailed PRDs, approve items
        for execution, and track progress in real-time. Access it at{' '}
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
      <p>Items are organized by their workflow status:</p>
      <ul>
        <li>
          <strong>New</strong> — Fresh suggestions waiting for your review
        </li>
        <li>
          <strong>Approved</strong> — Ready for execution via{' '}
          <code>/execute-approved</code>
        </li>
        <li>
          <strong>Completed</strong> — Successfully implemented with PRs merged
        </li>
        <li>
          <strong>Rejected</strong> — Declined items (can be restored later)
        </li>
      </ul>

      <h3>Mason Recommends</h3>
      <p>
        A curated section highlighting your highest-priority items based on the
        priority formula: (Impact × 2) - Effort. This surfaces &quot;quick
        wins&quot; — high-value improvements that don&apos;t take long to build.
      </p>

      <h3>Banger Idea</h3>
      <p>
        A prominent card showcasing the current &quot;banger&quot; — a
        transformative feature suggestion that could significantly improve your
        product. Only one active banger exists per repository.
      </p>

      <h3>Feature Ideas</h3>
      <p>
        New feature suggestions are displayed separately from improvements and
        bug fixes, making it easy to review them as a category.
      </p>

      <h2>Repository Selector</h2>
      <p>
        If you have multiple repositories connected, use the dropdown to switch
        between them. Each repository maintains its own separate backlog.
      </p>

      <h2>Real-Time Updates</h2>
      <p>The dashboard updates automatically as things change:</p>
      <ul>
        <li>New items appear immediately after PM review completes</li>
        <li>Status changes are reflected during execution</li>
        <li>Changes sync across browser tabs and devices</li>
      </ul>
    </DocsLayout>
  );
}
