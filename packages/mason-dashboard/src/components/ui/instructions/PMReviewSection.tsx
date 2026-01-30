'use client';

import { CodeBlock, DomainCard } from './shared';

export function PMReviewSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Running a PM Review</h4>
        <p className="text-gray-400">
          The PM Review command analyzes your codebase and generates prioritized
          improvement suggestions across multiple domains.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">How to Run</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <p className="mb-3 text-sm text-gray-300">
            In Claude Code, run one of these commands:
          </p>
          <div className="space-y-2 font-mono text-sm">
            <CodeBlock
              code="/pm-review"
              description="Full analysis (10-20 items)"
            />
            <CodeBlock
              code="/pm-review area:frontend-ux"
              description="Focus on frontend/UX"
            />
            <CodeBlock
              code="/pm-review area:api-backend"
              description="Focus on backend/API"
            />
            <CodeBlock
              code="/pm-review area:security"
              description="Focus on security"
            />
            <CodeBlock
              code="/pm-review quick"
              description="Quick wins only (5-7 items)"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Analysis Domains</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <DomainCard
            title="Frontend UX"
            description="UI/UX issues, accessibility, responsive design, user flow"
          />
          <DomainCard
            title="API Backend"
            description="API design, performance, error handling, endpoints"
          />
          <DomainCard
            title="Reliability"
            description="Error handling, logging, monitoring, graceful degradation"
          />
          <DomainCard
            title="Security"
            description="Auth issues, input validation, OWASP vulnerabilities"
          />
          <DomainCard
            title="Code Quality"
            description="Duplication, complexity, testing gaps, technical debt"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Scoring System</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Impact (1-10):</span>
              <span>How much value does this improvement add?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Effort (1-10):</span>
              <span>How much work is required?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Priority:</span>
              <span>Calculated as (Impact × 2) - Effort</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">Complexity (1-5):</span>
              <span>Technical complexity rating</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
