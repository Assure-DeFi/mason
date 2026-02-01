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
        Here&apos;s a complete breakdown of every piece of data Mason handles
        and exactly where it lives:
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
      <p>Tables created in YOUR Supabase:</p>

      <h3>mason_pm_backlog_items</h3>
      <p>
        Stores all improvement items with their scores, descriptions, and
        metadata.
      </p>

      <h3>mason_pm_analysis_runs</h3>
      <p>Records of each PM review run with timestamps and status.</p>

      <h3>mason_pm_execution_runs</h3>
      <p>Execution tracking with progress and outcomes.</p>

      <h3>mason_execution_logs</h3>
      <p>Detailed logs from execution for debugging and history.</p>

      <h3>mason_ai_provider_keys</h3>
      <p>Encrypted storage for your AI provider API keys.</p>

      <h3>mason_pm_filtered_items</h3>
      <p>Items filtered out during validation (for reference).</p>

      <h3>mason_pm_restore_feedback</h3>
      <p>Tracking for restored items.</p>

      <h2>Row Level Security</h2>
      <p>
        All tables have RLS (Row Level Security) enabled. Even if someone had
        your Supabase credentials, they&apos;d need proper authentication to
        access data.
      </p>

      <h2>Deleting Your Data</h2>
      <p>To completely remove Mason data:</p>
      <ol>
        <li>
          Drop the <code>mason_*</code> tables in your Supabase
        </li>
        <li>Clear browser localStorage</li>
        <li>Delete mason.config.json from projects</li>
      </ol>
      <p>
        We have nothing to delete - your identity info can be removed by
        revoking the GitHub OAuth connection.
      </p>

      <h2>Open Source Verification</h2>
      <p>
        Don&apos;t take our word for it. The entire codebase is open source:
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
        Audit the data handling yourself or have someone you trust review it.
      </p>
    </DocsLayout>
  );
}
