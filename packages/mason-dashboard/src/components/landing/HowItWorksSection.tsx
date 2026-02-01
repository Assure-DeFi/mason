'use client';

import { MasonMark } from '@/components/brand';

/**
 * How it works - simplified 4 steps
 */
export function HowItWorksSection() {
  const steps = [
    'Mason reviews your codebase',
    'You get a ranked list of improvements',
    'Approve what you want',
    'Mason helps you ship it',
  ];

  return (
    <section
      id="how-it-works"
      className="mason-entrance scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.4s' }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-800 bg-black/30 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <MasonMark size="sm" />
            <h2 className="text-xl font-semibold text-white">How it Works</h2>
          </div>

          {/* Steps */}
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold">
                  {index + 1}
                </span>
                <span className="text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
