'use client';

import { ArrowRight, Play, Pause } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { MasonAvatar } from '@/components/brand';

/**
 * Hero section - video-first design with headline, subheadline, and CTAs
 * Video autoplays muted on load for immediate engagement
 */
export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Autoplay video on mount (muted for browser autoplay policy)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Autoplay blocked - user will need to click
          setIsPlaying(false);
        });
    }
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      setHasInteracted(true);
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        void video.play().then(() => setIsPlaying(true));
      }
    }
  };

  return (
    <section className="px-4 pb-8 pt-12 sm:px-6 md:pb-16 md:pt-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Top section: Branding + Headline + CTAs */}
        <div className="mb-12 text-center md:mb-16">
          {/* Assure DeFi branding */}
          <div className="mason-entrance mb-6 flex items-center justify-center gap-2">
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

          {/* Avatar */}
          <div
            className="mason-entrance mb-6 flex justify-center"
            style={{ animationDelay: '0.05s' }}
          >
            <MasonAvatar size="lg" variant="detailed" priority />
          </div>

          {/* Headline */}
          <h1
            className="mason-entrance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ animationDelay: '0.1s' }}
          >
            Mason finds what to fix next
            <br className="hidden sm:block" />
            <span className="text-gold"> and helps you ship it.</span>
          </h1>

          {/* Subheadline */}
          <p
            className="mason-entrance mx-auto mt-4 max-w-2xl text-base text-gray-400 sm:mt-6 sm:text-lg md:text-xl"
            style={{ animationDelay: '0.15s' }}
          >
            Connect your project. Mason scans it, suggests improvements, turns
            them into tasks or PRDs, and helps you execute.
          </p>

          {/* CTAs */}
          <div
            className="mason-entrance mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            style={{ animationDelay: '0.2s' }}
          >
            <Link
              href="/setup"
              className="group flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20 sm:px-8 sm:py-4 sm:text-lg"
            >
              Start with Mason
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Hero Video - Centerpiece */}
        <div
          className="mason-entrance relative mx-auto max-w-4xl"
          style={{ animationDelay: '0.25s' }}
        >
          {/* Subtle glow effect */}
          <div className="absolute -inset-3 rounded-2xl bg-gold/8 blur-2xl sm:-inset-4" />
          <div className="absolute -inset-1 rounded-xl bg-gold/5 blur-lg" />

          {/* Video container */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-navy shadow-2xl shadow-black/50">
            <video
              ref={videoRef}
              className="aspect-video w-full"
              src="/videos/mason-hype.mp4"
              muted
              loop
              playsInline
              preload="auto"
            />

            {/* Play/Pause overlay - only shows on hover or when paused */}
            <button
              onClick={togglePlay}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                isPlaying && !hasInteracted
                  ? 'opacity-0 hover:opacity-100'
                  : isPlaying
                    ? 'opacity-0 hover:opacity-100'
                    : 'opacity-100'
              }`}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all sm:h-20 sm:w-20 ${
                  isPlaying
                    ? 'bg-white/20 text-white backdrop-blur-sm'
                    : 'bg-gold text-navy shadow-lg shadow-gold/30 hover:scale-110'
                }`}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Play className="h-7 w-7 pl-1 sm:h-8 sm:w-8" />
                )}
              </div>
            </button>
          </div>

          {/* Caption */}
          <p className="mt-4 text-center text-sm text-gray-500">
            Self-improving code. Zero maintenance. Rock solid by design.
          </p>
        </div>
      </div>
    </section>
  );
}
