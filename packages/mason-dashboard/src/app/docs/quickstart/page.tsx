'use client';

import { DocsLayout } from '@/components/docs';

export default function QuickStartPage() {
  return (
    <DocsLayout
      title="Quick Start"
      description="Get Mason running in about 5 minutes."
    >
      <div className="not-prose mb-8 rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-gray-300">
          <strong className="text-white">Prerequisites:</strong> You need{' '}
          <a
            href="https://claude.ai/download"
            className="text-gold hover:underline"
          >
            Claude Code
          </a>{' '}
          installed and a free{' '}
          <a href="https://supabase.com" className="text-gold hover:underline">
            Supabase
          </a>{' '}
          account.
        </p>
      </div>

      <h2>Step 1: Sign in to Mason</h2>
      <p>
        Head to the Mason dashboard and authenticate with your GitHub account:
      </p>
      <ol>
        <li>
          Go to <a href="https://mason.assuredefi.com">mason.assuredefi.com</a>
        </li>
        <li>
          Click <strong>Start with Mason</strong>
        </li>
        <li>Sign in with GitHub (we only receive your public profile info)</li>
      </ol>

      <h2>Step 2: Connect Your Supabase Database</h2>
      <p>
        Mason uses a <strong>&quot;Bring Your Own Database&quot;</strong>{' '}
        architecture. All your improvement data, PRDs, and execution history
        live in YOUR Supabase project — we never see it.
      </p>
      <ol>
        <li>
          Create a new project at{' '}
          <a href="https://supabase.com/dashboard">supabase.com/dashboard</a>{' '}
          (free tier works great)
        </li>
        <li>
          Navigate to <strong>Settings → API</strong> in your Supabase project
        </li>
        <li>
          Copy two values: your <strong>Project URL</strong> and the{' '}
          <strong>anon/public key</strong>
        </li>
        <li>
          In the Mason dashboard, go to <strong>Setup</strong> and paste these
          credentials
        </li>
        <li>
          Click <strong>Update Database Schema</strong> — this creates all
          required tables automatically
        </li>
      </ol>

      <h2>Step 3: Connect a GitHub Repository</h2>
      <p>Link Mason to the repositories you want to improve:</p>
      <ol>
        <li>
          In Mason Setup, click <strong>Connect Repository</strong>
        </li>
        <li>
          Install the Mason GitHub App when prompted (minimal permissions
          required)
        </li>
        <li>Select which repositories to connect — you can add more later</li>
      </ol>

      <h2>Step 4: Generate an API Key</h2>
      <p>
        Create an API key so the CLI commands can authenticate with your
        account:
      </p>
      <ol>
        <li>
          In Mason Setup, scroll to the <strong>API Keys</strong> section
        </li>
        <li>
          Click <strong>Generate New Key</strong>
        </li>
        <li>
          Copy the key immediately — it starts with <code>mason_</code> and is
          only shown once
        </li>
      </ol>

      <h2>Step 5: Configure Claude Code</h2>
      <p>
        Create a <code>mason.config.json</code> file in your project root with
        your credentials:
      </p>
      <pre>
        <code>{`{
  "apiKey": "mason_your_key_here",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "eyJ..."
}`}</code>
      </pre>
      <p>
        <strong>Important:</strong> Add this file to your{' '}
        <code>.gitignore</code> — it contains sensitive credentials.
      </p>

      <h2>Step 6: Run Your First Review</h2>
      <p>Open Claude Code in your project directory and run:</p>
      <pre>
        <code>/pm-review</code>
      </pre>
      <p>
        Mason will analyze your codebase across 8 categories and submit
        improvement suggestions to your dashboard. A full review typically takes
        2-5 minutes depending on codebase size.
      </p>

      <h2>Step 7: Review and Approve</h2>
      <p>Head to your dashboard to triage the suggestions:</p>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/admin/backlog">
            mason.assuredefi.com/admin/backlog
          </a>
        </li>
        <li>
          Browse improvement suggestions organized by category — each includes a
          full PRD and risk analysis
        </li>
        <li>
          Click <strong>Approve</strong> on items you want to implement, or{' '}
          <strong>Reject</strong> to dismiss
        </li>
      </ol>

      <h2>Step 8: Execute Approved Items</h2>
      <p>Back in Claude Code, implement your approved improvements:</p>
      <pre>
        <code>/execute-approved</code>
      </pre>
      <p>
        Mason implements each approved item using wave-based execution, creates
        branches, and opens pull requests. You can watch progress in real-time
        from your dashboard.
      </p>

      <div className="not-prose mt-8 rounded-lg border border-gray-800 bg-black/30 p-6">
        <h3 className="mb-3 text-lg font-semibold text-white">
          What&apos;s Next?
        </h3>
        <ul className="space-y-2 text-gray-300">
          <li>
            <a
              href="/docs/commands/pm-review"
              className="text-gold hover:underline"
            >
              Learn about /pm-review modes
            </a>{' '}
            - quick, full, or focused analysis
          </li>
          <li>
            <a
              href="/docs/dashboard/backlog"
              className="text-gold hover:underline"
            >
              Master the dashboard
            </a>{' '}
            - bulk actions, filtering, and more
          </li>
          <li>
            <a
              href="/docs/concepts/scoring"
              className="text-gold hover:underline"
            >
              Understand scoring
            </a>{' '}
            - how Mason prioritizes improvements
          </li>
        </ul>
      </div>
    </DocsLayout>
  );
}
