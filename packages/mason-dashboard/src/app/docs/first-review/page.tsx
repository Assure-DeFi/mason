'use client';

import { DocsLayout } from '@/components/docs';

export default function FirstReviewPage() {
  return (
    <DocsLayout
      title="Your First Review"
      description="What to expect when you run /pm-review for the first time."
    >
      <h2>Running the Review</h2>
      <p>
        Open Claude Code in your project directory and run your first review:
      </p>
      <pre>
        <code>/pm-review</code>
      </pre>

      <h2>Domain Knowledge Setup</h2>
      <p>
        On your first run, Mason asks a few questions to understand your project
        context. This helps generate more relevant, targeted suggestions:
      </p>
      <ul>
        <li>
          <strong>What does this project do?</strong> — A brief description of
          your application and its purpose
        </li>
        <li>
          <strong>Who are your users?</strong> — Target audience, personas, and
          use cases
        </li>
        <li>
          <strong>Current priorities?</strong> — What you&apos;re actively
          working on or focused on shipping
        </li>
        <li>
          <strong>Off-limits areas?</strong> — Code or components Mason should
          skip when suggesting changes
        </li>
      </ul>
      <p>
        Your answers are saved locally in{' '}
        <code>.mason/domain-knowledge.md</code> and reused for future reviews.
        You can edit this file anytime to update your project context.
      </p>

      <h2>The Analysis Process</h2>
      <p>
        Mason analyzes your codebase in parallel using 8 specialized agents,
        each focused on a different category:
      </p>

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
      <p>For each improvement Mason finds, you get a complete package:</p>
      <ul>
        <li>
          <strong>Title &amp; Description</strong> — Clear explanation of the
          improvement and why it matters
        </li>
        <li>
          <strong>Impact Score (1-10)</strong> — How much value this adds to
          your product
        </li>
        <li>
          <strong>Effort Score (1-10)</strong> — Estimated implementation
          complexity
        </li>
        <li>
          <strong>Priority Score</strong> — Automatically calculated as (Impact
          × 2) - Effort to surface quick wins
        </li>
        <li>
          <strong>Full PRD</strong> — Complete Product Requirements Document
          with user stories, requirements, and task breakdown
        </li>
        <li>
          <strong>Risk Analysis</strong> — 6-factor risk assessment covering
          technical, integration, performance, security, scope, and testing
          risks
        </li>
      </ul>

      <h2>The Banger Idea</h2>
      <p>
        Each review includes one <strong>&quot;Banger Idea&quot;</strong> — a
        transformative feature that could significantly improve your product.
        Bangers are larger in scope (typically multi-week projects) and
        represent strategic opportunities rather than tactical fixes.
      </p>
      <p>
        Only one banger exists at a time per repository. When a new, better
        banger is discovered, the previous one moves to the Feature Ideas
        section with a &quot;BANGER&quot; badge — you don&apos;t lose it.
      </p>

      <h2>Validation Process</h2>
      <p>
        Mason doesn&apos;t just generate suggestions — it validates them to
        reduce noise:
      </p>
      <ol>
        <li>
          <strong>Tier 1: Pattern Matching</strong> — Verifies the issue
          actually exists in your codebase
        </li>
        <li>
          <strong>Tier 2: Contextual Investigation</strong> — Confirms the
          suggestion makes sense given your project context
        </li>
        <li>
          <strong>Deduplication</strong> — Checks against your existing backlog
          to avoid duplicate suggestions
        </li>
      </ol>
      <p>
        Items that fail validation are discarded. The validation loop may
        regenerate items if too many fail.
      </p>

      <h2>Review Duration</h2>
      <p>
        A full review typically takes <strong>2-5 minutes</strong> depending on
        codebase size. For faster iteration, use quick mode:
      </p>
      <pre>
        <code>/pm-review quick</code>
      </pre>
      <p>
        Quick mode generates fewer items (1 per category vs 3) and completes in
        about 1-2 minutes.
      </p>

      <h2>After the Review</h2>
      <p>Once the review completes, head to your dashboard to triage:</p>
      <ol>
        <li>
          Go to{' '}
          <a href="https://mason.assuredefi.com/admin/backlog">
            your dashboard
          </a>
        </li>
        <li>
          Browse suggestions in the <strong>&quot;New&quot;</strong> tab —
          they&apos;re sorted by priority score
        </li>
        <li>
          Click any item to view its full PRD, risk analysis, and benefit
          breakdown
        </li>
        <li>
          <strong>Approve</strong> items you want Mason to implement
        </li>
        <li>
          <strong>Reject</strong> items that aren&apos;t relevant to your
          current goals
        </li>
      </ol>

      <h2>Running Again</h2>
      <p>
        Run <code>/pm-review</code> as often as you like — after shipping new
        code, fixing bugs, or just periodically:
      </p>
      <ul>
        <li>
          <strong>Automatic deduplication</strong> — Mason skips items already
          in your backlog
        </li>
        <li>
          <strong>Fresh analysis</strong> — New suggestions based on your latest
          code changes
        </li>
        <li>
          <strong>Banger rotation</strong> — If a better transformative idea is
          found, it becomes the new banger
        </li>
      </ul>
    </DocsLayout>
  );
}
