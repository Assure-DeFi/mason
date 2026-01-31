'use client';

import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function PrivacyPage() {
  return (
    <DocsLayout
      title="BYOD Architecture"
      description="How Mason keeps your data private with Bring Your Own Database."
    >
      <div className="not-prose mb-8 rounded-xl border border-gold/30 bg-gold/5 p-6">
        <p className="text-lg italic text-gray-300">
          &quot;If you wouldn&apos;t paste it into ChatGPT, Mason doesn&apos;t
          need it.&quot;
        </p>
      </div>

      <h2>What is BYOD?</h2>
      <p>
        BYOD (Bring Your Own Database) means YOUR data stays in YOUR database.
        Mason is designed so we can&apos;t access your data even if we wanted
        to.
      </p>

      <h2>Architecture Overview</h2>

      <h3>What WE Store (Central Database)</h3>
      <ul>
        <li>Your GitHub ID and username</li>
        <li>List of repositories you&apos;ve connected</li>
        <li>API key hashes (for authentication)</li>
      </ul>
      <p>
        <strong>That&apos;s it.</strong> No code, no improvements, no PRDs, no
        execution history.
      </p>

      <h3>What YOU Store (Your Supabase)</h3>
      <ul>
        <li>All backlog items and PRDs</li>
        <li>Risk analysis and benefit data</li>
        <li>Execution runs and logs</li>
        <li>AI provider API keys</li>
        <li>Domain knowledge configuration</li>
      </ul>

      <h3>What Stays Local</h3>
      <ul>
        <li>Your codebase (never sent anywhere)</li>
        <li>Supabase credentials (browser localStorage)</li>
        <li>GitHub OAuth tokens (browser localStorage)</li>
        <li>Mason config file</li>
      </ul>

      <h2>Data Flow</h2>

      <div className="not-prose my-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-blue-500/20 px-2 py-1 text-sm text-blue-400">
            Your Machine
          </span>
          <span className="text-gray-500">→</span>
          <span className="text-gray-400">Code analysis happens here</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-green-500/20 px-2 py-1 text-sm text-green-400">
            Your Supabase
          </span>
          <span className="text-gray-500">→</span>
          <span className="text-gray-400">Improvements stored here</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-gold/20 px-2 py-1 text-sm text-gold">
            Mason Dashboard
          </span>
          <span className="text-gray-500">→</span>
          <span className="text-gray-400">
            Reads from YOUR Supabase (credentials in your browser)
          </span>
        </div>
      </div>

      <h2>Why This Matters</h2>
      <ul>
        <li>
          <strong>Data breach?</strong> We don&apos;t have your data to breach
        </li>
        <li>
          <strong>Shutdown?</strong> Your data is already in your database
        </li>
        <li>
          <strong>Compliance?</strong> You control where data is stored
        </li>
        <li>
          <strong>Trust?</strong> Code is open source - verify it yourself
        </li>
      </ul>

      <h2>Learn More</h2>
      <div className="not-prose my-6 space-y-3">
        <Link
          href="/docs/privacy/data"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">Data Isolation</h3>
          <p className="text-sm text-gray-400">
            Detailed breakdown of what&apos;s stored where
          </p>
        </Link>

        <Link
          href="/docs/privacy/auth"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">Authentication</h3>
          <p className="text-sm text-gray-400">
            How auth works without compromising privacy
          </p>
        </Link>
      </div>
    </DocsLayout>
  );
}
