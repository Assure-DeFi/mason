import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from 'remotion';

/**
 * Scene 5: CTA (26-30s) - 120 frames
 *
 * ROUND 1 IMPROVEMENTS:
 * - MORE motion - everything pulses/breathes
 * - Faster animations
 * - Bigger text
 * - More particles
 */
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo slam entrance
  const logoSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 8, stiffness: 80 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [1.5, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 0.3, 1], [0, 0.7, 1]);

  // Intense glow pulse
  const glowIntensity = interpolate(
    (frame - 5) % 18,
    [0, 9, 18],
    [0.7, 1.5, 0.7],
    { extrapolateLeft: 'clamp' },
  );

  // Tagline reveal
  const taglineSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [30, 0]);
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);

  // CTA button entrance - FASTER
  const ctaSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.4, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Button pulse - MAXIMUM AGGRESSIVE
  const buttonPulse = interpolate((frame - 25) % 8, [0, 4, 8], [1, 1.18, 1], {
    extrapolateLeft: 'clamp',
  });

  // Button glow synced with pulse
  const buttonGlowIntensity = interpolate((frame - 25) % 8, [0, 4, 8], [0.6, 1, 0.6], {
    extrapolateLeft: 'clamp',
  });

  // Logo breathing - subtle but visible
  const logoBreathe = interpolate((frame - 3) % 20, [0, 10, 20], [1, 1.04, 1], {
    extrapolateLeft: 'clamp',
  });

  // Assure DeFi branding - FASTER
  const brandSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const brandScale = interpolate(brandSpring, [0, 1], [0.85, 1]);
  const brandOpacity = interpolate(brandSpring, [0, 1], [0, 1]);

  // Background energy
  const bgGlow = interpolate(frame, [0, 40], [0.2, 0.5], {
    extrapolateRight: 'clamp',
  });

  // Radiating rings from center
  const rings = Array.from({ length: 4 }, (_, i) => {
    const ringDelay = i * 20;
    const ringProgress = ((frame - ringDelay) % 60) / 60;
    return {
      id: i,
      scale: ringProgress * 4,
      opacity: interpolate(ringProgress, [0, 0.3, 1], [0, 0.5, 0]),
    };
  });

  // Particle shower with twinkling
  const particles = Array.from({ length: 60 }, (_, i) => {
    const speed = 0.6 + (i % 6) * 0.25;
    const xPos = (i * 61.7) % 100;
    const yPos = ((frame * speed + i * 25) % 130) - 15;
    // Twinkle effect - different rates for each star
    const twinkle = Math.sin((frame + i * 17) * (0.15 + (i % 5) * 0.05)) * 0.4 + 0.6;
    return {
      id: i,
      x: xPos,
      y: yPos,
      opacity: interpolate(yPos, [-15, 20, 100, 130], [0, 0.7, 0.7, 0]) * twinkle,
      size: 3 + (i % 5),
    };
  });

  // Shooting stars
  const shootingStars = Array.from({ length: 3 }, (_, i) => {
    const startFrame = 20 + i * 35;
    const progress = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      id: i,
      x: interpolate(progress, [0, 1], [10 + i * 30, 90 - i * 20]),
      y: interpolate(progress, [0, 1], [10 + i * 15, 70 + i * 10]),
      opacity: interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 0.8, 0]),
      length: 80 + i * 20,
    };
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Particle shower with twinkle */}
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
            boxShadow: `0 0 ${p.size * 2}px rgba(226, 210, 67, ${p.opacity})`,
          }}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((star) => (
        <div
          key={`shoot-${star.id}`}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.length,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #FFFFFF, #E2D243)',
            opacity: star.opacity,
            transform: 'rotate(45deg)',
            boxShadow: '0 0 10px #FFFFFF',
          }}
        />
      ))}

      {/* Radiating rings */}
      {rings.map((ring) => (
        <div
          key={ring.id}
          className="absolute rounded-full border-2"
          style={{
            width: 300,
            height: 300,
            borderColor: '#E2D243',
            transform: `scale(${ring.scale})`,
            opacity: ring.opacity,
          }}
        />
      ))}

      {/* Center glow */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 1000,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 50%)`,
        }}
      />

      {/* Main content container */}
      <div className="flex flex-col items-center">
        {/* MASON logo - MASSIVE with breathing */}
        <div
          style={{
            transform: `scale(${logoScale * logoBreathe})`,
            opacity: logoOpacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 200,
              color: '#FFFFFF',
              textShadow: `
                0 0 ${100 * glowIntensity}px rgba(226, 210, 67, 0.9),
                0 0 ${200 * glowIntensity}px rgba(226, 210, 67, 0.5),
                0 10px 50px rgba(0, 0, 0, 0.5)
              `,
            }}
          >
            <span style={{ color: '#E2D243' }}>M</span>ASON
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            marginTop: -15,
          }}
        >
          <span
            className="font-inter font-bold tracking-widest uppercase"
            style={{
              fontSize: 40,
              color: '#E2D243',
              letterSpacing: '0.35em',
              textShadow: '0 0 30px rgba(226, 210, 67, 0.5)',
            }}
          >
            Rock Solid by Design
          </span>
        </div>

        {/* CTA Button */}
        <div
          className="mt-12 relative"
          style={{
            transform: `scale(${ctaScale * buttonPulse})`,
            opacity: ctaOpacity,
          }}
        >
          {/* Button glow - synced with pulse */}
          <div
            className="absolute inset-0 rounded-2xl blur-3xl"
            style={{
              background: '#E2D243',
              opacity: buttonGlowIntensity,
              transform: 'scale(1.4)',
            }}
          />
          {/* Button */}
          <div
            className="relative px-24 py-7 rounded-2xl"
            style={{
              background: '#E2D243',
              boxShadow: `0 0 ${100 * buttonGlowIntensity}px rgba(226, 210, 67, 0.9)`,
            }}
          >
            <span
              className="font-inter font-black uppercase tracking-wide"
              style={{ fontSize: 40, color: '#0A0724' }}
            >
              Start Building Free
            </span>
          </div>
        </div>
      </div>

      {/* Assure DeFi branding */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          bottom: 50,
          opacity: brandOpacity,
          transform: `scale(${brandScale})`,
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="font-inter font-medium"
            style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Built by
          </span>
          <Img
            src={staticFile('assure-defi-logo.svg')}
            style={{
              height: 44,
              width: 'auto',
              filter: 'drop-shadow(0 0 15px rgba(226, 210, 67, 0.3))',
            }}
          />
          <span
            className="font-inter font-bold"
            style={{ fontSize: 28, color: '#FFFFFF' }}
          >
            Assure DeFi
          </span>
        </div>
        <span
          className="mt-2 font-inter"
          style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.4)' }}
        >
          Security & Trust for Web3
        </span>
      </div>
    </AbsoluteFill>
  );
};
