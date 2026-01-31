'use client';

import { DocsLayout } from '@/components/docs';

export default function APIBacklogPage() {
  return (
    <DocsLayout
      title="Backlog Endpoints"
      description="API endpoints for managing backlog items."
    >
      <h2>Get Next Approved Items</h2>
      <h3>GET /api/v1/backlog/next</h3>
      <p>Returns highest-priority approved items ready for execution.</p>

      <h4>Query Parameters</h4>
      <ul>
        <li>
          <code>limit</code> - Maximum items to return (optional)
        </li>
        <li>
          <code>repo</code> - Filter by repository ID (optional)
        </li>
      </ul>

      <h4>Request</h4>
      <pre>
        <code>{`curl https://mason.assuredefi.com/api/v1/backlog/next?limit=5 \\
  -H "Authorization: Bearer mason_your_api_key"`}</code>
      </pre>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "items": [
    {
      "id": "item_abc123",
      "title": "Add pagination to user list",
      "status": "approved",
      "priority_score": 15,
      "impact_score": 9,
      "effort_score": 3,
      "category": "api",
      "has_prd": true
    }
  ]
}`}</code>
      </pre>

      <h2>Start Item Execution</h2>
      <h3>GET /api/v1/backlog/[id]/start</h3>
      <p>Marks an item as &quot;in progress&quot; and returns its PRD.</p>

      <h4>Request</h4>
      <pre>
        <code>{`curl https://mason.assuredefi.com/api/v1/backlog/item_abc123/start \\
  -H "Authorization: Bearer mason_your_api_key"`}</code>
      </pre>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "item": {
    "id": "item_abc123",
    "title": "Add pagination to user list",
    "status": "in_progress",
    "prd": "# PRD: Add Pagination\\n\\n## Overview..."
  }
}`}</code>
      </pre>

      <h2>Complete Item</h2>
      <h3>GET /api/v1/backlog/[id]/complete</h3>
      <p>Marks an item as completed (PR merged).</p>

      <h4>Request</h4>
      <pre>
        <code>{`curl https://mason.assuredefi.com/api/v1/backlog/item_abc123/complete \\
  -H "Authorization: Bearer mason_your_api_key"`}</code>
      </pre>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "item": {
    "id": "item_abc123",
    "status": "completed",
    "completed_at": "2024-01-15T10:30:00Z"
  }
}`}</code>
      </pre>

      <h2>Mark Item Failed</h2>
      <h3>GET /api/v1/backlog/[id]/fail</h3>
      <p>Marks an item as failed with error details.</p>

      <h4>Query Parameters</h4>
      <ul>
        <li>
          <code>reason</code> - Error message (optional)
        </li>
      </ul>

      <h4>Request</h4>
      <pre>
        <code>{`curl "https://mason.assuredefi.com/api/v1/backlog/item_abc123/fail?reason=Test%20failure" \\
  -H "Authorization: Bearer mason_your_api_key"`}</code>
      </pre>

      <h2>Get Item PRD</h2>
      <h3>GET /api/prd/[id]</h3>
      <p>Retrieves the PRD for a specific item.</p>

      <h4>Response</h4>
      <pre>
        <code>{`{
  "success": true,
  "prd": "# PRD: Add Pagination\\n\\n## Overview\\n..."
}`}</code>
      </pre>

      <h2>Notes</h2>
      <ul>
        <li>These endpoints update your Supabase database directly</li>
        <li>
          The API validates your identity, then operations happen in your DB
        </li>
        <li>Item IDs are specific to your database</li>
      </ul>
    </DocsLayout>
  );
}
