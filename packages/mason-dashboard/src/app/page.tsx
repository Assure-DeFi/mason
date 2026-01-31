'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { MasonMark } from '@/components/brand';
import {
  LandingHeader,
  HeroSection,
  QuickSetupCard,
  ValuePropsSection,
  PrivacyBullets,
  HowItWorksSection,
  AudienceSection,
  FinalCTASection,
} from '@/components/landing';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

export default function Home() {
  const { data: session, status } = useSession();

  // Logged-in user sees simplified dashboard
  if (status === 'authenticated' && session) {
    return (
      <main className="min-h-screen bg-navy">
        <LandingHeader showCTA={false} />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div
            className="mason-entrance grid gap-6 md:grid-cols-2"
            style={{ animationDelay: '0.1s' }}
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

          <div className="mt-12">
            <PoweredByFooter className="justify-center" />
          </div>
        </div>
      </main>
    );
  }

  // Logged-out user sees landing page
  return (
    <main className="min-h-screen bg-navy">
      <LandingHeader />
      <HeroSection />
      <QuickSetupCard />
      <ValuePropsSection />
      <PrivacyBullets />
      <HowItWorksSection />
      <AudienceSection />
      <FinalCTASection />
      <footer className="pb-8">
        <PoweredByFooter className="justify-center" />
      </footer>
    </main>
  );
}
