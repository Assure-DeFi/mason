'use client';

import { ArrowRight, Database, Key, Play, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

/**
 * Quick setup preview - shows the 4 steps inline
 */
export function QuickSetupCard() {
  const steps = [
    { icon: Database, label: 'Connect Supabase' },
    { icon: Key, label: 'Add keys locally' },
    { icon: Play, label: 'Run Mason' },
    { icon: LayoutDashboard, label: 'Open dashboard' },
  ];

  return (
    <section
      className="mason-entrance px-4 py-12 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.4s' }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-white">
              Get started in ~5 minutes
            </h2>
          </div>

          {/* Steps */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10">
                  <step.icon className="h-6 w-6 text-gold" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-xs font-medium text-gold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-300">{step.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/setup"
              className="group inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
            >
              Start setup
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
