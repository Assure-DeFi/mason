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
        The <code>/pm-review</code> command analyzes your codebase across 8
        specialized categories, identifies improvements worth making, generates
        PRDs, and submits findings to your dashboard.
      </p>

      <h2>Basic Usage</h2>
      <pre>
        <code>/pm-review</code>
      </pre>
      <p>
        This runs a full analysis with default settings (8 agents, 3 items each,
        plus 1 banger idea = 25 items).
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
        <code>/pm-review --mode quick</code>
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

      <h3>--mode</h3>
      <p>Select analysis depth:</p>
      <pre>
        <code>/pm-review --mode quick</code>
      </pre>

      <h3>--auto</h3>
      <p>Headless mode for automated/scheduled runs:</p>
      <pre>
        <code>/pm-review --auto</code>
      </pre>

      <h3>--focus</h3>
      <p>Provide additional context for the analysis:</p>
      <pre>
        <code>
          /pm-review --focus &quot;focus on mobile responsiveness&quot;
        </code>
      </pre>

      <h2>Domain Knowledge</h2>
      <p>
        On your first run, Mason will ask questions about your project to
        provide more relevant suggestions:
      </p>
      <ul>
        <li>Project description</li>
        <li>Target users</li>
        <li>Current priorities</li>
        <li>Off-limits areas</li>
      </ul>
      <p>
        These answers are saved in <code>.mason/domain-knowledge.md</code> and
        can be edited manually.
      </p>

      <h2>Validation Process</h2>
      <p>Every suggestion goes through validation:</p>
      <ol>
        <li>
          <strong>Tier 1: Pattern Matching</strong> - Verifies the issue exists
          in your code
        </li>
        <li>
          <strong>Tier 2: Contextual Investigation</strong> - Confirms the
          suggestion makes sense
        </li>
        <li>
          <strong>Deduplication</strong> - Checks against existing backlog items
        </li>
      </ol>
      <p>
        Invalid or duplicate suggestions are discarded. The validation loop may
        regenerate items if needed.
      </p>

      <h2>Output</h2>
      <p>Each item includes:</p>
      <ul>
        <li>
          <strong>Title</strong> - Clear, actionable description
        </li>
        <li>
          <strong>Problem</strong> - What issue this addresses
        </li>
        <li>
          <strong>Solution</strong> - Proposed fix
        </li>
        <li>
          <strong>Impact Score (1-10)</strong> - Value added
        </li>
        <li>
          <strong>Effort Score (1-10)</strong> - Work required
        </li>
        <li>
          <strong>Priority Score</strong> - (Impact &times; 2) - Effort
        </li>
        <li>
          <strong>PRD</strong> - Full Product Requirements Document
        </li>
        <li>
          <strong>Risk Analysis</strong> - 6-factor risk assessment
        </li>
        <li>
          <strong>Benefits</strong> - 5-category benefit breakdown
        </li>
      </ul>
    </DocsLayout>
  );
}
