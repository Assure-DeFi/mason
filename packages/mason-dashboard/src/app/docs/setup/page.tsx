'use client';

import { DocsLayout } from '@/components/docs';

export default function SetupPage() {
  return (
    <DocsLayout
      title="Setup Guide"
      description="Detailed instructions for setting up Mason."
    >
      <h2>Overview</h2>
      <p>
        Mason uses a <strong>BYOD (Bring Your Own Database)</strong>{' '}
        architecture. This means all your data — improvements, PRDs, risk
        analysis, execution history — lives in YOUR Supabase database. We only
        store your GitHub identity and a list of connected repositories.
      </p>
      <p>
        This design ensures complete privacy: we can&apos;t access your data
        even if we wanted to. You own everything.
      </p>

      <h2>1. Supabase Setup</h2>

      <h3>Create a Project</h3>
      <p>
        If you don&apos;t already have a Supabase account, the free tier
        provides more than enough resources for Mason:
      </p>
      <ol>
        <li>
          Go to{' '}
          <a href="https://supabase.com/dashboard">supabase.com/dashboard</a>
        </li>
        <li>
          Click <strong>New Project</strong>
        </li>
        <li>
          Choose a name (like &quot;mason-data&quot;) and any region close to
          you
        </li>
        <li>Set a strong database password and save it somewhere secure</li>
        <li>Wait for provisioning to complete (typically under 2 minutes)</li>
      </ol>

      <h3>Get Your Credentials</h3>
      <p>
        You&apos;ll need two pieces of information from your Supabase project:
      </p>
      <ol>
        <li>
          Navigate to <strong>Settings → API</strong> in your Supabase dashboard
        </li>
        <li>
          Copy the <strong>Project URL</strong> — it looks like{' '}
          <code>https://xxxxx.supabase.co</code>
        </li>
        <li>
          Copy the <strong>anon public</strong> key — it&apos;s a long string
          starting with <code>eyJ</code>
        </li>
      </ol>

      <div className="not-prose my-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-yellow-200">
          <strong>Security Note:</strong> Never share or use your{' '}
          <code>service_role</code> key with Mason. The anon/public key is all
          you need, and it&apos;s safe to use client-side.
        </p>
      </div>

      <h3>Initialize the Database</h3>
      <p>
        Mason needs to create several tables in your database. This is a
        one-click process:
      </p>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/setup">
            mason.assuredefi.com/setup
          </a>
        </li>
        <li>Paste your Supabase URL and anon key</li>
        <li>
          Click <strong>Update Database Schema</strong>
        </li>
      </ol>
      <p>
        This creates all required tables with proper indexes and Row Level
        Security policies. The migration is idempotent — you can safely run it
        again anytime to pick up schema updates.
      </p>

      <h2>2. GitHub Integration</h2>

      <h3>Install the Mason GitHub App</h3>
      <p>Connect Mason to your repositories through the GitHub App:</p>
      <ol>
        <li>
          In Mason Setup, click <strong>Connect Repository</strong>
        </li>
        <li>You&apos;ll be redirected to GitHub to authorize the Mason app</li>
        <li>
          Select which repositories Mason can access (you can modify this later)
        </li>
        <li>Complete the installation and return to Mason</li>
      </ol>

      <h3>Repository Permissions</h3>
      <p>Mason requests only the minimal permissions needed:</p>
      <ul>
        <li>
          <strong>Read access to metadata</strong> — repository names and basic
          info for the dashboard
        </li>
        <li>
          <strong>Read access to code</strong> — only used for PR link
          generation, not analysis
        </li>
      </ul>
      <p>
        <strong>Your code stays local.</strong> Mason does NOT access your code
        through GitHub. All analysis happens in Claude Code on your machine.
      </p>

      <h2>3. API Key Generation</h2>

      <h3>Create a Key</h3>
      <p>API keys authenticate CLI commands with your Mason account:</p>
      <ol>
        <li>
          In Mason Setup, scroll to the <strong>API Keys</strong> section
        </li>
        <li>
          Click <strong>Generate New Key</strong>
        </li>
        <li>
          <strong>Copy the key immediately</strong> — it&apos;s only displayed
          once
        </li>
      </ol>

      <h3>Key Format</h3>
      <p>
        API keys follow a simple format: <code>mason_xxxxxxxxxxxx</code>
      </p>
      <p>
        Keys are tied to your user account, not individual repositories. One key
        works across all your connected repos.
      </p>

      <h2>4. Local Configuration</h2>

      <h3>Configuration File</h3>
      <p>
        Create a <code>mason.config.json</code> file in your project root
        directory:
      </p>
      <pre>
        <code>{`{
  "apiKey": "mason_your_key_here",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`}</code>
      </pre>

      <h3>Add to .gitignore</h3>
      <p>
        <strong>This is important</strong> — the config file contains sensitive
        credentials that should never be committed. Add it to your{' '}
        <code>.gitignore</code>:
      </p>
      <pre>
        <code>{`# Mason configuration
mason.config.json`}</code>
      </pre>

      <h2>5. Verify Setup</h2>
      <p>Test your configuration by running a quick analysis:</p>
      <pre>
        <code>/pm-review quick</code>
      </pre>
      <p>
        Quick mode generates fewer items and completes in 1-2 minutes — perfect
        for verifying everything is connected properly.
      </p>

      <h2>Troubleshooting</h2>
      <p>If you run into issues, here are the most common causes and fixes:</p>

      <h3>&quot;Invalid API key&quot;</h3>
      <ul>
        <li>
          Verify the key starts with <code>mason_</code>
        </li>
        <li>Check for extra spaces or line breaks around the key</li>
        <li>Try generating a fresh key in the dashboard</li>
      </ul>

      <h3>&quot;Database connection failed&quot;</h3>
      <ul>
        <li>
          Double-check your Supabase URL is correct and includes{' '}
          <code>https://</code>
        </li>
        <li>Verify the anon key is complete (they&apos;re quite long)</li>
        <li>
          Make sure your Supabase project is active (free tier projects pause
          after inactivity)
        </li>
      </ul>

      <h3>&quot;Repository not found&quot;</h3>
      <ul>
        <li>Verify you&apos;ve installed the Mason GitHub App</li>
        <li>Check the app has access to the specific repository</li>
        <li>Try disconnecting and reconnecting the repository</li>
      </ul>
    </DocsLayout>
  );
}
