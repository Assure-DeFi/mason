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
      <ol>
        <li>
          Go to <a href="https://mason.assuredefi.com">mason.assuredefi.com</a>
        </li>
        <li>
          Click <strong>Start with Mason</strong>
        </li>
        <li>Sign in with GitHub</li>
      </ol>

      <h2>Step 2: Connect Your Supabase Database</h2>
      <p>
        Mason uses a &quot;Bring Your Own Database&quot; model. Your data stays
        in YOUR Supabase project - we never see it.
      </p>
      <ol>
        <li>
          Create a new Supabase project at{' '}
          <a href="https://supabase.com/dashboard">supabase.com/dashboard</a>
        </li>
        <li>
          In your Supabase project, go to <strong>Settings &gt; API</strong>
        </li>
        <li>
          Copy your <strong>Project URL</strong> and{' '}
          <strong>anon/public key</strong>
        </li>
        <li>
          In the Mason dashboard, go to <strong>Setup</strong> and paste these
          values
        </li>
        <li>
          Click <strong>Update Database Schema</strong> to create the required
          tables
        </li>
      </ol>

      <h2>Step 3: Connect a GitHub Repository</h2>
      <ol>
        <li>
          In Mason Setup, click <strong>Connect Repository</strong>
        </li>
        <li>Install the Mason GitHub App on your repository</li>
        <li>Select which repositories to connect</li>
      </ol>

      <h2>Step 4: Generate an API Key</h2>
      <ol>
        <li>
          In Mason Setup, go to the <strong>API Keys</strong> section
        </li>
        <li>
          Click <strong>Generate New Key</strong>
        </li>
        <li>
          Copy the key - it starts with <code>mason_</code>
        </li>
      </ol>

      <h2>Step 5: Configure Claude Code</h2>
      <p>
        Create a <code>mason.config.json</code> file in your project root:
      </p>
      <pre>
        <code>{`{
  "apiKey": "mason_your_key_here",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "eyJ..."
}`}</code>
      </pre>

      <h2>Step 6: Run Your First Review</h2>
      <p>In Claude Code, run:</p>
      <pre>
        <code>/pm-review</code>
      </pre>
      <p>
        Mason will analyze your codebase and submit improvements to your
        dashboard. This typically takes 2-5 minutes depending on codebase size.
      </p>

      <h2>Step 7: View Results</h2>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/admin/backlog">
            mason.assuredefi.com/admin/backlog
          </a>
        </li>
        <li>
          You&apos;ll see your improvement suggestions organized by category
        </li>
        <li>
          Review items and click <strong>Approve</strong> on ones you want to
          implement
        </li>
      </ol>

      <h2>Step 8: Execute Approved Items</h2>
      <p>Back in Claude Code, run:</p>
      <pre>
        <code>/execute-approved</code>
      </pre>
      <p>
        Mason will implement approved items, create branches, and open pull
        requests.
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
