'use client';

import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function APIPage() {
  return (
    <DocsLayout
      title="API Reference"
      description="Programmatic access to Mason functionality."
    >
      <p>
        Mason provides API endpoints for programmatic access. These are
        primarily used by CLI commands but can be used for custom integrations.
      </p>

      <div className="not-prose my-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-yellow-200">
          <strong>Note:</strong> Most users don&apos;t need to use the API
          directly. The CLI commands handle all API communication.
        </p>
      </div>

      <h2>Base URL</h2>
      <pre>
        <code>https://mason.assuredefi.com/api</code>
      </pre>

      <h2>Authentication</h2>
      <p>All API requests require a Bearer token:</p>
      <pre>
        <code>{`Authorization: Bearer mason_your_api_key`}</code>
      </pre>

      <h2>Endpoints</h2>

      <div className="not-prose my-6 space-y-4">
        <Link
          href="/docs/api/auth"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
              POST
            </span>
            <code className="text-white">/api/v1/analysis</code>
          </div>
          <p className="text-sm text-gray-400">
            Validate API key and get user context
          </p>
        </Link>

        <Link
          href="/docs/api/backlog"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
              GET
            </span>
            <code className="text-white">/api/v1/backlog/*</code>
          </div>
          <p className="text-sm text-gray-400">
            Fetch and update backlog items
          </p>
        </Link>

        <Link
          href="/docs/api/execution"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
              GET/POST
            </span>
            <code className="text-white">/api/execution/*</code>
          </div>
          <p className="text-sm text-gray-400">
            Track and update execution progress
          </p>
        </Link>
      </div>

      <h2>Response Format</h2>
      <p>All responses are JSON:</p>
      <pre>
        <code>{`{
  "success": true,
  "data": { ... }
}`}</code>
      </pre>

      <h3>Errors</h3>
      <pre>
        <code>{`{
  "success": false,
  "error": "Error message"
}`}</code>
      </pre>

      <h2>Rate Limiting</h2>
      <p>API requests are rate-limited. Current limits:</p>
      <ul>
        <li>100 requests per minute per API key</li>
        <li>1000 requests per hour per API key</li>
      </ul>

      <h2>Direct Supabase Access</h2>
      <p>
        Remember: your actual data is in YOUR Supabase. The Mason API is only
        for identity/key validation. For data operations, query your Supabase
        directly using the credentials in your config.
      </p>
    </DocsLayout>
  );
}
