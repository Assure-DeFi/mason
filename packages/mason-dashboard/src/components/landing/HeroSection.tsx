'use client';

import { ArrowRight, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { MasonAvatar } from '@/components/brand';

/**
 * Hero section - compact above-the-fold design with video prominence
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
    <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Two-column layout: Content left, Video right */}
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: Content */}
          <div className="order-2 text-center lg:order-1 lg:text-left">
            {/* Avatar + Headline */}
            <div className="mason-entrance mb-4 flex items-center justify-center gap-4 lg:justify-start">
              <MasonAvatar size="md" variant="detailed" priority />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Mason finds what to fix
                  <span className="text-gold"> and ships it.</span>
                </h1>
              </div>
            </div>

            {/* Subheadline */}
            <p
              className="mason-entrance mb-6 text-sm text-gray-400 sm:text-base lg:max-w-md"
              style={{ animationDelay: '0.05s' }}
            >
              Connect your project. Mason scans it, suggests improvements, turns
              them into tasks, and helps you execute.
            </p>

            {/* CTA */}
            <div
              className="mason-entrance flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
              style={{ animationDelay: '0.1s' }}
            >
              <Link
                href="/setup"
                className="group flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20 sm:text-base"
              >
                Start with Mason
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/docs"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                View documentation
              </Link>
            </div>

            {/* Tagline */}
            <p
              className="mason-entrance mt-6 text-xs text-gray-600"
              style={{ animationDelay: '0.15s' }}
            >
              Self-improving code. Zero maintenance. Rock solid by design.
            </p>
          </div>

          {/* Right: Video */}
          <div
            className="mason-entrance order-1 lg:order-2"
            style={{ animationDelay: '0.1s' }}
          >
            {/* Subtle glow effect */}
            <div className="relative">
              <div className="absolute -inset-2 rounded-xl bg-gold/8 blur-xl" />
              <div className="absolute -inset-1 rounded-lg bg-gold/5 blur-md" />

              {/* Video container */}
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-navy shadow-2xl shadow-black/50">
                <video
                  ref={videoRef}
                  className="aspect-video w-full"
                  src="/videos/mason-hype.mp4"
                  muted
                  loop
                  playsInline
                  preload="auto"
                />

                {/* Play/Pause overlay */}
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
                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all sm:h-16 sm:w-16 ${
                      isPlaying
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'bg-gold text-navy shadow-lg shadow-gold/30 hover:scale-110'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
                    ) : (
                      <Play className="h-6 w-6 pl-0.5 sm:h-7 sm:w-7" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
