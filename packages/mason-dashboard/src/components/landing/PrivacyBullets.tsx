'use client';

import { Shield, Database, Eye, Trash2 } from 'lucide-react';

/**
 * Privacy section - scannable bullets instead of wall of text
 */
export function PrivacyBullets() {
  const bullets = [
    {
      icon: Database,
      text: 'Your Supabase stores everything',
    },
    {
      icon: Eye,
      text: 'Assure DeFi hosts only the UI',
    },
    {
      icon: Shield,
      text: 'We never see your code, prompts, or decisions',
    },
    {
      icon: Trash2,
      text: 'You can delete everything anytime',
    },
  ];

  return (
    <section
      className="mason-entrance px-4 py-12 sm:px-6 lg:px-8"
      style={{ animationDelay: '0.3s' }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-800 bg-black/30 p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <Shield className="h-6 w-6 text-gold" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Your Data Stays Yours
            </h2>
          </div>

          {/* Bullets */}
          <ul className="mb-6 space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet.text} className="flex items-center gap-3">
                <bullet.icon className="h-5 w-5 flex-shrink-0 text-gold/70" />
                <span className="text-gray-300">{bullet.text}</span>
              </li>
            ))}
          </ul>

          {/* Quote */}
          <p className="border-l-2 border-gold/30 pl-4 text-sm italic text-gray-400">
            &ldquo;We don&apos;t want your data. Literally can&apos;t access
            it.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
