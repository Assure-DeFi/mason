'use client';

import { DocsLayout } from '@/components/docs';

export default function SettingsPage() {
  return (
    <DocsLayout
      title="Settings"
      description="Configure your Mason dashboard settings."
    >
      <h2>Database Settings</h2>
      <p>
        Configure your Supabase connection. Access at{' '}
        <a href="https://mason.assuredefi.com/settings/database">
          /settings/database
        </a>
      </p>
      <ul>
        <li>
          <strong>Supabase URL</strong> - Your project URL
        </li>
        <li>
          <strong>Anon Key</strong> - Public API key
        </li>
        <li>
          <strong>Update Schema</strong> - Apply database migrations
        </li>
        <li>
          <strong>Test Connection</strong> - Verify settings work
        </li>
      </ul>

      <h3>Updating Schema</h3>
      <p>
        Click &quot;Update Database Schema&quot; to apply any new tables or
        columns. This is safe to run multiple times (idempotent).
      </p>

      <h2>GitHub Settings</h2>
      <p>
        Manage connected repositories. Access at{' '}
        <a href="https://mason.assuredefi.com/settings/github">
          /settings/github
        </a>
      </p>
      <ul>
        <li>
          <strong>View connected repos</strong> - See what&apos;s linked
        </li>
        <li>
          <strong>Connect new repos</strong> - Install Mason GitHub App
        </li>
        <li>
          <strong>Disconnect repos</strong> - Remove access
        </li>
      </ul>

      <h3>GitHub App Permissions</h3>
      <p>The Mason GitHub App requests:</p>
      <ul>
        <li>Read access to repository metadata</li>
        <li>Read access to code (for PR links)</li>
      </ul>
      <p>
        Your code is NOT sent to our servers. Analysis happens locally in Claude
        Code.
      </p>

      <h2>API Keys</h2>
      <p>
        Manage authentication keys. Access at{' '}
        <a href="https://mason.assuredefi.com/settings/api-keys">
          /settings/api-keys
        </a>
      </p>
      <ul>
        <li>
          <strong>Generate new key</strong> - Create a new API key
        </li>
        <li>
          <strong>View existing keys</strong> - See active keys (masked)
        </li>
        <li>
          <strong>Revoke keys</strong> - Invalidate a key
        </li>
      </ul>

      <h3>Key Security</h3>
      <ul>
        <li>Keys are shown only once when generated</li>
        <li>Store them securely</li>
        <li>One key works across all your repositories</li>
        <li>Revoke and regenerate if compromised</li>
      </ul>

      <h2>Autopilot (Beta)</h2>
      <p>
        Configure automated reviews and execution. Access at{' '}
        <a href="https://mason.assuredefi.com/settings/autopilot">
          /settings/autopilot
        </a>
      </p>

      <div className="not-prose my-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-yellow-200">
          <strong>Note:</strong> Autopilot is a beta feature with limited
          availability.
        </p>
      </div>

      <ul>
        <li>
          <strong>Schedule reviews</strong> - Run PM review on a schedule
        </li>
        <li>
          <strong>Auto-execute</strong> - Automatically execute approved items
        </li>
        <li>
          <strong>Activity log</strong> - View autopilot history
        </li>
      </ul>

      <h2>Credentials Storage</h2>
      <p>Understanding where credentials are stored:</p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Credential
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-gray-300">Supabase URL/Key</td>
              <td className="py-3 text-green-400">Your browser only</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">GitHub OAuth token</td>
              <td className="py-3 text-green-400">Your browser only</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Mason API key</td>
              <td className="py-3 text-gold">Our database (identity only)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocsLayout>
  );
}
