'use client';

import { DocsLayout } from '@/components/docs';

export default function PRDsPage() {
  return (
    <DocsLayout
      title="PRDs & Tasks"
      description="How Product Requirements Documents drive execution."
    >
      <h2>What is a PRD?</h2>
      <p>
        A Product Requirements Document (PRD) is generated for every improvement
        item. It contains everything needed to understand and implement the
        change.
      </p>

      <h2>PRD Structure</h2>
      <p>Each PRD includes:</p>

      <h3>Overview</h3>
      <ul>
        <li>Problem statement</li>
        <li>Goals and objectives</li>
        <li>Success metrics</li>
      </ul>

      <h3>User Stories</h3>
      <p>
        Formatted as &quot;As a [role], I want [feature] so that [benefit]&quot;
      </p>

      <h3>Requirements</h3>
      <ul>
        <li>Functional requirements (what it does)</li>
        <li>Non-functional requirements (how it performs)</li>
        <li>Constraints and assumptions</li>
      </ul>

      <h3>Technical Approach</h3>
      <ul>
        <li>Proposed architecture</li>
        <li>Key files to modify</li>
        <li>Dependencies and integrations</li>
      </ul>

      <h3>Task Breakdown</h3>
      <p>
        Wave-based implementation plan that drives{' '}
        <code>/execute-approved</code>:
      </p>

      <div className="not-prose my-6 space-y-4">
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <h4 className="font-semibold text-white">Wave 1: Exploration</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-300">
            <li>Analyze existing patterns</li>
            <li>Identify dependencies</li>
            <li>Plan implementation approach</li>
          </ul>
        </div>

        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <h4 className="font-semibold text-white">Wave 2: Implementation</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-300">
            <li>Make code changes</li>
            <li>Write tests</li>
            <li>Update documentation</li>
          </ul>
        </div>

        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
          <h4 className="font-semibold text-white">Wave 3: Validation</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-300">
            <li>Run tests</li>
            <li>Code review</li>
            <li>Create pull request</li>
          </ul>
        </div>
      </div>

      <h3>Success Criteria</h3>
      <p>How to verify the implementation is complete:</p>
      <ul>
        <li>Acceptance tests that must pass</li>
        <li>Manual verification steps</li>
        <li>Performance benchmarks (if applicable)</li>
      </ul>

      <h3>Out of Scope</h3>
      <p>
        Explicitly lists what this change does NOT include, preventing scope
        creep.
      </p>

      <h2>PRD Generation</h2>
      <p>PRDs are generated during PM review:</p>
      <ol>
        <li>Item is identified and validated</li>
        <li>PRD is generated with full context</li>
        <li>PRD is stored alongside the item</li>
        <li>Available in dashboard detail view</li>
      </ol>

      <h2>PRD Requirements</h2>
      <p>
        Items cannot be executed without a PRD. The{' '}
        <code>/execute-approved</code> command verifies:
      </p>
      <ul>
        <li>PRD exists</li>
        <li>PRD has task breakdown</li>
        <li>Tasks are wave-compatible</li>
      </ul>

      <h2>Regenerating PRDs</h2>
      <p>If a PRD needs updating:</p>
      <ol>
        <li>Open item detail in dashboard</li>
        <li>Go to PRD tab</li>
        <li>Click &quot;Regenerate PRD&quot;</li>
      </ol>
      <p>This creates a fresh PRD with current codebase context.</p>
    </DocsLayout>
  );
}
