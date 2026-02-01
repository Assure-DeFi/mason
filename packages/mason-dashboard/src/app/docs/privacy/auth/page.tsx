'use client';

import { DocsLayout } from '@/components/docs';

export default function AuthPage() {
  return (
    <DocsLayout
      title="Authentication"
      description="How Mason handles authentication without compromising privacy."
    >
      <h2>Authentication Flow</h2>
      <p>
        Mason uses two separate authentication systems — each designed with
        privacy as the primary constraint. The dashboard and CLI authenticate
        differently, but both follow the same principle: we verify your identity
        without gaining access to your secrets.
      </p>

      <h3>1. GitHub OAuth (Dashboard)</h3>
      <p>
        When you access the web dashboard, authentication flows through GitHub.
        Here&apos;s what happens behind the scenes.
      </p>
      <ol>
        <li>
          <strong>You initiate</strong> — Click &quot;Sign in with GitHub&quot;
        </li>
        <li>
          <strong>GitHub authenticates</strong> — GitHub verifies your identity
          and issues a token
        </li>
        <li>
          <strong>Token stays local</strong> — The OAuth token is stored in{' '}
          <strong>your browser only</strong>
        </li>
        <li>
          <strong>We see minimal info</strong> — We receive only your GitHub ID
          — never the OAuth token itself
        </li>
      </ol>

      <h3>2. API Key (CLI)</h3>
      <p>
        CLI commands use a separate API key system. This keeps terminal-based
        workflows simple while maintaining the same privacy guarantees.
      </p>
      <ol>
        <li>
          <strong>Generate in dashboard</strong> — Create an API key from your
          settings page
        </li>
        <li>
          <strong>Shown once, then hashed</strong> — You see the key once, then
          we hash it before storage
        </li>
        <li>
          <strong>Store locally</strong> — Add the key to your local{' '}
          <code>mason.config.json</code>
        </li>
        <li>
          <strong>Validate on use</strong> — Commands send the key to verify
          your identity
        </li>
      </ol>

      <h2>What Each Auth Method Allows</h2>
      <p>
        The two authentication methods have distinct permissions — designed so
        neither alone can do everything. This separation limits the blast radius
        if either credential is compromised.
      </p>

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
      <p>
        API keys are the credential that connects your local CLI to your
        identity. Here&apos;s how they&apos;re designed to minimize risk.
      </p>

      <h3>Format</h3>
      <p>
        API keys follow the format: <code>mason_xxxxxxxxxxxx</code>
      </p>
      <p>
        The random portion is cryptographically generated using secure random
        bytes — each key is unique and unpredictable.
      </p>

      <h3>Storage</h3>
      <p>
        Keys are stored differently on each side, with an important asymmetry.
      </p>
      <ul>
        <li>
          <strong>Your side</strong> — Plain text in mason.config.json (you need
          the actual key)
        </li>
        <li>
          <strong>Our side</strong> — Hashed only (we can&apos;t recover the
          original)
        </li>
      </ul>

      <h3>Validation</h3>
      <p>
        When a command runs, here&apos;s the authentication flow — note that we
        never store your actual key.
      </p>
      <ol>
        <li>
          <strong>Key sent</strong> — Your command sends the API key to our
          endpoint
        </li>
        <li>
          <strong>Hash compared</strong> — We hash what you sent and compare to
          the stored hash
        </li>
        <li>
          <strong>Context returned</strong> — If they match, we return your user
          ID and connected repos
        </li>
        <li>
          <strong>Direct connection</strong> — Your command then talks directly
          to your Supabase
        </li>
      </ol>

      <h3>Revocation</h3>
      <p>
        If a key is ever compromised, you can invalidate it immediately and
        generate a replacement.
      </p>
      <ol>
        <li>
          <strong>Navigate</strong> — Go to Settings → API Keys
        </li>
        <li>
          <strong>Revoke</strong> — Click revoke on the compromised key
        </li>
        <li>
          <strong>Generate</strong> — Create a new key
        </li>
        <li>
          <strong>Update locally</strong> — Replace the key in your
          mason.config.json
        </li>
      </ol>

      <h2>Supabase Authentication</h2>
      <p>
        Your Supabase credentials create a direct connection between you and
        your database — Mason never sits in the middle of that relationship.
      </p>
      <ul>
        <li>
          <strong>Dashboard</strong> — URL and anon key stored in your browser
          localStorage
        </li>
        <li>
          <strong>CLI</strong> — Same credentials live in your local
          mason.config.json
        </li>
        <li>
          <strong>Our involvement</strong> — None. We never receive, see, or
          store these credentials.
        </li>
      </ul>

      <h2>Session Security</h2>
      <p>
        Different authentication methods have different session behaviors —
        here&apos;s what to expect.
      </p>
      <ul>
        <li>
          <strong>GitHub OAuth</strong> — Sessions expire after periods of
          inactivity
        </li>
        <li>
          <strong>API keys</strong> — Never expire automatically; revoke
          manually when needed
        </li>
        <li>
          <strong>Supabase sessions</strong> — Follow Supabase&apos;s default
          session policies
        </li>
      </ul>
    </DocsLayout>
  );
}
