'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { MasonAvatar, MasonTagline } from '@/components/brand';
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

  // Logged-in user sees welcome page
  if (status === 'authenticated' && session) {
    const firstName = session.user?.github_username || 'Builder';

    return (
      <main className="relative min-h-screen bg-navy">
        <LandingHeader showCTA={false} />
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div
            className="mason-entrance text-center"
            style={{ animationDelay: '0.1s' }}
          >
            <MasonAvatar
              variant="detailed"
              size="xl"
              className="mx-auto mb-8"
              priority
            />
            <MasonTagline variant="muted" size="md" className="mb-6" />
            <h1 className="mb-2 text-4xl font-bold text-white">
              Welcome back, {firstName}!
            </h1>
            <p className="mb-10 text-lg text-gray-400">
              Your build queue awaits.
            </p>
            <Link
              href="/admin/backlog"
              className="inline-flex items-center gap-3 rounded-lg bg-gold px-8 py-4 text-lg font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/30"
            >
              Go to My Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="mt-8">
              <Link
                href="/setup"
                className="text-sm text-gray-500 transition-colors hover:text-gold"
              >
                Setup & Settings
              </Link>
            </div>
          </div>
        </div>
        <footer className="absolute bottom-8 left-0 right-0">
          <PoweredByFooter className="justify-center" />
        </footer>
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
