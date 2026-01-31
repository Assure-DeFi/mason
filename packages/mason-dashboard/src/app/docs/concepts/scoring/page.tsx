'use client';

import { DocsLayout } from '@/components/docs';

export default function ScoringPage() {
  return (
    <DocsLayout
      title="Scoring System"
      description="How Mason prioritizes and ranks improvements."
    >
      <h2>Core Scores</h2>
      <p>Every item receives three scores:</p>

      <h3>Impact Score (1-10)</h3>
      <p>How much value this improvement adds:</p>
      <ul>
        <li>
          <strong>1-3</strong> - Minor improvement, nice to have
        </li>
        <li>
          <strong>4-6</strong> - Meaningful improvement, noticeable benefit
        </li>
        <li>
          <strong>7-8</strong> - Significant improvement, major benefit
        </li>
        <li>
          <strong>9-10</strong> - Critical improvement, transformative
        </li>
      </ul>

      <h3>Effort Score (1-10)</h3>
      <p>How much work this requires:</p>
      <ul>
        <li>
          <strong>1-3</strong> - Quick fix, under an hour
        </li>
        <li>
          <strong>4-6</strong> - Half day to a few days
        </li>
        <li>
          <strong>7-8</strong> - Week of work
        </li>
        <li>
          <strong>9-10</strong> - Multi-week project
        </li>
      </ul>

      <h3>Priority Score (Calculated)</h3>
      <p>Determines item ranking:</p>
      <pre>
        <code>Priority = (Impact × 2) - Effort</code>
      </pre>
      <p>
        This formula favors high-impact, low-effort items (&quot;quick
        wins&quot;).
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
      <p>Technical difficulty (1-5 scale):</p>
      <ul>
        <li>
          <strong>1</strong> - Trivial, config change
        </li>
        <li>
          <strong>2</strong> - Simple, single file
        </li>
        <li>
          <strong>3</strong> - Moderate, multiple files
        </li>
        <li>
          <strong>4</strong> - Complex, architectural changes
        </li>
        <li>
          <strong>5</strong> - Very complex, system-wide
        </li>
      </ul>

      <h2>Risk Analysis</h2>
      <p>6-factor risk assessment (each 1-10):</p>
      <ul>
        <li>
          <strong>Technical Risk</strong> - Implementation difficulty
        </li>
        <li>
          <strong>Integration Risk</strong> - Impact on existing code
        </li>
        <li>
          <strong>Performance Risk</strong> - Potential slowdowns
        </li>
        <li>
          <strong>Security Risk</strong> - New vulnerability potential
        </li>
        <li>
          <strong>Scope Risk</strong> - Scope creep likelihood
        </li>
        <li>
          <strong>Testing Risk</strong> - QA difficulty
        </li>
      </ul>

      <h2>Benefits Categories</h2>
      <p>5 mandatory benefit areas:</p>
      <ul>
        <li>
          <strong>User Experience</strong> - End-user benefit
        </li>
        <li>
          <strong>Sales Team</strong> - Business/revenue impact
        </li>
        <li>
          <strong>Operations</strong> - Support/maintenance benefit
        </li>
        <li>
          <strong>Performance</strong> - Technical performance
        </li>
        <li>
          <strong>Reliability</strong> - System stability
        </li>
      </ul>

      <h2>Quick Wins</h2>
      <p>
        Items with high priority scores (typically 10+) are marked as
        &quot;Quick Wins&quot; and highlighted in the Mason Recommends section.
        These are good candidates to approve first.
      </p>

      <h2>Score Validation</h2>
      <p>Mason validates scores are reasonable:</p>
      <ul>
        <li>Impact must align with described benefits</li>
        <li>Effort must match task breakdown complexity</li>
        <li>Scores are consistent across similar items</li>
      </ul>
    </DocsLayout>
  );
}
