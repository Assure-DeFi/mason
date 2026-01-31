'use client';

import { DocsLayout } from '@/components/docs';

export default function ExecuteApprovedPage() {
  return (
    <DocsLayout
      title="/execute-approved"
      description="Execute approved items from your backlog."
    >
      <h2>Overview</h2>
      <p>
        The <code>/execute-approved</code> command fetches all approved items
        from your backlog and implements them using wave-based parallel
        execution. It creates branches, makes changes, and opens pull requests.
      </p>

      <h2>Basic Usage</h2>
      <pre>
        <code>/execute-approved</code>
      </pre>
      <p>
        This executes ALL approved items with no limit. Items are processed in
        priority order.
      </p>

      <h2>Flags</h2>

      <h3>--item &lt;id&gt;</h3>
      <p>Execute a specific item by ID:</p>
      <pre>
        <code>/execute-approved --item abc123</code>
      </pre>

      <h3>--limit &lt;n&gt;</h3>
      <p>Cap execution at N items:</p>
      <pre>
        <code>/execute-approved --limit 3</code>
      </pre>

      <h3>--dry-run</h3>
      <p>Preview what would be executed without making changes:</p>
      <pre>
        <code>/execute-approved --dry-run</code>
      </pre>

      <h3>--auto</h3>
      <p>Headless mode for automated/scheduled runs:</p>
      <pre>
        <code>/execute-approved --auto</code>
      </pre>

      <h2>Wave-Based Execution</h2>
      <p>
        Items are implemented in waves using specialized subagents. This allows
        parallel work while respecting dependencies.
      </p>

      <h3>Wave 1: Exploration</h3>
      <ul>
        <li>Analyze existing code patterns</li>
        <li>Understand architecture</li>
        <li>Identify dependencies</li>
        <li>Plan implementation approach</li>
      </ul>

      <h3>Wave 2: Implementation</h3>
      <ul>
        <li>Make code changes</li>
        <li>Write tests</li>
        <li>Update documentation</li>
        <li>Handle edge cases</li>
      </ul>

      <h3>Wave 3: Validation</h3>
      <ul>
        <li>Run tests</li>
        <li>Code review</li>
        <li>Quality checks</li>
        <li>Create pull request</li>
      </ul>

      <h2>Pre-Execution Checks</h2>
      <p>Before executing each item, Mason verifies:</p>
      <ul>
        <li>
          <strong>PRD exists</strong> - Items without PRDs are skipped
        </li>
        <li>
          <strong>PRD has task breakdown</strong> - Ensures proper wave planning
        </li>
        <li>
          <strong>Item is still approved</strong> - Status hasn&apos;t changed
        </li>
      </ul>

      <h2>Branch Strategy</h2>
      <p>
        Each item gets its own branch named{' '}
        <code>mason/&lt;item-title-slug&gt;</code>. The branch is created from
        your current branch (usually <code>main</code>).
      </p>

      <h2>Pull Request Creation</h2>
      <p>After implementation, Mason creates a PR with:</p>
      <ul>
        <li>Descriptive title from item</li>
        <li>Summary of changes</li>
        <li>Link to original backlog item</li>
        <li>Test plan</li>
      </ul>

      <h2>Progress Tracking</h2>
      <p>
        Execution progress is tracked in real-time and visible in your
        dashboard:
      </p>
      <ul>
        <li>
          <strong>Status updates</strong> - pending → in_progress → completed
        </li>
        <li>
          <strong>Log streaming</strong> - See what Mason is doing
        </li>
        <li>
          <strong>Error handling</strong> - Clear messages if something fails
        </li>
      </ul>

      <h2>After Execution</h2>
      <ol>
        <li>Review the generated pull requests</li>
        <li>Run any additional tests</li>
        <li>Merge when ready</li>
        <li>
          Items auto-mark as &quot;completed&quot; when PRs merge (if webhook is
          configured)
        </li>
      </ol>

      <h2>Error Handling</h2>
      <p>If execution fails:</p>
      <ul>
        <li>Item status changes to show the error</li>
        <li>Detailed logs are saved</li>
        <li>Other items continue executing</li>
        <li>You can retry failed items individually</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>
          <strong>Start small</strong> - Try <code>--limit 1</code> first
        </li>
        <li>
          <strong>Review PRs promptly</strong> - Don&apos;t let them pile up
        </li>
        <li>
          <strong>Use dry-run</strong> - Preview before large batches
        </li>
        <li>
          <strong>Check dashboard</strong> - Monitor progress in real-time
        </li>
      </ul>
    </DocsLayout>
  );
}
