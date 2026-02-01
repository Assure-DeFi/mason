'use client';

import { DocsLayout } from '@/components/docs';

export default function EnvPage() {
  return (
    <DocsLayout
      title="Environment Variables"
      description="Alternative configuration via environment variables."
    >
      <h2>Overview</h2>
      <p>
        While Mason primarily uses <code>mason.config.json</code> for
        configuration, you can also use environment variables. This is
        especially useful for CI/CD pipelines or when you want to keep
        credentials out of config files.
      </p>

      <h2>Available Variables</h2>

      <h3>MASON_API_KEY</h3>
      <p>Alternative to apiKey in config file.</p>
      <pre>
        <code>export MASON_API_KEY=mason_your_api_key</code>
      </pre>

      <h3>MASON_DASHBOARD_URL</h3>
      <p>Override the dashboard URL.</p>
      <pre>
        <code>export MASON_DASHBOARD_URL=https://mason.assuredefi.com</code>
      </pre>

      <h3>SUPABASE_URL</h3>
      <p>Your Supabase project URL.</p>
      <pre>
        <code>export SUPABASE_URL=https://xxxxx.supabase.co</code>
      </pre>

      <h3>SUPABASE_ANON_KEY</h3>
      <p>Your Supabase anon key.</p>
      <pre>
        <code>export SUPABASE_ANON_KEY=eyJ...</code>
      </pre>

      <h2>Priority</h2>
      <p>Configuration sources are checked in this order:</p>
      <ol>
        <li>
          <strong>Environment variables</strong> (highest priority)
        </li>
        <li>
          <strong>mason.config.json</strong> in project root
        </li>
        <li>
          <strong>Global config</strong> in ~/.mason/config.json (lowest)
        </li>
      </ol>

      <h2>CI/CD Usage</h2>
      <p>
        Environment variables are useful for CI/CD pipelines where you
        can&apos;t store a config file.
      </p>

      <h3>GitHub Actions Example</h3>
      <pre>
        <code>{`# .github/workflows/mason.yml
name: Mason Review

on:
  push:
    branches: [main]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Mason Review
        env:
          MASON_API_KEY: \${{ secrets.MASON_API_KEY }}
          SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: \${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          # Mason commands would go here`}</code>
      </pre>

      <h2>.env Files</h2>
      <p>
        You can use <code>.env</code> files with dotenv if your environment
        supports it:
      </p>
      <pre>
        <code>{`# .env.local
MASON_API_KEY=mason_your_api_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...`}</code>
      </pre>
      <p>
        <strong>Remember:</strong> Add <code>.env.local</code> to{' '}
        <code>.gitignore</code>!
      </p>

      <h2>Verifying Configuration</h2>
      <p>Check which config values are being used:</p>
      <pre>
        <code>{`# In Claude Code
echo $MASON_API_KEY
echo $SUPABASE_URL`}</code>
      </pre>
    </DocsLayout>
  );
}
