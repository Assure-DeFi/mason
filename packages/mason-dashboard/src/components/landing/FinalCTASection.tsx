'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Final CTA section - repeat CTA at bottom of page
 */
export function FinalCTASection() {
  return (
    <section
      className="mason-entrance px-4 py-16 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.6s' }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">
          Start using Mason now
        </h2>
        <p className="mt-3 text-gray-400">
          Takes about 5 minutes. You can stop anytime.
        </p>
        <div className="mt-8">
          <Link
            href="/setup"
            className="group inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-lg font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            Start with Mason
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
