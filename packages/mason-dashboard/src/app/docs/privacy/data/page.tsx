'use client';

import { DocsLayout } from '@/components/docs';

export default function DataPage() {
  return (
    <DocsLayout
      title="Data Isolation"
      description="Detailed breakdown of where your data is stored."
    >
      <h2>Data Location Reference</h2>
      <p>
        Transparency is fundamental to trust. Here&apos;s a complete breakdown
        of every piece of data Mason handles and exactly where it lives —
        color-coded so you can see at a glance what stays private (green),
        what&apos;s browser-only (blue), and what we can access (gold).
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Data Type
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Location
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                We Can Access?
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-gray-300">Your code</td>
              <td className="py-3 text-green-400">Your machine only</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Backlog items</td>
              <td className="py-3 text-green-400">Your Supabase</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">PRDs</td>
              <td className="py-3 text-green-400">Your Supabase</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Risk analysis</td>
              <td className="py-3 text-green-400">Your Supabase</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Execution logs</td>
              <td className="py-3 text-green-400">Your Supabase</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">AI provider keys</td>
              <td className="py-3 text-green-400">Your Supabase</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Domain knowledge</td>
              <td className="py-3 text-green-400">Your machine</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Supabase credentials</td>
              <td className="py-3 text-blue-400">Your browser</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">GitHub OAuth token</td>
              <td className="py-3 text-blue-400">Your browser</td>
              <td className="py-3 text-green-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">GitHub user ID</td>
              <td className="py-3 text-gold">Our database</td>
              <td className="py-3 text-gold">Yes</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Connected repo list</td>
              <td className="py-3 text-gold">Our database</td>
              <td className="py-3 text-gold">Yes</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">API key (hashed)</td>
              <td className="py-3 text-gold">Our database</td>
              <td className="py-3 text-gold">Yes (hash only)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Database Tables</h2>
      <p>
        When you run the setup migrations, Mason creates these tables in{' '}
        <strong>your</strong> Supabase project. All your work product — the
        backlog, PRDs, execution history — lives here under your control.
      </p>

      <h3>mason_pm_backlog_items</h3>
      <p>
        The heart of Mason — stores all improvement items with their impact and
        effort scores, detailed descriptions, PRD content, and status metadata.
      </p>

      <h3>mason_pm_analysis_runs</h3>
      <p>
        A historical record of each PM review run, including timestamps, item
        counts, and completion status.
      </p>

      <h3>mason_pm_execution_runs</h3>
      <p>
        Tracks execution sessions — which items were attempted, their progress
        through each phase, and final outcomes.
      </p>

      <h3>mason_execution_logs</h3>
      <p>
        Detailed execution logs for debugging and history — every checkpoint,
        validation result, and commit captured for your reference.
      </p>

      <h3>mason_ai_provider_keys</h3>
      <p>
        Secure storage for your AI provider API keys — encrypted and accessible
        only through your Supabase credentials.
      </p>

      <h3>mason_pm_filtered_items</h3>
      <p>
        Items filtered out during validation — kept for reference so you can
        understand what didn&apos;t make the cut and why.
      </p>

      <h3>mason_pm_restore_feedback</h3>
      <p>
        Tracks restored items — when you bring back a previously rejected item,
        this logs that decision.
      </p>

      <h2>Row Level Security</h2>
      <p>
        All Mason tables have <strong>Row Level Security (RLS)</strong> enabled
        by default. This means even if someone somehow obtained your Supabase
        credentials, they&apos;d still need proper authentication to access any
        data — an extra layer of protection built into the database itself.
      </p>

      <h2>Deleting Your Data</h2>
      <p>
        You own your data, which means you can delete it completely whenever you
        choose. Here&apos;s how to remove all traces of Mason.
      </p>
      <ol>
        <li>
          <strong>Drop the tables</strong> — Remove all <code>mason_*</code>{' '}
          tables from your Supabase project
        </li>
        <li>
          <strong>Clear browser storage</strong> — Delete localStorage entries
          from your browser
        </li>
        <li>
          <strong>Remove config files</strong> — Delete{' '}
          <code>mason.config.json</code> from any projects
        </li>
      </ol>
      <p>
        On our end, there&apos;s nothing substantial to delete — just your
        GitHub identity link. Revoke the OAuth connection from your GitHub
        settings, and that&apos;s gone too.
      </p>

      <h2>Open Source Verification</h2>
      <p>
        Don&apos;t take our word for any of this — verify it yourself. The
        entire Mason codebase is open source, so you can inspect exactly how
        data is handled, where it flows, and what we can (and can&apos;t) see.
      </p>
      <ul>
        <li>
          <a
            href="https://github.com/Assure-DeFi/mason"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Assure-DeFi/mason
          </a>
        </li>
      </ul>
      <p>
        Audit the code yourself, or have someone you trust review it. Privacy
        claims are only as good as their verifiability.
      </p>
    </DocsLayout>
  );
}
