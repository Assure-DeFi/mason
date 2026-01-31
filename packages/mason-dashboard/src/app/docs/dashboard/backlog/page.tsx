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
        The backlog displays items in a table with key information at a glance:
      </p>
      <ul>
        <li>
          <strong>Title</strong> - Brief description of the improvement
        </li>
        <li>
          <strong>Category</strong> - Color-coded by type (Feature, UI, etc.)
        </li>
        <li>
          <strong>Impact</strong> - Score from 1-10
        </li>
        <li>
          <strong>Effort</strong> - Score from 1-10
        </li>
        <li>
          <strong>Priority</strong> - Calculated score
        </li>
        <li>
          <strong>Created</strong> - When the item was added
        </li>
      </ul>

      <h2>Sorting</h2>
      <p>Click column headers to sort by:</p>
      <ul>
        <li>Title (alphabetical)</li>
        <li>Priority (highest first)</li>
        <li>Impact (highest first)</li>
        <li>Effort (lowest first)</li>
        <li>Created date (newest first)</li>
      </ul>

      <h2>Filtering</h2>

      <h3>By Status</h3>
      <p>Use the tabs to filter by status:</p>
      <ul>
        <li>
          <strong>New</strong> - Items awaiting review
        </li>
        <li>
          <strong>Approved</strong> - Items ready for execution
        </li>
        <li>
          <strong>Completed</strong> - Successfully implemented items
        </li>
        <li>
          <strong>Rejected</strong> - Declined items
        </li>
      </ul>

      <h3>By Repository</h3>
      <p>
        Use the repository dropdown to view items for a specific connected
        repository.
      </p>

      <h3>By Search</h3>
      <p>Use the search box to find items by title or description.</p>

      <h2>Bulk Actions</h2>
      <p>Select multiple items using checkboxes to perform bulk operations:</p>

      <h3>Select Items</h3>
      <ul>
        <li>Click individual checkboxes</li>
        <li>Click &quot;Select All&quot; to select all visible items</li>
        <li>Shift+click to select a range</li>
      </ul>

      <h3>Available Actions</h3>
      <ul>
        <li>
          <strong>Approve</strong> - Move selected items to &quot;Approved&quot;
        </li>
        <li>
          <strong>Reject</strong> - Move selected items to &quot;Rejected&quot;
        </li>
        <li>
          <strong>Delete</strong> - Remove items permanently
        </li>
        <li>
          <strong>Restore</strong> - Bring back rejected items
        </li>
      </ul>

      <h3>Undo</h3>
      <p>
        After bulk actions, an &quot;Undo&quot; button appears briefly. Click it
        to revert the action.
      </p>

      <h2>Individual Actions</h2>
      <p>Each item row has action buttons:</p>
      <ul>
        <li>
          <strong>View</strong> - Open item details modal
        </li>
        <li>
          <strong>Approve/Reject</strong> - Change status
        </li>
        <li>
          <strong>Menu</strong> - Additional options (edit, delete)
        </li>
      </ul>

      <h2>Quick Wins</h2>
      <p>
        Items with high impact and low effort are marked as &quot;Quick
        Wins&quot; and highlighted in the Mason Recommends section. These are
        good candidates to approve first.
      </p>

      <h2>Item Badges</h2>
      <p>Special badges indicate:</p>
      <ul>
        <li>
          <strong>BANGER</strong> - The current or former banger idea
        </li>
        <li>
          <strong>FEATURE</strong> - A new feature (vs improvement/fix)
        </li>
        <li>
          <strong>Category color</strong> - Visual indicator of item type
        </li>
      </ul>
    </DocsLayout>
  );
}
