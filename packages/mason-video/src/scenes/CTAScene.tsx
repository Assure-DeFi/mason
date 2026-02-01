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
 * V3: Massive text, prominent Assure DeFi, no tiny elements
 */
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation - dramatic entrance
  const logoSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Logo glow pulse - intense
  const logoGlow = interpolate((frame - 3) % 22, [0, 11, 22], [0.5, 1.2, 0.5], {
    extrapolateLeft: 'clamp',
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [20, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [20, 38], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA button
  const ctaSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.5, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Button pulse
  const buttonPulse = interpolate((frame - 40) % 25, [0, 12, 25], [1, 1.1, 1], {
    extrapolateLeft: 'clamp',
  });

  // Assure DeFi branding - PROMINENT
  const brandingSpring = spring({
    frame: frame - 70,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const brandingScale = interpolate(brandingSpring, [0, 1], [0.8, 1]);
  const brandingOpacity = interpolate(brandingSpring, [0, 1], [0, 1]);

  // Background glow
  const bgGlow = interpolate(frame, [20, 60], [0.05, 0.4], {
    extrapolateRight: 'clamp',
  });

  // Particles
  const particles = Array.from({ length: 45 }, (_, i) => {
    const baseX = (i * 83.7) % 100;
    const speed = 0.4 + (i % 4) * 0.3;
    const yPos = ((frame * speed + i * 35) % 130) - 15;
    const opacity = interpolate(yPos, [-15, 15, 105, 130], [0, 0.6, 0.6, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 3 + (i % 4) };
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

      {/* Center glow - dramatic */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 1000,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 55%)`,
        }}
      />

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Logo - MASSIVE */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 180,
              color: '#FFFFFF',
              textShadow: `0 0 ${90 * logoGlow}px rgba(226, 210, 67, 0.9), 0 8px 40px rgba(0, 0, 0, 0.5)`,
            }}
          >
            <span style={{ color: '#E2D243' }}>M</span>ASON
          </span>
        </div>

        {/* Tagline - BIG */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            marginTop: -10,
          }}
        >
          <span
            className="font-inter font-bold tracking-widest uppercase"
            style={{
              fontSize: 38,
              color: '#E2D243',
              letterSpacing: '0.4em',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            Rock Solid by Design
          </span>
        </div>

        {/* CTA Button - LARGE */}
        <div
          className="mt-16 relative"
          style={{
            transform: `scale(${ctaScale * buttonPulse})`,
            opacity: ctaOpacity,
          }}
        >
          {/* Button glow */}
          <div
            className="absolute inset-0 rounded-2xl blur-2xl"
            style={{
              background: '#E2D243',
              opacity: 0.6,
              transform: 'scale(1.25)',
            }}
          />
          {/* Button */}
          <div
            className="relative px-16 py-6 rounded-2xl"
            style={{
              background: '#E2D243',
              boxShadow: '0 0 60px rgba(226, 210, 67, 0.7)',
            }}
          >
            <span
              className="font-inter font-black uppercase tracking-wide"
              style={{ fontSize: 32, color: '#0A0724' }}
            >
              Start Building Free
            </span>
          </div>
        </div>
      </div>

      {/* Assure DeFi branding - PROMINENT at bottom */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          bottom: 60,
          opacity: brandingOpacity,
          transform: `scale(${brandingScale})`,
        }}
      >
        {/* Built by line */}
        <div className="flex items-center gap-4">
          <span
            className="font-inter font-medium"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Built by
          </span>
          <div className="flex items-center gap-3">
            {/* Assure DeFi logo mark */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #E2D243 0%, #C9B63B 100%)',
                boxShadow: '0 0 25px rgba(226, 210, 67, 0.5)',
              }}
            >
              <span
                className="font-inter font-black"
                style={{ fontSize: 28, color: '#0A0724' }}
              >
                A
              </span>
            </div>
            <span
              className="font-inter font-bold"
              style={{ fontSize: 32, color: '#FFFFFF' }}
            >
              Assure DeFi
            </span>
            <span
              className="font-inter"
              style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }}
            >
              ®
            </span>
          </div>
        </div>

        {/* Assure DeFi tagline */}
        <span
          className="mt-3 font-inter font-medium"
          style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.5)' }}
        >
          Security & Trust for Web3
        </span>
      </div>
    </AbsoluteFill>
  );
};
