'use client';

import { ArrowRight, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

/**
 * Hero section - CTA above video, video is the star
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
        {/* Action Bar - Headline + CTA above video */}
        <div className="mason-entrance mb-6 text-center sm:mb-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Mason finds what to fix
            <span className="text-gold"> and ships it.</span>
          </h1>
          <p className="mb-4 text-sm text-gray-400 sm:text-base">
            Self-improving code. ~5 minutes to start.
          </p>
          <Link
            href="/setup"
            className="group inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-3.5 text-base font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/25 sm:text-lg"
          >
            Start Now
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* THE VIDEO - Full width, the star */}
        <div
          className="mason-entrance mb-6 sm:mb-8"
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

        {/* Minimal supporting text */}
        <p
          className="mason-entrance text-center text-sm text-gray-500"
          style={{ animationDelay: '0.1s' }}
        >
          Zero maintenance. Rock solid by design.
        </p>
      </div>
    </section>
  );
}
