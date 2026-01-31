'use client';

import { DocsLayout } from '@/components/docs';

export default function ExecutionPage() {
  return (
    <DocsLayout
      title="Execution Tracking"
      description="Monitor item execution progress in real-time."
    >
      <h2>Real-Time Progress</h2>
      <p>
        When you run <code>/execute-approved</code>, the dashboard shows
        real-time progress:
      </p>
      <ul>
        <li>
          <strong>Status updates</strong> - See items move through stages
        </li>
        <li>
          <strong>Log streaming</strong> - Watch what Mason is doing
        </li>
        <li>
          <strong>Wave progress</strong> - Track exploration, implementation,
          validation
        </li>
      </ul>

      <h2>Execution States</h2>
      <p>Items go through these states during execution:</p>

      <div className="not-prose my-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-gray-700 px-2 py-1 text-sm text-white">
            approved
          </span>
          <span className="text-gray-500">→</span>
          <span className="rounded bg-blue-600 px-2 py-1 text-sm text-white">
            in_progress
          </span>
          <span className="text-gray-500">→</span>
          <span className="rounded bg-green-600 px-2 py-1 text-sm text-white">
            completed
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-400">Or if something fails:</p>
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-600 px-2 py-1 text-sm text-white">
            in_progress
          </span>
          <span className="text-gray-500">→</span>
          <span className="rounded bg-red-600 px-2 py-1 text-sm text-white">
            failed
          </span>
        </div>
      </div>

      <h2>Execution Logs</h2>
      <p>Click on an executing item to see detailed logs. These show:</p>
      <ul>
        <li>What files are being analyzed</li>
        <li>What changes are being made</li>
        <li>Test results</li>
        <li>Any errors or warnings</li>
      </ul>

      <h2>Wave Visualization</h2>
      <p>
        Execution happens in waves. The dashboard shows which wave is currently
        active:
      </p>
      <ol>
        <li>
          <strong>Wave 1: Exploration</strong> - Understanding the codebase
        </li>
        <li>
          <strong>Wave 2: Implementation</strong> - Making changes
        </li>
        <li>
          <strong>Wave 3: Validation</strong> - Testing and review
        </li>
      </ol>

      <h2>Multiple Items</h2>
      <p>
        When executing multiple items, they run in parallel where possible. The
        dashboard shows progress for each:
      </p>
      <ul>
        <li>Individual progress bars per item</li>
        <li>Overall completion percentage</li>
        <li>Estimated time remaining</li>
      </ul>

      <h2>Pull Request Links</h2>
      <p>
        When items complete, links to the generated pull requests appear. Click
        to go directly to GitHub for review.
      </p>

      <h2>Error Handling</h2>
      <p>If execution fails:</p>
      <ul>
        <li>Item status shows &quot;failed&quot;</li>
        <li>Error message is displayed</li>
        <li>Full logs are preserved</li>
        <li>Other items continue executing</li>
      </ul>

      <h3>Retrying Failed Items</h3>
      <p>To retry a failed item:</p>
      <ol>
        <li>Review the error logs</li>
        <li>Fix any underlying issues (if in your codebase)</li>
        <li>
          Run <code>/execute-approved --item &lt;id&gt;</code>
        </li>
      </ol>

      <h2>Completed Items</h2>
      <p>Successfully executed items:</p>
      <ul>
        <li>Move to &quot;Completed&quot; tab</li>
        <li>Show link to PR</li>
        <li>Record execution duration</li>
        <li>Preserve logs for reference</li>
      </ul>
    </DocsLayout>
  );
}
