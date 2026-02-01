'use client';

import { ArrowRight, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { MasonAvatar } from '@/components/brand';

/**
 * Hero section - above the fold with headline, subheadline, and CTAs
 */
export function HeroSection() {
  const scrollToHowItWorks = () => {
    document
      .getElementById('how-it-works')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="mason-entrance px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {/* Assure DeFi branding */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image
            src="/assure-defi-logo.svg"
            alt="Assure DeFi"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <span className="text-sm tracking-wide text-gray-400">
            A product of Assure DeFi<sup className="text-[10px]">&reg;</sup>
          </span>
        </div>

        {/* Avatar - smaller than before */}
        <div className="mb-8 flex justify-center">
          <MasonAvatar size="lg" variant="detailed" priority />
        </div>

        {/* Headline */}
        <h1
          className="mason-entrance text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl"
          style={{ animationDelay: '0.1s' }}
        >
          Mason finds what to fix next
          <br className="hidden sm:block" />
          <span className="text-gold"> and helps you ship it.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="mason-entrance mx-auto mt-6 max-w-2xl text-lg text-gray-400 md:text-xl"
          style={{ animationDelay: '0.2s' }}
        >
          Connect your project. Mason scans it, suggests improvements, turns
          them into tasks or PRDs, and helps you execute. Nothing leaves your
          database.
        </p>

        {/* CTAs */}
        <div
          className="mason-entrance mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: '0.3s' }}
        >
          <Link
            href="/setup"
            className="group flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-lg font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            Start with Mason
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <button
            onClick={scrollToHowItWorks}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-8 py-4 text-lg font-medium text-white transition-colors hover:border-gray-600 hover:bg-white/5"
          >
            <Play className="h-5 w-5" />
            See how it works
          </button>
        </div>
      </div>
    </section>
  );
}
