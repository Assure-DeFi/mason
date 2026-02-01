'use client';

import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Hype video section - showcases the Mason promotional video
 */
export function HypeVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        void videoRef.current.play().then(() => {
          setIsPlaying(true);
        });
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8" id="hype-video">
      <div className="mx-auto max-w-5xl">
        {/* Section heading */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            See Mason in Action
          </h2>
          <p className="mt-2 text-gray-400">
            45 seconds that will change how you build
          </p>
        </div>

        {/* Video container with glow effect */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-2 rounded-2xl bg-gold/10 blur-xl" />
          <div className="absolute -inset-1 rounded-xl bg-gold/5 blur-md" />

          {/* Video wrapper */}
          <div
            className="relative overflow-hidden rounded-xl border border-gold/20 bg-black/50"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => !isPlaying && setShowControls(true)}
          >
            <video
              ref={videoRef}
              className="aspect-video w-full"
              src="/videos/mason-hype.mp4"
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnd}
              onClick={togglePlay}
              preload="metadata"
            />

            {/* Play overlay (shows when not playing) */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-navy shadow-lg shadow-gold/30 transition-transform hover:scale-110">
                  <Play className="h-10 w-10 pl-1" />
                </div>
              </button>
            )}

            {/* Controls bar */}
            {showControls && isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4">
                <button
                  onClick={togglePlay}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 pl-0.5" />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video caption */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Self-improving code. Zero maintenance. Rock solid by design.
        </p>
      </div>
    </section>
  );
}
