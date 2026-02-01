'use client';

import { DocsLayout } from '@/components/docs';

export default function BacklogPage() {
  return (
    <DocsLayout
      title="Backlog Management"
      description="Manage your improvement items in the backlog."
    >
      <h2>Item List</h2>
      <p>
        The backlog is the central hub for all your improvement items. Each item
        displays key information at a glance — designed so you can quickly scan
        and prioritize without diving into details.
      </p>
      <ul>
        <li>
          <strong>Title</strong> — Brief description of the improvement
        </li>
        <li>
          <strong>Category</strong> — Color-coded by type (Feature, UI,
          Security, etc.)
        </li>
        <li>
          <strong>Impact</strong> — Value score from 1-10
        </li>
        <li>
          <strong>Effort</strong> — Complexity score from 1-10
        </li>
        <li>
          <strong>Priority</strong> — Calculated as (Impact × 2) - Effort
        </li>
        <li>
          <strong>Created</strong> — When the item was added
        </li>
      </ul>

      <h2>Sorting</h2>
      <p>
        Click any column header to sort by that field. Different sorts surface
        different opportunities — here are the most useful patterns.
      </p>
      <ul>
        <li>
          <strong>Priority</strong> (highest first) — Surface the best
          opportunities
        </li>
        <li>
          <strong>Impact</strong> (highest first) — Find highest-value items
        </li>
        <li>
          <strong>Effort</strong> (lowest first) — Find quick wins
        </li>
        <li>
          <strong>Created date</strong> (newest first) — See recent suggestions
        </li>
      </ul>

      <h2>Filtering</h2>
      <p>
        As your backlog grows, filtering becomes essential. Mason provides
        multiple ways to narrow down what you&apos;re looking at.
      </p>

      <h3>By Status</h3>
      <p>
        The status tabs at the top let you focus on items at different stages of
        the workflow.
      </p>
      <ul>
        <li>
          <strong>New</strong> — Fresh items awaiting your review and decision
        </li>
        <li>
          <strong>Approved</strong> — Items you&apos;ve greenlit, ready for
          execution
        </li>
        <li>
          <strong>Completed</strong> — Successfully implemented items (your
          wins)
        </li>
        <li>
          <strong>Rejected</strong> — Items you&apos;ve declined (kept for
          reference)
        </li>
      </ul>

      <h3>By Repository</h3>
      <p>
        When you have multiple connected repositories, use the repository
        dropdown to focus on items for a specific project.
      </p>

      <h3>By Search</h3>
      <p>
        The search box filters items by title and description — useful when you
        remember what you&apos;re looking for but not where it is.
      </p>

      <h2>Bulk Actions</h2>
      <p>
        When you need to process many items at once, bulk actions save
        significant time. Select multiple items and apply the same action to all
        of them.
      </p>

      <h3>Select Items</h3>
      <p>
        There are several ways to build your selection — choose the approach
        that fits your workflow.
      </p>
      <ul>
        <li>
          <strong>Individual selection</strong> — Click checkboxes one by one
        </li>
        <li>
          <strong>Select all</strong> — Click &quot;Select All&quot; to grab
          everything visible
        </li>
        <li>
          <strong>Range selection</strong> — Shift+click to select a contiguous
          range
        </li>
      </ul>

      <h3>Available Actions</h3>
      <p>
        Once you have items selected, these bulk operations become available.
      </p>
      <ul>
        <li>
          <strong>Approve</strong> — Move all selected items to the Approved
          queue
        </li>
        <li>
          <strong>Reject</strong> — Move all selected items to Rejected
        </li>
        <li>
          <strong>Delete</strong> — Permanently remove selected items
        </li>
        <li>
          <strong>Restore</strong> — Bring rejected items back to New status
        </li>
      </ul>

      <h3>Undo</h3>
      <p>
        Made a mistake? After any bulk action, an &quot;Undo&quot; button
        appears briefly — click it to revert the action before it disappears.
      </p>

      <h2>Individual Actions</h2>
      <p>
        Every item row includes quick-action buttons for common operations —
        letting you manage items without leaving the list view.
      </p>
      <ul>
        <li>
          <strong>View</strong> — Open the full item details in a modal
        </li>
        <li>
          <strong>Approve/Reject</strong> — Change the item&apos;s status with
          one click
        </li>
        <li>
          <strong>Menu</strong> — Access additional options like edit and delete
        </li>
      </ul>

      <h2>Quick Wins</h2>
      <p>
        Mason automatically identifies items with <strong>high impact</strong>{' '}
        and <strong>low effort</strong> — these &quot;Quick Wins&quot; are
        highlighted in the Mason Recommends section. They represent the best
        return on investment and are excellent candidates to approve first.
      </p>

      <h2>Item Badges</h2>
      <p>
        Visual badges help you quickly identify special items without reading
        every detail.
      </p>
      <ul>
        <li>
          <strong>BANGER</strong> — The standout idea from each review (current
          or former)
        </li>
        <li>
          <strong>FEATURE</strong> — A new feature request (as opposed to
          improvements or fixes)
        </li>
        <li>
          <strong>Category color</strong> — Color-coded indicator of the item
          type (Feature, UI, Security, etc.)
        </li>
      </ul>
    </DocsLayout>
  );
}
