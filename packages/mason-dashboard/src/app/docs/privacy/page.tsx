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
        <strong>BYOD (Bring Your Own Database)</strong> means YOUR data stays in
        YOUR database. Mason is architecturally designed so we can&apos;t access
        your data even if we wanted to — it&apos;s not stored on our servers.
      </p>

      <h2>Architecture Overview</h2>

      <h3>What WE Store (Central Database)</h3>
      <p>
        Our central database contains only the minimum needed to identify you:
      </p>
      <ul>
        <li>Your GitHub ID and username</li>
        <li>List of repositories you&apos;ve connected</li>
        <li>
          API key hashes (for authentication — we can&apos;t see the actual
          keys)
        </li>
      </ul>
      <p>
        <strong>That&apos;s it.</strong> No code, no improvements, no PRDs, no
        execution history, no credentials.
      </p>

      <h3>What YOU Store (Your Supabase)</h3>
      <p>Everything valuable lives in YOUR database:</p>
      <ul>
        <li>All backlog items and PRDs</li>
        <li>Risk analysis and benefit data</li>
        <li>Execution runs and logs</li>
        <li>AI provider API keys (if configured)</li>
        <li>Domain knowledge configuration</li>
      </ul>

      <h3>What Stays Local</h3>
      <p>Some things never leave your machine at all:</p>
      <ul>
        <li>Your codebase (analysis happens locally in Claude Code)</li>
        <li>Supabase credentials (stored in your browser localStorage)</li>
        <li>GitHub OAuth tokens (stored in your browser localStorage)</li>
        <li>The mason.config.json file</li>
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
      <p>The BYOD architecture provides real, practical benefits:</p>
      <ul>
        <li>
          <strong>Data breach?</strong> — We don&apos;t have your data to
          breach. It&apos;s not on our servers.
        </li>
        <li>
          <strong>Service shutdown?</strong> — Your data is already in your own
          database. Export it anytime.
        </li>
        <li>
          <strong>Compliance requirements?</strong> — You control exactly where
          your data lives.
        </li>
        <li>
          <strong>Don&apos;t trust us?</strong> — The entire codebase is open
          source. Verify for yourself.
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
