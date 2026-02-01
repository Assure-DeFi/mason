'use client';

import { DocsLayout } from '@/components/docs';

export default function ConfigPage() {
  return (
    <DocsLayout
      title="Configuration File"
      description="The mason.config.json file and its options."
    >
      <h2>Location</h2>
      <p>
        Create a <code>mason.config.json</code> file in your project root
        directory:
      </p>
      <pre>
        <code>{`your-project/
├── mason.config.json  ← here
├── package.json
├── src/
└── ...`}</code>
      </pre>

      <h2>Full Configuration</h2>
      <pre>
        <code>{`{
  "apiKey": "mason_your_api_key",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`}</code>
      </pre>

      <h2>Fields</h2>
      <p>Each field serves a specific purpose:</p>

      <h3>apiKey (required)</h3>
      <p>
        Your Mason API key for authenticating CLI commands. Generate this in the
        dashboard at Settings → API Keys.
      </p>
      <ul>
        <li>
          Format: <code>mason_xxxxxxxxxxxx</code>
        </li>
        <li>
          Validates your identity when running <code>/pm-review</code> or{' '}
          <code>/execute-approved</code>
        </li>
      </ul>

      <h3>dashboardUrl (required)</h3>
      <p>The Mason dashboard URL for API calls and links.</p>
      <ul>
        <li>
          Default: <code>https://mason.assuredefi.com</code>
        </li>
        <li>Used for API communication and dashboard links in outputs</li>
      </ul>

      <h3>supabaseUrl (required)</h3>
      <p>Your Supabase project URL where all your Mason data is stored.</p>
      <ul>
        <li>
          Format: <code>https://xxxxx.supabase.co</code>
        </li>
        <li>Find it in Supabase: Settings → API → Project URL</li>
      </ul>

      <h3>supabaseAnonKey (required)</h3>
      <p>Your Supabase anon/public key for database access.</p>
      <ul>
        <li>
          Starts with <code>eyJ</code> (it&apos;s a JWT token)
        </li>
        <li>Find it in Supabase: Settings → API → anon public</li>
        <li>
          <strong>Never</strong> use the service_role key — it has too much
          access
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        <strong>Important:</strong> Add this file to your{' '}
        <code>.gitignore</code>! It contains sensitive credentials that should
        never be committed.
      </p>
      <pre>
        <code>{`# .gitignore
mason.config.json`}</code>
      </pre>

      <h2>Validation</h2>
      <p>Mason validates your config on each command run:</p>
      <ul>
        <li>All required fields present</li>
        <li>API key format is correct</li>
        <li>Supabase URL is valid</li>
      </ul>

      <h3>Testing Your Config</h3>
      <p>Run a quick review to verify:</p>
      <pre>
        <code>/pm-review --mode quick</code>
      </pre>

      <h2>Multiple Projects</h2>
      <p>
        Each project has its own <code>mason.config.json</code>. You can use the
        same API key across projects (it&apos;s tied to your account, not
        repos).
      </p>

      <h2>Troubleshooting</h2>

      <h3>Config not found</h3>
      <p>Make sure the file is in your project root and named exactly:</p>
      <pre>
        <code>mason.config.json</code>
      </pre>

      <h3>Invalid API key</h3>
      <ul>
        <li>
          Check the key starts with <code>mason_</code>
        </li>
        <li>No extra spaces or quotes</li>
        <li>Generate a new key if needed</li>
      </ul>

      <h3>Supabase connection failed</h3>
      <ul>
        <li>
          Verify URL includes <code>https://</code>
        </li>
        <li>Check the anon key is complete</li>
        <li>Ensure Supabase project is active</li>
      </ul>
    </DocsLayout>
  );
}
