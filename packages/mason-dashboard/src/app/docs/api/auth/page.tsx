'use client';

import { DocsLayout } from '@/components/docs';

export default function APIAuthPage() {
  return (
    <DocsLayout
      title="API Authentication"
      description="Authenticate API requests with your Mason API key."
    >
      <h2>Authentication Header</h2>
      <p>Include your API key in the Authorization header:</p>
      <pre>
        <code>{`Authorization: Bearer mason_your_api_key`}</code>
      </pre>

      <h2>Validation Endpoint</h2>
      <h3>POST /api/v1/analysis</h3>
      <p>Validates the API key and returns user context.</p>

      <h4>Request</h4>
      <pre>
        <code>{`curl -X POST https://mason.assuredefi.com/api/v1/analysis \\
  -H "Authorization: Bearer mason_your_api_key" \\
  -H "Content-Type: application/json"`}</code>
      </pre>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "user_id": "github_12345",
  "repositories": [
    {
      "id": "repo_abc123",
      "full_name": "username/repo",
      "name": "repo"
    }
  ],
  "dashboard_url": "https://mason.assuredefi.com"
}`}</code>
      </pre>

      <h4>Errors</h4>

      <h5>Invalid API Key</h5>
      <pre>
        <code>{`{
  "success": false,
  "error": "Invalid API key"
}`}</code>
      </pre>
      <p>Status: 401</p>

      <h5>Missing Authorization</h5>
      <pre>
        <code>{`{
  "success": false,
  "error": "Authorization header required"
}`}</code>
      </pre>
      <p>Status: 401</p>

      <h2>API Key Format</h2>
      <p>Valid API keys:</p>
      <ul>
        <li>
          Start with <code>mason_</code>
        </li>
        <li>Followed by 12+ alphanumeric characters</li>
        <li>
          Example: <code>mason_abc123def456</code>
        </li>
      </ul>

      <h2>Key Generation</h2>
      <p>Generate keys in the dashboard:</p>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/settings/api-keys">
            Settings &gt; API Keys
          </a>
        </li>
        <li>Click &quot;Generate New Key&quot;</li>
        <li>Copy the key immediately (shown only once)</li>
      </ol>

      <h2>Key Security</h2>
      <ul>
        <li>Keys are hashed in our database (we can&apos;t see them)</li>
        <li>Treat keys like passwords - don&apos;t commit to git</li>
        <li>
          Add <code>mason.config.json</code> to .gitignore
        </li>
        <li>Revoke and regenerate if compromised</li>
      </ul>
    </DocsLayout>
  );
}
