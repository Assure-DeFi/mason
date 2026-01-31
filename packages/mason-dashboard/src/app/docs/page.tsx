'use client';

import {
  ArrowRight,
  Book,
  Terminal,
  Database,
  Key,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';

import { LandingHeader } from '@/components/landing';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

export default function DocsPage() {
  const steps = [
    {
      icon: Database,
      title: '1. Set up Supabase',
      description:
        'Create a free Supabase project. Mason stores all your data there - we never see it.',
      code: null,
    },
    {
      icon: Key,
      title: '2. Configure locally',
      description:
        'Add your Supabase credentials to the Mason dashboard. They stay in your browser.',
      code: null,
    },
    {
      icon: Terminal,
      title: '3. Run Mason',
      description: 'In your project directory, run the PM review command:',
      code: '/pm-review',
    },
    {
      icon: LayoutDashboard,
      title: '4. View results',
      description:
        'Open the dashboard to see improvements, approve items, and track execution.',
      code: null,
    },
  ];

  return (
    <main className="min-h-screen bg-navy">
      <LandingHeader />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mason-entrance mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-gold/10 p-3">
              <Book className="h-8 w-8 text-gold" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Getting Started with Mason
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Set up Mason in about 5 minutes. Everything runs locally.
          </p>
        </div>

        {/* Steps */}
        <div
          className="mason-entrance space-y-6"
          style={{ animationDelay: '0.1s' }}
        >
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-lg border border-gray-800 bg-black/30 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <step.icon className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-gray-400">{step.description}</p>
                  {step.code && (
                    <code className="mt-3 inline-block rounded bg-black/50 px-3 py-1.5 text-gold">
                      {step.code}
                    </code>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="mason-entrance mt-12 text-center"
          style={{ animationDelay: '0.2s' }}
        >
          <Link
            href="/setup"
            className="group inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            Start setup
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Commands Reference */}
        <div
          className="mason-entrance mt-16 rounded-lg border border-gray-800 bg-black/30 p-6"
          style={{ animationDelay: '0.3s' }}
        >
          <h2 className="mb-4 text-lg font-semibold text-white">
            Available Commands
          </h2>
          <div className="space-y-4">
            <div>
              <code className="rounded bg-black/50 px-2 py-1 text-gold">
                /pm-review
              </code>
              <p className="mt-1 text-sm text-gray-400">
                Analyze your codebase and generate improvement suggestions.
              </p>
            </div>
            <div>
              <code className="rounded bg-black/50 px-2 py-1 text-gold">
                /execute-approved
              </code>
              <p className="mt-1 text-sm text-gray-400">
                Execute approved items from your backlog.
              </p>
            </div>
            <div>
              <code className="rounded bg-black/50 px-2 py-1 text-gold">
                /mason-update
              </code>
              <p className="mt-1 text-sm text-gray-400">
                Update Mason commands to the latest version.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-16">
          <PoweredByFooter className="justify-center" />
        </footer>
      </div>
    </main>
  );
}
