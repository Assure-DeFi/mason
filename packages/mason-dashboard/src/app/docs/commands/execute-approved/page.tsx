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
        The <code>/execute-approved</code> command brings your approved
        improvements to life. It fetches items from your backlog and implements
        each one using wave-based parallel execution — creating branches, making
        changes, running validations, and opening pull requests automatically.
      </p>

      <h2>Basic Usage</h2>
      <p>Execute all approved items in your backlog:</p>
      <pre>
        <code>/execute-approved</code>
      </pre>
      <p>
        Items are processed in priority order (highest priority first). There is
        no default limit — Mason will work through your entire approved queue.
      </p>

      <h2>Flags</h2>
      <p>Control what gets executed and how:</p>

      <h3>--item &lt;id&gt;</h3>
      <p>Execute a specific item by ID (useful for retrying failed items):</p>
      <pre>
        <code>/execute-approved --item abc123</code>
      </pre>

      <h3>--limit &lt;n&gt;</h3>
      <p>Cap execution at N items (good for testing your first run):</p>
      <pre>
        <code>/execute-approved --limit 3</code>
      </pre>

      <h3>--dry-run</h3>
      <p>Preview what would be executed without making any changes:</p>
      <pre>
        <code>/execute-approved --dry-run</code>
      </pre>

      <h3>--auto</h3>
      <p>Headless mode for CI/CD pipelines and scheduled runs:</p>
      <pre>
        <code>/execute-approved --auto</code>
      </pre>

      <h2>Wave-Based Execution</h2>
      <p>
        Each item is implemented in three waves using specialized agents. This
        structure ensures quality while allowing parallel work on different
        items.
      </p>

      <h3>Wave 1: Exploration</h3>
      <p>Understanding before action:</p>
      <ul>
        <li>Analyze existing code patterns</li>
        <li>Map the relevant architecture</li>
        <li>Identify dependencies and integration points</li>
        <li>Plan the implementation approach</li>
      </ul>

      <h3>Wave 2: Implementation</h3>
      <p>Making the changes:</p>
      <ul>
        <li>Write or modify code</li>
        <li>Add tests for new functionality</li>
        <li>Update documentation as needed</li>
        <li>Handle edge cases</li>
      </ul>

      <h3>Wave 3: Validation</h3>
      <p>Ensuring quality:</p>
      <ul>
        <li>Run the test suite</li>
        <li>Perform code review checks</li>
        <li>Verify build and lint pass</li>
        <li>Create the pull request</li>
      </ul>

      <h2>Pre-Execution Checks</h2>
      <p>Before starting work on each item, Mason verifies prerequisites:</p>
      <ul>
        <li>
          <strong>PRD exists</strong> — Items without PRDs are skipped
        </li>
        <li>
          <strong>PRD has task breakdown</strong> — Needed for wave planning
        </li>
        <li>
          <strong>Item is still approved</strong> — Status hasn&apos;t changed
          since you queued it
        </li>
      </ul>

      <h2>Branch Strategy</h2>
      <p>
        Each item gets its own branch named{' '}
        <code>mason/&lt;item-title-slug&gt;</code>. Branches are created from
        your current branch (usually <code>main</code>), keeping changes
        isolated until you&apos;re ready to merge.
      </p>

      <h2>Pull Request Creation</h2>
      <p>After implementation completes, Mason opens a PR with:</p>
      <ul>
        <li>Descriptive title based on the item</li>
        <li>Summary of changes made</li>
        <li>Link back to the original backlog item</li>
        <li>Test plan for verification</li>
      </ul>

      <h2>Progress Tracking</h2>
      <p>Watch execution progress in real-time from your dashboard:</p>
      <ul>
        <li>
          <strong>Status updates</strong> — pending → in_progress → completed
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
