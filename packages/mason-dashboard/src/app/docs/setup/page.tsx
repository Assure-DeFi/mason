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
        architecture. This means all your data - improvements, PRDs, execution
        history - lives in YOUR Supabase database. We only store your GitHub
        identity and connected repository list.
      </p>

      <h2>1. Supabase Setup</h2>

      <h3>Create a Project</h3>
      <ol>
        <li>
          Go to{' '}
          <a href="https://supabase.com/dashboard">supabase.com/dashboard</a>
        </li>
        <li>
          Click <strong>New Project</strong>
        </li>
        <li>Choose a name and region (any region works)</li>
        <li>Set a database password (save it somewhere safe)</li>
        <li>Wait for the project to finish provisioning (~2 minutes)</li>
      </ol>

      <h3>Get Your Credentials</h3>
      <ol>
        <li>
          In your Supabase project, go to <strong>Settings &gt; API</strong>
        </li>
        <li>
          Copy the <strong>Project URL</strong> - looks like{' '}
          <code>https://xxxxx.supabase.co</code>
        </li>
        <li>
          Copy the <strong>anon public</strong> key - starts with{' '}
          <code>eyJ</code>
        </li>
      </ol>

      <div className="not-prose my-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-yellow-200">
          <strong>Important:</strong> Never share your service_role key. Mason
          only needs the anon/public key.
        </p>
      </div>

      <h3>Initialize the Database</h3>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/setup">
            mason.assuredefi.com/setup
          </a>
        </li>
        <li>Enter your Supabase URL and anon key</li>
        <li>
          Click <strong>Update Database Schema</strong>
        </li>
      </ol>
      <p>
        This creates all the required tables with proper indexes and Row Level
        Security policies.
      </p>

      <h2>2. GitHub Integration</h2>

      <h3>Install the Mason GitHub App</h3>
      <ol>
        <li>
          In Mason Setup, click <strong>Connect Repository</strong>
        </li>
        <li>You&apos;ll be redirected to GitHub to install the Mason app</li>
        <li>Choose which repositories to give Mason access to</li>
        <li>Complete the installation</li>
      </ol>

      <h3>Repository Permissions</h3>
      <p>Mason requests minimal permissions:</p>
      <ul>
        <li>
          <strong>Read access</strong> to repository metadata
        </li>
        <li>
          <strong>Read access</strong> to code (for PR creation)
        </li>
      </ul>
      <p>
        Mason does NOT access your code through GitHub. Analysis happens locally
        in Claude Code.
      </p>

      <h2>3. API Key Generation</h2>

      <h3>Create a Key</h3>
      <ol>
        <li>
          In Mason Setup, go to the <strong>API Keys</strong> section
        </li>
        <li>
          Click <strong>Generate New Key</strong>
        </li>
        <li>Copy the key immediately - it won&apos;t be shown again</li>
      </ol>

      <h3>Key Format</h3>
      <p>
        API keys follow the format: <code>mason_xxxxxxxxxxxx</code>
      </p>
      <p>Keys are tied to your user account, not individual repositories.</p>

      <h2>4. Local Configuration</h2>

      <h3>Configuration File</h3>
      <p>
        Create <code>mason.config.json</code> in your project root:
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
        The config file contains sensitive credentials. Add it to your{' '}
        <code>.gitignore</code>:
      </p>
      <pre>
        <code>{`# Mason configuration
mason.config.json`}</code>
      </pre>

      <h2>5. Verify Setup</h2>
      <p>Test your configuration by running:</p>
      <pre>
        <code>/pm-review --mode quick</code>
      </pre>
      <p>
        This runs a quick analysis (fewer items) to verify everything is
        connected.
      </p>

      <h2>Troubleshooting</h2>

      <h3>&quot;Invalid API key&quot;</h3>
      <ul>
        <li>
          Verify the key starts with <code>mason_</code>
        </li>
        <li>Check there are no extra spaces</li>
        <li>Generate a new key if needed</li>
      </ul>

      <h3>&quot;Database connection failed&quot;</h3>
      <ul>
        <li>Verify your Supabase URL is correct</li>
        <li>Check the anon key is complete (they&apos;re long)</li>
        <li>Ensure the Supabase project is active (not paused)</li>
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
