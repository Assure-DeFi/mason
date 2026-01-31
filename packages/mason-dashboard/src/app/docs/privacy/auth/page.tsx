'use client';

import { DocsLayout } from '@/components/docs';

export default function AuthPage() {
  return (
    <DocsLayout
      title="Authentication"
      description="How Mason handles authentication without compromising privacy."
    >
      <h2>Authentication Flow</h2>
      <p>Mason uses two separate authentication systems:</p>

      <h3>1. GitHub OAuth (Dashboard)</h3>
      <p>For accessing the web dashboard:</p>
      <ol>
        <li>You click &quot;Sign in with GitHub&quot;</li>
        <li>GitHub authenticates you and returns a token</li>
        <li>Token is stored in your browser only</li>
        <li>We receive only your GitHub ID (no token)</li>
      </ol>

      <h3>2. API Key (CLI)</h3>
      <p>For CLI commands to communicate with your database:</p>
      <ol>
        <li>You generate an API key in the dashboard</li>
        <li>Key is shown once, then hashed and stored</li>
        <li>You add the key to your local config</li>
        <li>Commands send the key to validate identity</li>
      </ol>

      <h2>What Each Auth Method Allows</h2>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Action
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                GitHub OAuth
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                API Key
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-gray-300">View dashboard</td>
              <td className="py-3 text-green-400">Yes</td>
              <td className="py-3 text-red-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Manage settings</td>
              <td className="py-3 text-green-400">Yes</td>
              <td className="py-3 text-red-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Generate API keys</td>
              <td className="py-3 text-green-400">Yes</td>
              <td className="py-3 text-red-400">No</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Run /pm-review</td>
              <td className="py-3 text-red-400">No</td>
              <td className="py-3 text-green-400">Yes</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Run /execute-approved</td>
              <td className="py-3 text-red-400">No</td>
              <td className="py-3 text-green-400">Yes</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Write to your Supabase</td>
              <td className="py-3 text-green-400">Yes (via dashboard)</td>
              <td className="py-3 text-green-400">Yes (via CLI)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>API Key Security</h2>

      <h3>Format</h3>
      <p>
        API keys follow the format: <code>mason_xxxxxxxxxxxx</code>
      </p>
      <p>The random portion is cryptographically generated and unique.</p>

      <h3>Storage</h3>
      <ul>
        <li>
          <strong>Your side:</strong> Plain text in mason.config.json
        </li>
        <li>
          <strong>Our side:</strong> Hashed (we can&apos;t see the original)
        </li>
      </ul>

      <h3>Validation</h3>
      <p>When a command runs:</p>
      <ol>
        <li>Key is sent to our API</li>
        <li>We hash the key and compare to stored hash</li>
        <li>If match, we return your user ID and repos</li>
        <li>Command then talks directly to your Supabase</li>
      </ol>

      <h3>Revocation</h3>
      <p>If a key is compromised:</p>
      <ol>
        <li>Go to Settings &gt; API Keys</li>
        <li>Revoke the compromised key</li>
        <li>Generate a new key</li>
        <li>Update your local config</li>
      </ol>

      <h2>Supabase Authentication</h2>
      <p>
        Your Supabase credentials are used directly between your browser/CLI and
        your Supabase project:
      </p>
      <ul>
        <li>URL and anon key stored in your browser (dashboard)</li>
        <li>Same credentials in mason.config.json (CLI)</li>
        <li>We never receive or store these credentials</li>
      </ul>

      <h2>Session Security</h2>
      <ul>
        <li>GitHub OAuth sessions expire after inactivity</li>
        <li>API keys don&apos;t expire (manual revocation only)</li>
        <li>Supabase sessions follow Supabase defaults</li>
      </ul>
    </DocsLayout>
  );
}
