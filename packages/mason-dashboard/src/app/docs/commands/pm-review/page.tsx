'use client';

import { DocsLayout } from '@/components/docs';

export default function PmReviewPage() {
  return (
    <DocsLayout
      title="/pm-review"
      description="Analyze your codebase and generate improvement suggestions."
    >
      <h2>Overview</h2>
      <p>
        The <code>/pm-review</code> command is your primary tool for discovering
        improvements. It analyzes your codebase across 8 specialized categories,
        surfaces issues worth fixing, generates complete PRDs for each one, and
        submits everything to your dashboard for review.
      </p>

      <h2>Basic Usage</h2>
      <p>Run a full analysis with sensible defaults:</p>
      <pre>
        <code>/pm-review</code>
      </pre>
      <p>
        This launches 8 specialized agents in parallel, each generating up to 3
        items, plus 1 &quot;banger idea&quot; — yielding up to 25 improvements
        per review.
      </p>

      <h2>Modes</h2>

      <h3>Full Mode (Default)</h3>
      <pre>
        <code>/pm-review</code>
      </pre>
      <ul>
        <li>8 agents analyzing in parallel</li>
        <li>3 items per category</li>
        <li>1 &quot;banger idea&quot; (transformative feature)</li>
        <li>Total: up to 25 items</li>
        <li>Duration: 2-5 minutes</li>
      </ul>

      <h3>Quick Mode</h3>
      <pre>
        <code>/pm-review quick</code>
      </pre>
      <ul>
        <li>8 agents analyzing in parallel</li>
        <li>1 item per category</li>
        <li>1 &quot;banger idea&quot;</li>
        <li>Total: up to 9 items</li>
        <li>Duration: 1-2 minutes</li>
      </ul>

      <h3>Focus Mode</h3>
      <pre>
        <code>/pm-review area:security</code>
      </pre>
      <ul>
        <li>Deep-dive on a single category</li>
        <li>5 items in that category</li>
        <li>No banger idea</li>
        <li>Duration: 1-2 minutes</li>
      </ul>
      <p>Available focus areas:</p>
      <ul>
        <li>
          <code>area:feature</code> - New functionality
        </li>
        <li>
          <code>area:ui</code> - Visual improvements
        </li>
        <li>
          <code>area:ux</code> - User flow optimization
        </li>
        <li>
          <code>area:api</code> - Backend endpoints
        </li>
        <li>
          <code>area:data</code> - Database queries
        </li>
        <li>
          <code>area:security</code> - Vulnerabilities
        </li>
        <li>
          <code>area:performance</code> - Speed optimization
        </li>
        <li>
          <code>area:code-quality</code> - Tech debt
        </li>
      </ul>

      <h2>Categories</h2>
      <p>Mason analyzes your codebase across these 8 categories:</p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Category
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Color
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Focus
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-white">Feature</td>
              <td className="py-3 text-purple-400">Purple</td>
              <td className="py-3 text-gray-400">New functionality</td>
            </tr>
            <tr>
              <td className="py-3 text-white">UI</td>
              <td className="py-3 text-yellow-400">Gold</td>
              <td className="py-3 text-gray-400">Visual improvements</td>
            </tr>
            <tr>
              <td className="py-3 text-white">UX</td>
              <td className="py-3 text-cyan-400">Cyan</td>
              <td className="py-3 text-gray-400">User flow optimization</td>
            </tr>
            <tr>
              <td className="py-3 text-white">API</td>
              <td className="py-3 text-green-400">Green</td>
              <td className="py-3 text-gray-400">Backend endpoints</td>
            </tr>
            <tr>
              <td className="py-3 text-white">Data</td>
              <td className="py-3 text-blue-400">Blue</td>
              <td className="py-3 text-gray-400">Database queries</td>
            </tr>
            <tr>
              <td className="py-3 text-white">Security</td>
              <td className="py-3 text-red-400">Red</td>
              <td className="py-3 text-gray-400">Vulnerabilities</td>
            </tr>
            <tr>
              <td className="py-3 text-white">Performance</td>
              <td className="py-3 text-orange-400">Orange</td>
              <td className="py-3 text-gray-400">Speed optimization</td>
            </tr>
            <tr>
              <td className="py-3 text-white">Code Quality</td>
              <td className="py-3 text-gray-400">Gray</td>
              <td className="py-3 text-gray-400">Tech debt</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Flags</h2>

      <h3>quick</h3>
      <p>Quick analysis mode (9 items instead of 25):</p>
      <pre>
        <code>/pm-review quick</code>
      </pre>

      <h3>--auto</h3>
      <p>Headless mode for automated/scheduled runs:</p>
      <pre>
        <code>/pm-review --auto</code>
      </pre>

      <h3>Focus Context</h3>
      <p>Provide additional context to narrow the analysis:</p>
      <pre>
        <code>
          {`/pm-review

Focus on: mobile responsiveness`}
        </code>
      </pre>

      <h2>Domain Knowledge</h2>
      <p>
        On your first run, Mason asks about your project to generate more
        relevant suggestions:
      </p>
      <ul>
        <li>
          <strong>Project description</strong> — What does your application do?
        </li>
        <li>
          <strong>Target users</strong> — Who are you building for?
        </li>
        <li>
          <strong>Current priorities</strong> — What are you focused on
          shipping?
        </li>
        <li>
          <strong>Off-limits areas</strong> — Code Mason should avoid touching
        </li>
      </ul>
      <p>
        Answers are saved in <code>.mason/domain-knowledge.md</code> — edit this
        file anytime to update your project context.
      </p>

      <h2>Validation Process</h2>
      <p>
        Every suggestion goes through a multi-tier validation process before
        reaching your dashboard:
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
          <strong>Deduplication</strong> — Checks against existing backlog items
          to avoid duplicates
        </li>
      </ol>
      <p>
        Invalid or duplicate suggestions are discarded automatically. If too
        many fail validation, the loop may regenerate items.
      </p>

      <h2>Output</h2>
      <p>
        Each validated item arrives in your dashboard with a complete package:
      </p>
      <ul>
        <li>
          <strong>Title</strong> — Clear, actionable description
        </li>
        <li>
          <strong>Problem</strong> — The issue this improvement addresses
        </li>
        <li>
          <strong>Solution</strong> — The proposed approach
        </li>
        <li>
          <strong>Impact Score (1-10)</strong> — How much value this adds
        </li>
        <li>
          <strong>Effort Score (1-10)</strong> — Implementation complexity
        </li>
        <li>
          <strong>Priority Score</strong> — Calculated as (Impact × 2) - Effort
          to surface quick wins
        </li>
        <li>
          <strong>Full PRD</strong> — Complete Product Requirements Document
          with user stories, task breakdown, and success criteria
        </li>
        <li>
          <strong>Risk Analysis</strong> — 6-factor assessment (technical,
          integration, performance, security, scope, testing)
        </li>
        <li>
          <strong>Benefits</strong> — 5-category breakdown (UX, sales, ops,
          performance, reliability)
        </li>
      </ul>
    </DocsLayout>
  );
}
