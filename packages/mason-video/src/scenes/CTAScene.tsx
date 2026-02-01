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
 * Scene 4: CTA (15-20s)
 * ITERATION 3: More prominent Assure DeFi branding, larger text, dashboard preview
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
  const logoGlow = interpolate((frame - 3) % 25, [0, 12, 25], [0.4, 0.9, 0.4], {
    extrapolateLeft: 'clamp',
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [18, 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [18, 32], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA button - SNAPPIER entrance
  const ctaSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 8, stiffness: 120 },
  });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.6, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Button glow pulse - faster, more energetic
  const buttonPulse = interpolate(
    (frame - 35) % 28,
    [0, 14, 28],
    [1, 1.08, 1],
    { extrapolateLeft: 'clamp' },
  );

  // Background intensity
  const bgGlow = interpolate(frame, [30, 70], [0, 0.3], {
    extrapolateRight: 'clamp',
  });

  // Particles
  const particles = Array.from({ length: 40 }, (_, i) => {
    const baseX = (i * 83.7) % 100;
    const speed = 0.4 + (i % 4) * 0.25;
    const yPos = ((frame * speed + i * 35) % 125) - 12;
    const opacity = interpolate(yPos, [-12, 12, 100, 125], [0, 0.5, 0.5, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 2 + (i % 3) };
  });

  // Assure DeFi branding - MORE PROMINENT
  const brandingOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brandingScale = interpolate(frame, [55, 75], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Social proof
  const socialProofOpacity = interpolate(frame, [65, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dashboard preview - shows what they're getting
  const dashboardOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dashboardX = interpolate(frame, [85, 105], [50, 0], {
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
          width: 1100,
          height: 800,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 55%)`,
        }}
      />

      {/* Main content - positioned higher */}
      <div className="flex flex-col items-center" style={{ marginTop: -60 }}>
        {/* Logo - dramatic, LARGER */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 140,
              color: '#FFFFFF',
              textShadow: `0 0 ${70 * logoGlow}px rgba(226, 210, 67, 0.8)`,
            }}
          >
            <span style={{ color: '#E2D243' }}>M</span>ASON
          </span>
        </div>

        {/* Tagline - LARGER */}
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
              fontSize: 28,
              color: '#E2D243',
              letterSpacing: '0.35em',
            }}
          >
            Rock Solid by Design
          </span>
        </div>

        {/* CTA Button - vibecoder style, LARGER */}
        <div
          className="mt-12 relative"
          style={{
            transform: `scale(${ctaScale * buttonPulse})`,
            opacity: ctaOpacity,
          }}
        >
          {/* Button glow */}
          <div
            className="absolute inset-0 rounded-xl blur-xl"
            style={{
              background: '#E2D243',
              opacity: 0.5,
              transform: 'scale(1.2)',
            }}
          />
          {/* Button */}
          <div
            className="relative px-14 py-5 rounded-xl"
            style={{
              background: '#E2D243',
              boxShadow: '0 0 45px rgba(226, 210, 67, 0.6)',
            }}
          >
            <span
              className="font-inter font-bold uppercase tracking-wider"
              style={{ fontSize: 24, color: '#0A0724' }}
            >
              Start Building Free
            </span>
          </div>
        </div>

        {/* Social proof hint */}
        <div className="mt-6" style={{ opacity: socialProofOpacity }}>
          <span
            className="font-inter"
            style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Join 500+ builders shipping faster
          </span>
        </div>
      </div>

      {/* Dashboard preview - right side, angled */}
      <div
        className="absolute"
        style={{
          right: 30,
          top: '50%',
          transform: `translateY(-50%) translateX(${dashboardX}px) perspective(1000px) rotateY(-8deg)`,
          opacity: dashboardOpacity,
        }}
      >
        <div className="relative">
          {/* Glow */}
          <div
            className="absolute -inset-4 rounded-xl blur-xl"
            style={{ backgroundColor: 'rgba(226, 210, 67, 0.2)' }}
          />
          {/* Dashboard */}
          <div
            className="relative overflow-hidden rounded-lg border-2"
            style={{
              width: 280,
              height: 200,
              borderColor: 'rgba(226, 210, 67, 0.4)',
            }}
          >
            <Img
              src={staticFile('screenshots/04-backlog-full.png')}
              style={{
                width: 280,
                height: 'auto',
                objectFit: 'cover',
                objectPosition: 'top left',
              }}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, transparent 40%, rgba(10, 7, 36, 0.8) 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Assure DeFi branding - MORE PROMINENT, centered at bottom */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          bottom: 40,
          opacity: brandingOpacity,
          transform: `scale(${brandingScale})`,
        }}
      >
        {/* "Built by" with Assure DeFi */}
        <div className="flex items-center gap-3">
          <span
            className="font-inter"
            style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Built by
          </span>
          <div className="flex items-center gap-2">
            {/* Assure DeFi logo placeholder - using gold circle as placeholder */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #E2D243 0%, #C5B83A 100%)',
                boxShadow: '0 0 15px rgba(226, 210, 67, 0.4)',
              }}
            >
              <span
                className="font-inter font-black"
                style={{ fontSize: 18, color: '#0A0724' }}
              >
                A
              </span>
            </div>
            <span
              className="font-inter font-bold"
              style={{ fontSize: 22, color: '#FFFFFF' }}
            >
              Assure DeFi
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
              ®
            </span>
          </div>
        </div>

        {/* Assure DeFi tagline */}
        <span
          className="mt-2 font-inter"
          style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.4)' }}
        >
          Security & Trust for Web3
        </span>
      </div>
    </AbsoluteFill>
  );
};
