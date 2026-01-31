'use client';

import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function ConceptsPage() {
  return (
    <DocsLayout
      title="How Mason Works"
      description="Core concepts and architecture of Mason."
    >
      <h2>The Big Picture</h2>
      <p>
        Mason is a continuous improvement system for codebases. It combines AI
        analysis with a human-in-the-loop workflow to find and fix issues worth
        addressing.
      </p>

      <div className="not-prose my-8 rounded-xl border border-gold/30 bg-gold/5 p-6">
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
              1
            </span>
            <div>
              <strong className="text-white">Analyze</strong>
              <p className="text-gray-400">
                /pm-review scans your codebase across 8 categories
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
              2
            </span>
            <div>
              <strong className="text-white">Validate</strong>
              <p className="text-gray-400">
                Each suggestion is verified against your actual code
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
              3
            </span>
            <div>
              <strong className="text-white">Document</strong>
              <p className="text-gray-400">
                PRDs and risk analysis are generated automatically
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
              4
            </span>
            <div>
              <strong className="text-white">Triage</strong>
              <p className="text-gray-400">
                You review and approve/reject in the dashboard
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
              5
            </span>
            <div>
              <strong className="text-white">Execute</strong>
              <p className="text-gray-400">
                /execute-approved implements changes and creates PRs
              </p>
            </div>
          </li>
        </ol>
      </div>

      <h2>Key Concepts</h2>

      <div className="not-prose my-6 space-y-4">
        <Link
          href="/docs/concepts/categories"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">Categories</h3>
          <p className="text-sm text-gray-400">
            8 specialized analysis categories (Feature, UI, UX, etc.)
          </p>
        </Link>

        <Link
          href="/docs/concepts/scoring"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">Scoring System</h3>
          <p className="text-sm text-gray-400">
            Impact, Effort, and Priority scoring explained
          </p>
        </Link>

        <Link
          href="/docs/concepts/prds"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">PRDs & Tasks</h3>
          <p className="text-sm text-gray-400">
            How PRDs are generated and used for execution
          </p>
        </Link>

        <Link
          href="/docs/concepts/bangers"
          className="block rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gold/50"
        >
          <h3 className="font-semibold text-white">Banger Ideas</h3>
          <p className="text-sm text-gray-400">
            Transformative feature suggestions
          </p>
        </Link>
      </div>

      <h2>Architecture</h2>

      <h3>Where Things Run</h3>
      <ul>
        <li>
          <strong>Commands</strong> - Run locally in Claude Code
        </li>
        <li>
          <strong>Dashboard</strong> - Hosted web app at mason.assuredefi.com
        </li>
        <li>
          <strong>Data</strong> - Your own Supabase database
        </li>
      </ul>

      <h3>Data Flow</h3>
      <ol>
        <li>
          You run <code>/pm-review</code> locally
        </li>
        <li>Mason analyzes your code (stays local)</li>
        <li>Improvements are written to YOUR Supabase</li>
        <li>Dashboard reads from YOUR Supabase</li>
        <li>
          You approve items, <code>/execute-approved</code> reads them
        </li>
        <li>Changes are made locally, PRs pushed to GitHub</li>
      </ol>

      <h2>Privacy Model</h2>
      <p>
        Mason uses a &quot;Bring Your Own Database&quot; (BYOD) architecture.
        See <Link href="/docs/privacy">Privacy & Security</Link> for details.
      </p>
      <ul>
        <li>Your code never leaves your machine</li>
        <li>All improvement data stored in YOUR database</li>
        <li>We only store your GitHub identity</li>
      </ul>
    </DocsLayout>
  );
}
