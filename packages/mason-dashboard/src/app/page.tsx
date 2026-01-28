'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Shield, Database, Github, ArrowRight } from 'lucide-react';
import { SignInButton } from '@/components/auth/sign-in-button';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">Mason</h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-400">
            AI-powered continuous improvement for your codebase. 100% private -
            your data stays in your own database.
          </p>
        </div>

        <div className="mb-12 rounded-xl border border-gold/30 bg-gold/5 p-8">
          <div className="flex items-start gap-4">
            <Shield className="mt-1 h-8 w-8 flex-shrink-0 text-gold" />
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gold">
                Your Data, Your Database
              </h2>
              <p className="text-gray-300">
                Unlike other tools, Mason stores all your data in your own
                Supabase database. Assure DeFi has zero access to your
                repositories, improvements, or any other data. We only host the
                open-source UI - everything else stays with you.
              </p>
            </div>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : session ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/admin/backlog"
              className="block rounded-lg border border-gray-800 bg-black/50 p-6 transition-colors hover:border-gold"
            >
              <h2 className="mb-2 text-xl font-semibold text-white">Backlog</h2>
              <p className="text-gray-400">
                View and manage improvement items. Approve items for execution
                and generate PRDs.
              </p>
            </Link>

            <Link
              href="/setup"
              className="block rounded-lg border border-gray-800 bg-black/50 p-6 transition-colors hover:border-gold"
            >
              <h2 className="mb-2 text-xl font-semibold text-white">Setup</h2>
              <p className="text-gray-400">
                Configure your database, connect repositories, and generate API
                keys.
              </p>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-gray-800 bg-black/30 p-6">
                <Database className="mb-4 h-10 w-10 text-gold" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Bring Your Database
                </h3>
                <p className="text-sm text-gray-400">
                  Use your free Supabase project. All your data stays private in
                  your own database.
                </p>
              </div>

              <div className="rounded-lg border border-gray-800 bg-black/30 p-6">
                <Github className="mb-4 h-10 w-10 text-gold" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Connect GitHub
                </h3>
                <p className="text-sm text-gray-400">
                  Analyze any repository you have access to. Your token stays in
                  your database.
                </p>
              </div>

              <div className="rounded-lg border border-gray-800 bg-black/30 p-6">
                <Shield className="mb-4 h-10 w-10 text-gold" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Stay Private
                </h3>
                <p className="text-sm text-gray-400">
                  We never see your code, improvements, or any other data. Open
                  source and auditable.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Link
                href="/setup"
                className="flex items-center gap-2 rounded-md bg-gold px-8 py-4 text-lg font-semibold text-navy transition-opacity hover:opacity-90"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <SignInButton className="inline-flex bg-transparent px-2 py-1 text-gold hover:underline" />
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 rounded-lg border border-gray-800 bg-black/30 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">
            How it Works
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-gray-300">
            <li>
              Run{' '}
              <code className="rounded bg-black/50 px-2 py-0.5">
                /pm-review
              </code>{' '}
              in Claude Code to analyze your codebase
            </li>
            <li>
              View improvements in your{' '}
              <Link href="/admin/backlog" className="text-gold hover:underline">
                Dashboard
              </Link>{' '}
              (stored in YOUR database)
            </li>
            <li>Approve items and generate PRDs</li>
            <li>
              Run{' '}
              <code className="rounded bg-black/50 px-2 py-0.5">
                /execute-approved
              </code>{' '}
              to implement changes
            </li>
          </ol>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          Powered by{' '}
          <a
            href="https://assuredefi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            Assure DeFi
          </a>
        </div>
      </div>
    </main>
  );
}
