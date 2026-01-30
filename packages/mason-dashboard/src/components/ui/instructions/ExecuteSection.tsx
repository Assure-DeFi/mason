'use client';

export function ExecuteSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Executing Approved Items</h4>
        <p className="text-gray-400">
          Once items are approved and have PRDs, you can execute them using
          Claude Code to automatically implement the changes.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Execution Methods</h4>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
            <h5 className="mb-2 font-medium text-gold">
              Method 1: Dashboard Button
            </h5>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">1.</span>
                <span>Go to the "Approved" tab in the backlog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">2.</span>
                <span>Click the "Execute" button</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">3.</span>
                <span>Copy the generated command</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gold">4.</span>
                <span>Paste and run in Claude Code</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
            <h5 className="mb-2 font-medium text-gold">
              Method 2: Direct Command
            </h5>
            <p className="mb-2 text-sm text-gray-300">
              Run directly in Claude Code:
            </p>
            <div className="rounded bg-black p-2 font-mono text-sm text-gray-300">
              /execute-approved
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Execution Process</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">1.</span>
              <span>Creates a feature branch for the changes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">2.</span>
              <span>Executes tasks in parallel waves based on PRD</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">3.</span>
              <span>Runs validation (TypeScript, ESLint, tests)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">4.</span>
              <span>Auto-fixes any validation failures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-gold">5.</span>
              <span>Commits changes when all validations pass</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Remote Execution</h4>
        <p className="text-gray-400">
          For connected repositories, you can also trigger execution from the
          dashboard which will create a PR automatically. This requires a GitHub
          token with repo access.
        </p>
      </div>
    </div>
  );
}
