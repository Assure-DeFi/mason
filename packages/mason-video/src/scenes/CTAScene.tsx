import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/**
 * Scene 4: CTA (15-20s)
 * ITERATION 2: More vibecoder-friendly, dramatic entrance
 */
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation - dramatic entrance
  const logoSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Logo glow pulse - more intense
  const logoGlow = interpolate((frame - 3) % 25, [0, 12, 25], [0.4, 0.8, 0.4], {
    extrapolateLeft: 'clamp',
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [20, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [20, 38], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA button - SNAPPIER entrance
  const ctaSpring = spring({
    frame: frame - 38,
    fps,
    config: { damping: 8, stiffness: 120 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.6, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Button glow pulse - faster, more energetic
  const buttonPulse = interpolate(
    (frame - 38) % 28,
    [0, 14, 28],
    [1, 1.06, 1],
    { extrapolateLeft: 'clamp' },
  );

  // Background intensity
  const bgGlow = interpolate(frame, [30, 70], [0, 0.25], {
    extrapolateRight: 'clamp',
  });

  // Particles
  const particles = Array.from({ length: 35 }, (_, i) => {
    const baseX = (i * 83.7) % 100;
    const speed = 0.4 + (i % 4) * 0.25;
    const yPos = ((frame * speed + i * 35) % 125) - 12;
    const opacity = interpolate(yPos, [-12, 12, 100, 125], [0, 0.45, 0.45, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 2 + (i % 3) };
  });

  // Assure DeFi branding
  const brandingOpacity = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Social proof hint - EARLIER to be visible
  const socialProofOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Background particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: '#E2D243',
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Center glow */}
      <div
        className="absolute"
        style={{
          width: 1000,
          height: 700,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 55%)`,
        }}
      />

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Logo - dramatic */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 110,
              color: '#FFFFFF',
              textShadow: `0 0 ${60 * logoGlow}px rgba(226, 210, 67, 0.7)`,
            }}
          >
            <span style={{ color: '#E2D243' }}>M</span>ASON
          </span>
        </div>

        {/* Tagline */}
        <div
          className="mt-2"
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <span
            className="font-inter font-semibold tracking-widest uppercase"
            style={{
              fontSize: 20,
              color: '#E2D243',
              letterSpacing: '0.3em',
            }}
          >
            Rock Solid by Design
          </span>
        </div>

        {/* CTA Button - vibecoder style */}
        <div
          className="mt-10 relative"
          style={{
            transform: `scale(${ctaScale * buttonPulse})`,
            opacity: ctaOpacity,
          }}
        >
          {/* Button glow */}
          <div
            className="absolute inset-0 rounded-lg blur-lg"
            style={{
              background: '#E2D243',
              opacity: 0.5,
              transform: 'scale(1.15)',
            }}
          />
          {/* Button */}
          <div
            className="relative px-10 py-4 rounded-lg"
            style={{
              background: '#E2D243',
              boxShadow: '0 0 35px rgba(226, 210, 67, 0.5)',
            }}
          >
            <span
              className="font-inter font-bold uppercase tracking-wider"
              style={{ fontSize: 18, color: '#0A0724' }}
            >
              Start Building
            </span>
          </div>
        </div>

        {/* Social proof hint */}
        <div className="mt-5" style={{ opacity: socialProofOpacity }}>
          <span
            className="font-inter"
            style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.45)' }}
          >
            Join 500+ builders shipping faster
          </span>
        </div>
      </div>

      {/* Assure DeFi branding - bottom right, subtle */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          bottom: 35,
          right: 45,
          opacity: brandingOpacity,
        }}
      >
        <span
          className="font-inter"
          style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.35)' }}
        >
          Built by
        </span>
        <span
          className="font-inter font-medium"
          style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.55)' }}
        >
          Assure DeFi
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255, 255, 255, 0.35)' }}>
          ®
        </span>
      </div>
    </AbsoluteFill>
  );
};
