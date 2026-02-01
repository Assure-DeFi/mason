'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { MasonAvatar, MasonSplash, MasonTagline } from '@/components/brand';
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

type TransitionPhase =
  | 'checking'
  | 'detected'
  | 'signing-in'
  | 'welcome'
  | null;

function WelcomeBackView({ username }: { username: string }) {
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
            Welcome back, {username}!
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

function LandingPageView() {
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

export default function Home() {
  const { data: session, status } = useSession();
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>(null);
  const [username, setUsername] = useState('Builder');

  // Check for session cookie to predict auth during loading
  const hasSessionCookie =
    typeof document !== 'undefined' &&
    document.cookie.includes('next-auth.session-token');

  useEffect(() => {
    if (status === 'loading') {
      // Only show splash if we expect user to be authenticated
      if (hasSessionCookie) {
        setTransitionPhase('checking');
      }
      // Otherwise, keep null - landing page will show after hydration
    } else if (status === 'authenticated' && session) {
      // Capture username before transition
      setUsername(session.user?.github_username || 'Builder');
      // Animated transition sequence for returning users
      setTransitionPhase('detected');
      setTimeout(() => setTransitionPhase('signing-in'), 600);
      setTimeout(() => setTransitionPhase('welcome'), 1200);
    } else {
      // Unauthenticated - clear any transition state
      setTransitionPhase(null);
    }
  }, [status, session, hasSessionCookie]);

  // AUTHENTICATED USER FLOW: Show splash/transition sequence
  if (transitionPhase === 'checking') {
    return <MasonSplash message="Checking session..." />;
  }
  if (transitionPhase === 'detected') {
    return <MasonSplash message="Existing user detected" />;
  }
  if (transitionPhase === 'signing-in') {
    return <MasonSplash message="Signing you in..." />;
  }
  if (transitionPhase === 'welcome') {
    return <WelcomeBackView username={username} />;
  }

  // UNAUTHENTICATED USER FLOW:
  // During loading (no cookie), show minimal bg to prevent flash
  if (status === 'loading' && !hasSessionCookie) {
    return <div className="min-h-screen bg-navy" />;
  }

  // Landing page for new/signed-out users
  return <LandingPageView />;
}
