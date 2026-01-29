'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Shield, Database, Github, ArrowRight, Sparkles } from 'lucide-react';
import { SignInButton } from '@/components/auth/sign-in-button';
import {
  MasonLogo,
  MasonAvatar,
  MasonLoader,
  MasonMark,
} from '@/components/brand';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-screen bg-navy">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero Section with Mason Character */}
        <div className="mb-16 text-center">
          <div className="mason-entrance mb-8 flex justify-center">
            <MasonAvatar size="hero" variant="detailed" priority />
          </div>
          <div className="mason-entrance" style={{ animationDelay: '0.1s' }}>
            <MasonLogo
              variant="wordmark"
              size="xl"
              className="mb-4 justify-center"
            />
          </div>
          <p
            className="mason-entrance mx-auto max-w-2xl text-xl text-gray-400"
            style={{ animationDelay: '0.2s' }}
          >
            AI-powered continuous improvement for your codebase. 100% private -
            your data stays in your own database.
          </p>
        </div>

        {/* Privacy Banner */}
        <div
          className="mason-entrance mb-12 rounded-xl border border-gold/30 bg-gold/5 p-8"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 rounded-lg bg-gold/10 p-3">
              <Shield className="h-8 w-8 text-gold" />
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gold">
                Your Data, Your Database
              </h2>
              <p className="text-gray-300">
                Unlike other tools, Mason stores all your data in your own
                Supabase database. Assure DeFi® has zero access to your
                repositories, improvements, or any other data. We only host the
                open-source UI - everything else stays with you.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {status === 'loading' ? (
          <div className="flex justify-center py-16">
            <MasonLoader size="lg" label="Loading..." variant="glow" />
          </div>
        ) : session ? (
          <div
            className="mason-entrance grid gap-6 md:grid-cols-2"
            style={{ animationDelay: '0.4s' }}
          >
            <Link
              href="/admin/backlog"
              className="group block rounded-lg border border-gray-800 bg-black/50 p-6 transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/5"
            >
              <div className="mb-4 flex items-center gap-3">
                <MasonMark
                  size="sm"
                  className="transition-transform group-hover:scale-110"
                />
                <h2 className="text-xl font-semibold text-white">Backlog</h2>
              </div>
              <p className="text-gray-400">
                View and manage improvement items. Approve items for execution
                and generate PRDs.
              </p>
              <div className="mt-4 flex items-center gap-2 text-gold opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium">Open Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/setup"
              className="group block rounded-lg border border-gray-800 bg-black/50 p-6 transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/5"
            >
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-gold transition-transform group-hover:scale-110" />
                <h2 className="text-xl font-semibold text-white">Setup</h2>
              </div>
              <p className="text-gray-400">
                Configure your database, connect repositories, and generate API
                keys.
              </p>
              <div className="mt-4 flex items-center gap-2 text-gold opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium">Configure</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        ) : (
          <div className="space-y-8" style={{ animationDelay: '0.4s' }}>
            {/* Feature Cards */}
            <div className="mason-entrance grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                  <Database className="h-6 w-6 text-gold" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Bring Your Database
                </h3>
                <p className="text-sm text-gray-400">
                  Use your free Supabase project. All your data stays private in
                  your own database.
                </p>
              </div>

              <div className="group rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                  <Github className="h-6 w-6 text-gold" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Connect GitHub
                </h3>
                <p className="text-sm text-gray-400">
                  Analyze any repository you have access to. Your token stays in
                  your database.
                </p>
              </div>

              <div className="group rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                  <Shield className="h-6 w-6 text-gold" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Stay Private
                </h3>
                <p className="text-sm text-gray-400">
                  We never see your code, improvements, or any other data. Open
                  source and auditable.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div
              className="mason-entrance flex flex-col items-center gap-4"
              style={{ animationDelay: '0.5s' }}
            >
              <Link
                href="/setup"
                className="group flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-lg font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
              >
                Get Started
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="text-center text-sm text-gray-400">
                Already have an account? <SignInButton variant="link" />
              </p>
            </div>
          </div>
        )}

        {/* How it Works */}
        <div
          className="mason-entrance mt-16 rounded-lg border border-gray-800 bg-black/30 p-8"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="mb-6 flex items-center gap-3">
            <MasonMark size="sm" />
            <h2 className="text-xl font-semibold text-white">How it Works</h2>
          </div>
          <ol className="list-inside list-decimal space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
                1
              </span>
              <span>
                Run{' '}
                <code className="rounded bg-black/50 px-2 py-0.5 text-gold">
                  /pm-review
                </code>{' '}
                in Claude Code to analyze your codebase
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
                2
              </span>
              <span>
                View improvements in your{' '}
                <Link
                  href="/admin/backlog"
                  className="text-gold hover:underline"
                >
                  Dashboard
                </Link>{' '}
                (stored in YOUR database)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
                3
              </span>
              <span>Approve items and generate PRDs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
                4
              </span>
              <span>
                Run{' '}
                <code className="rounded bg-black/50 px-2 py-0.5 text-gold">
                  /execute-approved
                </code>{' '}
                to implement changes
              </span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-12">
          <PoweredByFooter className="justify-center" />
        </div>
      </div>
    </main>
  );
}
