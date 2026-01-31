'use client';

import { DocsLayout } from '@/components/docs';

export default function CategoriesPage() {
  return (
    <DocsLayout
      title="Categories"
      description="The 8 analysis categories Mason uses to find improvements."
    >
      <p>
        Mason analyzes your codebase across 8 specialized categories. Each
        category has a dedicated agent that focuses on specific types of
        improvements.
      </p>

      <h2>Category Reference</h2>

      <div className="not-prose my-6 space-y-6">
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <h3 className="text-lg font-semibold text-white">Feature</h3>
          </div>
          <p className="mb-4 text-gray-300">
            New functionality that doesn&apos;t exist yet. Features add
            capabilities, not fix problems.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Add dark mode, implement export to CSV,
            add keyboard shortcuts
          </p>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <h3 className="text-lg font-semibold text-white">UI</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Visual and component improvements. How things look and are
            structured.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Improve button styling, fix layout
            issues, add loading states
          </p>
        </div>

        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-cyan-500" />
            <h3 className="text-lg font-semibold text-white">UX</h3>
          </div>
          <p className="mb-4 text-gray-300">
            User flow and interaction improvements. How users accomplish tasks.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Simplify checkout flow, add confirmation
            dialogs, improve error messages
          </p>
        </div>

        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <h3 className="text-lg font-semibold text-white">API</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Backend endpoint improvements. API design, responses, and
            integration.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Add pagination, improve error responses,
            add rate limiting
          </p>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <h3 className="text-lg font-semibold text-white">Data</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Database and query improvements. Schema design, query efficiency,
            data handling.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Add missing indexes, optimize N+1
            queries, improve data validation
          </p>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <h3 className="text-lg font-semibold text-white">Security</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Vulnerability fixes and security hardening. Input validation, auth,
            OWASP issues.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Fix SQL injection, add CSRF protection,
            improve password hashing
          </p>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <h3 className="text-lg font-semibold text-white">Performance</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Speed and optimization improvements. Load times, memory usage,
            efficiency.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Add caching, lazy load components,
            optimize images
          </p>
        </div>

        <div className="rounded-lg border border-gray-500/30 bg-gray-500/10 p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-500" />
            <h3 className="text-lg font-semibold text-white">Code Quality</h3>
          </div>
          <p className="mb-4 text-gray-300">
            Tech debt and maintainability. Refactoring, type safety, testing.
          </p>
          <p className="text-sm text-gray-400">
            <strong>Examples:</strong> Add TypeScript types, extract shared
            logic, add unit tests
          </p>
        </div>
      </div>

      <h2>Focused Analysis</h2>
      <p>Use focus mode to deep-dive on a specific category:</p>
      <pre>
        <code>/pm-review area:security</code>
      </pre>
      <p>
        This runs only the security agent and returns 5 items in that category.
      </p>

      <h2>Category Distribution</h2>
      <p>In full mode, items are distributed across categories:</p>
      <ul>
        <li>3 items per category (24 total)</li>
        <li>1 &quot;banger idea&quot; (any category)</li>
        <li>Total: up to 25 items</li>
      </ul>
      <p>
        Quick mode generates 1 item per category (8 total + 1 banger = 9 items).
      </p>
    </DocsLayout>
  );
}
