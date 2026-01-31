'use client';

import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function CommandsPage() {
  return (
    <DocsLayout
      title="Commands Overview"
      description="Mason commands you can run in Claude Code."
    >
      <p>
        Mason provides three commands that run inside Claude Code. These
        commands analyze your codebase, execute improvements, and keep
        everything up to date.
      </p>

      <div className="not-prose my-8 space-y-4">
        <Link
          href="/docs/commands/pm-review"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-3">
            <code className="rounded bg-gold/20 px-2 py-1 text-gold">
              /pm-review
            </code>
            <span className="text-sm text-gray-500">v2.2.0</span>
          </div>
          <p className="text-gray-300">
            Analyze your codebase and generate improvement suggestions with
            PRDs, risk analysis, and priority scoring.
          </p>
        </Link>

        <Link
          href="/docs/commands/execute-approved"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-3">
            <code className="rounded bg-gold/20 px-2 py-1 text-gold">
              /execute-approved
            </code>
            <span className="text-sm text-gray-500">v2.0.1</span>
          </div>
          <p className="text-gray-300">
            Execute approved items from your backlog with wave-based parallel
            implementation.
          </p>
        </Link>

        <Link
          href="/docs/commands/mason-update"
          className="block rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
        >
          <div className="mb-2 flex items-center gap-3">
            <code className="rounded bg-gold/20 px-2 py-1 text-gold">
              /mason-update
            </code>
            <span className="text-sm text-gray-500">v1.0.0</span>
          </div>
          <p className="text-gray-300">
            Update Mason commands to the latest versions with automatic version
            enforcement.
          </p>
        </Link>
      </div>

      <h2>Command Location</h2>
      <p>
        Mason commands are stored in <code>.claude/commands/</code> in your
        project directory. They&apos;re automatically installed during setup and
        kept up to date via version enforcement.
      </p>

      <h2>Auto-Update Behavior</h2>
      <p>
        Commands check for updates before each run. If a required minimum
        version is set (for breaking changes or critical fixes), the command
        automatically updates itself before executing.
      </p>
      <p>You can manually update all commands with:</p>
      <pre>
        <code>/mason-update</code>
      </pre>

      <h2>Common Flags</h2>
      <p>Most commands support these common flags:</p>
      <ul>
        <li>
          <code>--auto</code> - Headless mode for automated/scheduled runs
        </li>
        <li>
          <code>--dry-run</code> - Preview what would happen without making
          changes
        </li>
      </ul>
    </DocsLayout>
  );
}
