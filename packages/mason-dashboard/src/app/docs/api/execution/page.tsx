'use client';

import { DocsLayout } from '@/components/docs';

export default function APIExecutionPage() {
  return (
    <DocsLayout
      title="Execution Endpoints"
      description="API endpoints for tracking execution progress."
    >
      <h2>Start Execution Run</h2>
      <h3>POST /api/execution/start</h3>
      <p>Initializes a new execution run for tracking.</p>

      <h4>Request Body</h4>
      <pre>
        <code>{`{
  "item_ids": ["item_abc123", "item_def456"],
  "repository_id": "repo_xyz"
}`}</code>
      </pre>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "execution_id": "exec_789",
  "started_at": "2024-01-15T10:00:00Z"
}`}</code>
      </pre>

      <h2>Update Execution Status</h2>
      <h3>POST /api/execution/[id]</h3>
      <p>Updates the status of an execution run.</p>

      <h4>Request Body</h4>
      <pre>
        <code>{`{
  "status": "in_progress",
  "current_item": "item_abc123",
  "current_wave": 2,
  "message": "Implementing changes..."
}`}</code>
      </pre>

      <h4>Status Values</h4>
      <ul>
        <li>
          <code>pending</code> - Not yet started
        </li>
        <li>
          <code>in_progress</code> - Currently executing
        </li>
        <li>
          <code>completed</code> - Successfully finished
        </li>
        <li>
          <code>failed</code> - Execution failed
        </li>
      </ul>

      <h2>Get Execution Logs</h2>
      <h3>GET /api/execution/[id]/logs</h3>
      <p>Streams execution logs for real-time display.</p>

      <h4>Query Parameters</h4>
      <ul>
        <li>
          <code>since</code> - Timestamp to get logs after (optional)
        </li>
      </ul>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "logs": [
    {
      "timestamp": "2024-01-15T10:01:00Z",
      "level": "info",
      "message": "Starting Wave 1: Exploration"
    },
    {
      "timestamp": "2024-01-15T10:01:05Z",
      "level": "info",
      "message": "Analyzing existing patterns..."
    }
  ]
}`}</code>
      </pre>

      <h4>Log Levels</h4>
      <ul>
        <li>
          <code>info</code> - Normal progress information
        </li>
        <li>
          <code>warn</code> - Warnings (non-fatal)
        </li>
        <li>
          <code>error</code> - Errors (may be fatal)
        </li>
        <li>
          <code>debug</code> - Detailed debug information
        </li>
      </ul>

      <h2>Polling for Updates</h2>
      <p>
        For real-time updates in the dashboard, poll the logs endpoint or use
        Supabase real-time subscriptions on the execution tables.
      </p>

      <pre>
        <code>{`// Poll every 3 seconds
setInterval(async () => {
  const response = await fetch(
    \`/api/execution/\${executionId}/logs?since=\${lastTimestamp}\`,
    { headers: { Authorization: \`Bearer \${apiKey}\` } }
  );
  const { logs } = await response.json();
  // Process new logs
}, 3000);`}</code>
      </pre>

      <h2>Webhook Integration</h2>
      <p>
        Webhooks can be configured to receive execution updates. Contact support
        for webhook setup (coming soon).
      </p>
    </DocsLayout>
  );
}
