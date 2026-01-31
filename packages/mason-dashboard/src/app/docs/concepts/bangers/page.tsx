'use client';

import { DocsLayout } from '@/components/docs';

export default function BangersPage() {
  return (
    <DocsLayout
      title="Banger Ideas"
      description="Transformative feature suggestions that can significantly improve your product."
    >
      <h2>What is a Banger?</h2>
      <p>
        A &quot;Banger Idea&quot; is a transformative feature suggestion -
        something that could significantly improve your product rather than just
        fix an issue. Bangers are larger scope (typically multi-week projects)
        and represent strategic opportunities.
      </p>

      <h2>Banger Characteristics</h2>
      <ul>
        <li>
          <strong>Transformative</strong> - Changes how users interact with your
          product
        </li>
        <li>
          <strong>Larger scope</strong> - Multi-week implementation
        </li>
        <li>
          <strong>High impact</strong> - Significant user/business value
        </li>
        <li>
          <strong>Strategic</strong> - Aligns with product direction
        </li>
      </ul>

      <h2>One Banger at a Time</h2>
      <p>
        Mason maintains only ONE active banger per repository. This ensures
        focus on the most impactful opportunity rather than accumulating a
        backlog of big ideas.
      </p>

      <h2>Banger Rotation</h2>
      <p>When a new banger is discovered during PM review:</p>
      <ol>
        <li>The current banger is evaluated against the new one</li>
        <li>If the new one is better, it becomes the active banger</li>
        <li>
          The old banger moves to the Feature Ideas section with a
          &quot;BANGER&quot; badge
        </li>
        <li>You don&apos;t lose old bangers - they become regular features</li>
      </ol>

      <h2>Dashboard Display</h2>
      <p>Bangers are highlighted in the dashboard:</p>
      <ul>
        <li>
          <strong>Active banger</strong> - Prominent card at top of backlog
        </li>
        <li>
          <strong>Former bangers</strong> - &quot;BANGER&quot; badge in Feature
          Ideas section
        </li>
      </ul>

      <h2>Approving Bangers</h2>
      <p>Bangers can be approved like any other item:</p>
      <ol>
        <li>Review the PRD carefully (these are bigger changes)</li>
        <li>Consider the risk analysis</li>
        <li>Click Approve when ready</li>
        <li>
          Execute with <code>/execute-approved</code>
        </li>
      </ol>
      <p>
        Because bangers are larger, you may want to break them into smaller
        pieces or prioritize them for dedicated implementation sprints.
      </p>

      <h2>Banger vs Feature</h2>
      <p>What&apos;s the difference?</p>

      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="pb-3 text-left font-medium text-gray-400">
                Aspect
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Banger
              </th>
              <th className="pb-3 text-left font-medium text-gray-400">
                Regular Feature
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3 text-gray-300">Scope</td>
              <td className="py-3 text-white">Multi-week</td>
              <td className="py-3 text-white">Days to a week</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Impact</td>
              <td className="py-3 text-white">Transformative</td>
              <td className="py-3 text-white">Incremental</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Per review</td>
              <td className="py-3 text-white">Max 1</td>
              <td className="py-3 text-white">Multiple</td>
            </tr>
            <tr>
              <td className="py-3 text-gray-300">Display</td>
              <td className="py-3 text-white">Highlighted card</td>
              <td className="py-3 text-white">Feature section</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>No Banger Found</h2>
      <p>
        Not every PM review finds a new banger. If no transformative opportunity
        is identified, the existing banger (if any) remains active.
      </p>
    </DocsLayout>
  );
}
