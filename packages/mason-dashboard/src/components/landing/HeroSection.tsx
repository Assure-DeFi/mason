'use client';

import { ArrowRight, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { MasonAvatar } from '@/components/brand';

/**
 * Hero section - Video-first design with full-width prominence
 * Tight header, massive video, supporting text below
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
    <section className="px-4 pb-12 pt-4 sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Tight Header - Avatar + Headline */}
        <div className="mason-entrance mb-6 flex items-center justify-center gap-3 sm:mb-8">
          <MasonAvatar size="md" variant="detailed" priority />
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
            Mason finds what to fix
            <span className="text-gold"> and ships it.</span>
          </h1>
        </div>

        {/* THE VIDEO - Full width, front and center */}
        <div
          className="mason-entrance mb-8 sm:mb-10"
          style={{ animationDelay: '0.05s' }}
        >
          {/* Dramatic glow effect */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-2xl bg-gold/10 blur-2xl sm:-inset-4" />
            <div className="absolute -inset-2 rounded-xl bg-gold/5 blur-lg" />

            {/* Video container - near full width */}
            <div className="relative overflow-hidden rounded-xl border-2 border-gold/20 bg-navy shadow-2xl shadow-gold/10">
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
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition-all sm:h-20 sm:w-20 ${
                    isPlaying
                      ? 'bg-white/20 text-white backdrop-blur-sm'
                      : 'bg-gold text-navy shadow-lg shadow-gold/30 hover:scale-110'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7 sm:h-8 sm:w-8" />
                  ) : (
                    <Play className="h-7 w-7 pl-0.5 sm:h-8 sm:w-8" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Text + CTA below video */}
        <div
          className="mason-entrance text-center"
          style={{ animationDelay: '0.1s' }}
        >
          {/* Subheadline */}
          <p className="mx-auto mb-6 max-w-2xl text-base text-gray-400 sm:text-lg">
            Connect your project. Mason scans it, suggests improvements, turns
            them into tasks, and helps you execute.{' '}
            <span className="text-white">Self-improving code.</span>
          </p>

          {/* CTA */}
          <div className="mb-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/setup"
              className="group flex items-center gap-2 rounded-lg bg-gold px-8 py-3.5 text-base font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/25 sm:text-lg"
            >
              Start with Mason
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs"
              className="text-base text-gray-400 transition-colors hover:text-white"
            >
              View documentation
            </Link>
          </div>

          {/* Time estimate + Tagline */}
          <p className="text-sm text-gray-500">
            Get started in ~5 minutes
            <span className="mx-2 text-gray-700">·</span>
            <span className="text-gray-600">Zero maintenance. Rock solid by design.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
