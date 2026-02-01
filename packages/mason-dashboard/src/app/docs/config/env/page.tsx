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
        configuration, you can also use environment variables. This approach is
        especially useful in two scenarios — <strong>CI/CD pipelines</strong>{' '}
        where config files aren&apos;t practical, and{' '}
        <strong>security-conscious setups</strong> where you want to keep
        credentials out of version-controlled files entirely.
      </p>

      <h2>Available Variables</h2>
      <p>
        Mason recognizes the following environment variables. Each one maps
        directly to a field in <code>mason.config.json</code>, giving you
        flexibility in how you configure your setup.
      </p>

      <h3>MASON_API_KEY</h3>
      <p>
        Your Mason API key — the same value you&apos;d put in the{' '}
        <code>apiKey</code> field of your config file.
      </p>
      <pre>
        <code>export MASON_API_KEY=mason_your_api_key</code>
      </pre>

      <h3>MASON_DASHBOARD_URL</h3>
      <p>
        Override the default dashboard URL — useful for self-hosted deployments
        or development environments.
      </p>
      <pre>
        <code>export MASON_DASHBOARD_URL=https://mason.assuredefi.com</code>
      </pre>

      <h3>SUPABASE_URL</h3>
      <p>Your Supabase project URL — the base URL where your database lives.</p>
      <pre>
        <code>export SUPABASE_URL=https://xxxxx.supabase.co</code>
      </pre>

      <h3>SUPABASE_ANON_KEY</h3>
      <p>
        Your Supabase anonymous key — the public key used for client-side
        database access with Row Level Security.
      </p>
      <pre>
        <code>export SUPABASE_ANON_KEY=eyJ...</code>
      </pre>

      <h2>Priority</h2>
      <p>
        When multiple configuration sources exist, Mason checks them in a
        specific order. Higher-priority sources override lower ones, giving you
        fine-grained control over which values take effect.
      </p>
      <ol>
        <li>
          <strong>Environment variables</strong> — highest priority, always wins
        </li>
        <li>
          <strong>mason.config.json</strong> — project-specific settings in your
          repo root
        </li>
        <li>
          <strong>Global config</strong> — user-wide defaults in
          ~/.mason/config.json
        </li>
      </ol>

      <h2>CI/CD Usage</h2>
      <p>
        Environment variables shine in CI/CD pipelines where you can&apos;t — or
        don&apos;t want to — commit a config file. Simply inject your
        credentials as secrets, and Mason will pick them up automatically.
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
        For local development, you can use <code>.env</code> files with dotenv
        if your environment supports it. This keeps credentials out of your main
        config while still being easy to manage.
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
