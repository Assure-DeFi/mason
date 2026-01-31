'use client';

import { DocsLayout } from '@/components/docs';

export default function FirstReviewPage() {
  return (
    <DocsLayout
      title="Your First Review"
      description="What to expect when you run /pm-review for the first time."
    >
      <h2>Running the Review</h2>
      <p>In Claude Code, navigate to your project directory and run:</p>
      <pre>
        <code>/pm-review</code>
      </pre>

      <h2>Domain Knowledge Setup</h2>
      <p>
        On your first run, Mason will ask you some questions to understand your
        project:
      </p>
      <ul>
        <li>
          <strong>What does this project do?</strong> - Brief description of
          your app
        </li>
        <li>
          <strong>Who are your users?</strong> - Target audience and personas
        </li>
        <li>
          <strong>Current priorities?</strong> - What you&apos;re focused on
          shipping
        </li>
        <li>
          <strong>Off-limits areas?</strong> - Code Mason shouldn&apos;t suggest
          changes to
        </li>
      </ul>
      <p>
        These answers are saved locally and used to provide more relevant
        suggestions.
      </p>

      <h2>The Analysis Process</h2>
      <p>Mason analyzes your codebase in parallel across 8 categories:</p>

      <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
        {[
          {
            name: 'Feature',
            color: 'bg-purple-500/20 border-purple-500/30',
            desc: 'New functionality',
          },
          {
            name: 'UI',
            color: 'bg-yellow-500/20 border-yellow-500/30',
            desc: 'Visual improvements',
          },
          {
            name: 'UX',
            color: 'bg-cyan-500/20 border-cyan-500/30',
            desc: 'User flow optimization',
          },
          {
            name: 'API',
            color: 'bg-green-500/20 border-green-500/30',
            desc: 'Backend endpoints',
          },
          {
            name: 'Data',
            color: 'bg-blue-500/20 border-blue-500/30',
            desc: 'Database queries',
          },
          {
            name: 'Security',
            color: 'bg-red-500/20 border-red-500/30',
            desc: 'Vulnerabilities',
          },
          {
            name: 'Performance',
            color: 'bg-orange-500/20 border-orange-500/30',
            desc: 'Speed optimization',
          },
          {
            name: 'Code Quality',
            color: 'bg-gray-500/20 border-gray-500/30',
            desc: 'Tech debt',
          },
        ].map((cat) => (
          <div key={cat.name} className={`rounded-lg border p-3 ${cat.color}`}>
            <div className="font-medium text-white">{cat.name}</div>
            <div className="text-sm text-gray-400">{cat.desc}</div>
          </div>
        ))}
      </div>

      <h2>What Gets Generated</h2>
      <p>For each improvement, Mason generates:</p>
      <ul>
        <li>
          <strong>Title &amp; Description</strong> - Clear explanation of the
          improvement
        </li>
        <li>
          <strong>Impact Score (1-10)</strong> - How much value this adds
        </li>
        <li>
          <strong>Effort Score (1-10)</strong> - How much work required
        </li>
        <li>
          <strong>Priority Score</strong> - Calculated as (Impact &times; 2) -
          Effort
        </li>
        <li>
          <strong>PRD</strong> - Full Product Requirements Document
        </li>
        <li>
          <strong>Risk Analysis</strong> - 6-factor risk assessment
        </li>
      </ul>

      <h2>The Banger Idea</h2>
      <p>
        Each review includes one &quot;Banger Idea&quot; - a transformative
        feature that could significantly improve your product. These are larger
        scope (multi-week projects) and are highlighted separately in the
        dashboard.
      </p>
      <p>
        Only one banger exists at a time. When a new one is discovered, the
        previous banger moves to the Feature Ideas section.
      </p>

      <h2>Validation Process</h2>
      <p>Mason doesn&apos;t just generate suggestions - it validates them:</p>
      <ol>
        <li>
          <strong>Tier 1: Pattern Matching</strong> - Verifies the issue exists
          in code
        </li>
        <li>
          <strong>Tier 2: Contextual Investigation</strong> - Checks if the
          suggestion makes sense
        </li>
        <li>
          <strong>Deduplication</strong> - Ensures no duplicates of existing
          backlog items
        </li>
      </ol>

      <h2>Review Duration</h2>
      <p>
        A full review typically takes 2-5 minutes depending on codebase size.
        Quick mode (<code>/pm-review --mode quick</code>) takes about 1-2
        minutes.
      </p>

      <h2>After the Review</h2>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/admin/backlog">
            your dashboard
          </a>
        </li>
        <li>Review the suggestions in the &quot;New&quot; tab</li>
        <li>Click on items to see full details, PRDs, and risk analysis</li>
        <li>
          <strong>Approve</strong> items you want to implement
        </li>
        <li>
          <strong>Reject</strong> items that aren&apos;t relevant
        </li>
      </ol>

      <h2>Running Again</h2>
      <p>
        You can run <code>/pm-review</code> as often as you like. Mason will:
      </p>
      <ul>
        <li>Skip items already in your backlog (deduplication)</li>
        <li>Find new improvements based on code changes</li>
        <li>Potentially rotate the banger idea if a better one is found</li>
      </ul>
    </DocsLayout>
  );
}
