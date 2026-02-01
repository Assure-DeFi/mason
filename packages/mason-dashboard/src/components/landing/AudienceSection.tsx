'use client';

import { Check } from 'lucide-react';

/**
 * Audience section - "Who it's for" quick list
 */
export function AudienceSection() {
  const audiences = [
    'Solo devs and small teams',
    'People shipping fast',
    'Anyone using Claude Code + Supabase',
    'People who hate managing backlogs',
  ];

  return (
    <section
      className="mason-entrance px-4 py-12 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.5s' }}
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center text-xl font-semibold text-white">
          Who it&apos;s for
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {audiences.map((audience) => (
            <div
              key={audience}
              className="flex items-center gap-2 rounded-lg border border-gray-800 bg-black/20 px-4 py-2"
            >
              <Check className="h-4 w-4 text-gold" />
              <span className="text-sm text-gray-300">{audience}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
