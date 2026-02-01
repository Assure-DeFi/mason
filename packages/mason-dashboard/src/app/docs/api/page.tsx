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
        Mason provides API endpoints for programmatic access. These are the same
        endpoints that power the CLI commands — but they&apos;re also available
        directly for building custom integrations, automation workflows, or
        extending Mason&apos;s functionality in ways we haven&apos;t imagined.
      </p>

      <div className="not-prose my-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-yellow-200">
          <strong>Note:</strong> Most users won&apos;t need to interact with the
          API directly — the CLI commands handle all communication behind the
          scenes. This reference is here for those building custom tooling or
          debugging integration issues.
        </p>
      </div>

      <h2>Base URL</h2>
      <pre>
        <code>https://mason.assuredefi.com/api</code>
      </pre>

      <h2>Authentication</h2>
      <p>
        Every API request requires authentication via a Bearer token. Use the
        API key from your <code>mason.config.json</code> file.
      </p>
      <pre>
        <code>{`Authorization: Bearer mason_your_api_key`}</code>
      </pre>

      <h2>Endpoints</h2>
      <p>
        The API is organized into logical groups — authentication, backlog
        management, and execution tracking. Click any endpoint below for
        detailed documentation.
      </p>

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
      <p>
        All responses follow a consistent JSON structure with a{' '}
        <code>success</code> boolean and either <code>data</code> or{' '}
        <code>error</code> fields.
      </p>
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
      <p>
        To ensure fair usage and system stability, API requests are
        rate-limited. These limits are generous for normal usage — you&apos;d
        have to be doing something unusual to hit them.
      </p>
      <ul>
        <li>
          <strong>100 requests per minute</strong> — burst limit per API key
        </li>
        <li>
          <strong>1000 requests per hour</strong> — sustained limit per API key
        </li>
      </ul>

      <h2>Direct Supabase Access</h2>
      <p>
        An important distinction: the Mason API only handles{' '}
        <strong>identity validation</strong> and{' '}
        <strong>key verification</strong>. Your actual data — backlog items,
        PRDs, execution logs — lives in YOUR Supabase database. For direct data
        operations, query your Supabase using the credentials in your config
        file. You own that data completely.
      </p>
    </DocsLayout>
  );
}
