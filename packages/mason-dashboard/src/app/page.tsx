import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Mason Dashboard</h1>
        <p className="text-gray-400 mb-8">
          Continuous improvement management for your codebase
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/backlog"
            className="block p-6 bg-black/50 rounded-lg border border-gray-800 hover:border-gold transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Backlog</h2>
            <p className="text-gray-400">
              View and manage improvement items. Approve items for execution and
              generate PRDs.
            </p>
          </Link>

          <div className="p-6 bg-black/50 rounded-lg border border-gray-800 opacity-50">
            <h2 className="text-xl font-semibold mb-2">Executions</h2>
            <p className="text-gray-400">
              Monitor execution runs and task progress. Coming soon.
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-black/30 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              Run{' '}
              <code className="bg-black/50 px-2 py-0.5 rounded">
                /pm-review
              </code>{' '}
              in Claude Code to analyze your codebase
            </li>
            <li>
              View improvements in the{' '}
              <Link href="/admin/backlog" className="text-gold hover:underline">
                Backlog
              </Link>
            </li>
            <li>Approve items and generate PRDs</li>
            <li>
              Run{' '}
              <code className="bg-black/50 px-2 py-0.5 rounded">
                /execute-approved
              </code>{' '}
              to implement changes
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
