'use client';

import { DocsLayout } from '@/components/docs';

export default function ScoringPage() {
  return (
    <DocsLayout
      title="Scoring System"
      description="How Mason prioritizes and ranks improvements."
    >
      <h2>Core Scores</h2>
      <p>
        Every improvement item receives three scores that help you prioritize
        what to build:
      </p>

      <h3>Impact Score (1-10)</h3>
      <p>How much value this improvement adds to your product:</p>
      <ul>
        <li>
          <strong>1-3</strong> — Minor improvement, nice to have
        </li>
        <li>
          <strong>4-6</strong> — Meaningful improvement, noticeable benefit
        </li>
        <li>
          <strong>7-8</strong> — Significant improvement, major benefit
        </li>
        <li>
          <strong>9-10</strong> — Critical improvement, potentially
          transformative
        </li>
      </ul>

      <h3>Effort Score (1-10)</h3>
      <p>Implementation complexity and time investment:</p>
      <ul>
        <li>
          <strong>1-3</strong> — Quick fix, under an hour
        </li>
        <li>
          <strong>4-6</strong> — Half day to a few days
        </li>
        <li>
          <strong>7-8</strong> — About a week of work
        </li>
        <li>
          <strong>9-10</strong> — Multi-week project
        </li>
      </ul>

      <h3>Priority Score (Calculated)</h3>
      <p>This determines how items are ranked in your backlog:</p>
      <pre>
        <code>Priority = (Impact × 2) - Effort</code>
      </pre>
      <p>
        The formula weights impact more heavily than effort, surfacing
        &quot;quick wins&quot; — high-value improvements that don&apos;t take
        long to build.
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Impact
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Effort
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Priority
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-white">9</td>
              <td className="py-3 text-white">3</td>
              <td className="py-3 text-green-400">15</td>
              <td className="py-3 text-gray-400">Quick win</td>
            </tr>
            <tr>
              <td className="py-3 text-white">8</td>
              <td className="py-3 text-white">5</td>
              <td className="py-3 text-green-400">11</td>
              <td className="py-3 text-gray-400">Good value</td>
            </tr>
            <tr>
              <td className="py-3 text-white">6</td>
              <td className="py-3 text-white">6</td>
              <td className="py-3 text-yellow-400">6</td>
              <td className="py-3 text-gray-400">Moderate</td>
            </tr>
            <tr>
              <td className="py-3 text-white">5</td>
              <td className="py-3 text-white">8</td>
              <td className="py-3 text-red-400">2</td>
              <td className="py-3 text-gray-400">Low priority</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Complexity Score</h2>
      <p>Technical difficulty on a 1-5 scale:</p>
      <ul>
        <li>
          <strong>1</strong> — Trivial change, like a config update
        </li>
        <li>
          <strong>2</strong> — Simple change, single file affected
        </li>
        <li>
          <strong>3</strong> — Moderate complexity, multiple files
        </li>
        <li>
          <strong>4</strong> — Complex work, architectural changes
        </li>
        <li>
          <strong>5</strong> — Very complex, system-wide impact
        </li>
      </ul>

      <h2>Risk Analysis</h2>
      <p>Every item gets a 6-factor risk assessment, each scored 1-10:</p>
      <ul>
        <li>
          <strong>Technical Risk</strong> — Implementation difficulty and
          unknowns
        </li>
        <li>
          <strong>Integration Risk</strong> — Impact on existing code and
          systems
        </li>
        <li>
          <strong>Performance Risk</strong> — Potential for slowdowns or
          resource issues
        </li>
        <li>
          <strong>Security Risk</strong> — Chance of introducing vulnerabilities
        </li>
        <li>
          <strong>Scope Risk</strong> — Likelihood of scope creep or
          underestimation
        </li>
        <li>
          <strong>Testing Risk</strong> — Difficulty verifying the
          implementation works
        </li>
      </ul>

      <h2>Benefits Categories</h2>
      <p>Each item is scored across 5 mandatory benefit areas:</p>
      <ul>
        <li>
          <strong>User Experience</strong> — Direct benefit to end users
        </li>
        <li>
          <strong>Sales Team</strong> — Business and revenue impact
        </li>
        <li>
          <strong>Operations</strong> — Support and maintenance improvements
        </li>
        <li>
          <strong>Performance</strong> — Technical speed and efficiency gains
        </li>
        <li>
          <strong>Reliability</strong> — System stability and uptime
          improvements
        </li>
      </ul>

      <h2>Quick Wins</h2>
      <p>
        Items with high priority scores (typically 10+) are marked as{' '}
        <strong>&quot;Quick Wins&quot;</strong> and highlighted in the Mason
        Recommends section. These are excellent candidates to approve first —
        high value, low effort.
      </p>

      <h2>Score Validation</h2>
      <p>Mason validates that scores are reasonable and consistent:</p>
      <ul>
        <li>Impact must align with the described benefits</li>
        <li>Effort must match the complexity of the task breakdown</li>
        <li>Scores are calibrated to be consistent across similar items</li>
      </ul>
    </DocsLayout>
  );
}
