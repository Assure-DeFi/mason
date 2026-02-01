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
 * Scene 2: Value Proposition (4-9s)
 * V3: Maximum text size, no tiny elements, fills the screen
 */
export const ValueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line 1: "Your codebase" - slide in from left
  const line1Spring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const line1X = interpolate(line1Spring, [0, 1], [-200, 0]);
  const line1Opacity = interpolate(line1Spring, [0, 1], [0, 1]);

  // Line 2: "improves itself." - slide in from right
  const line2Spring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const line2X = interpolate(line2Spring, [0, 1], [200, 0]);
  const line2Opacity = interpolate(line2Spring, [0, 1], [0, 1]);

  // Line 3: "Automatically." - scale up with glow - THE BIG PUNCH
  const line3Spring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 10, stiffness: 80 },
  });
  const line3Scale = interpolate(line3Spring, [0, 1], [0.5, 1]);
  const line3Opacity = interpolate(line3Spring, [0, 1], [0, 1]);

  // INTENSE glow pulse on "Automatically"
  const glowIntensity = interpolate(
    (frame - 35) % 20,
    [0, 10, 20],
    [0.6, 1.5, 0.6],
    { extrapolateLeft: 'clamp' },
  );

  // Subtext "While you sleep" - appears after main text
  const subtextOpacity = interpolate(frame, [75, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtextY = interpolate(frame, [75, 95], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Mason character - slides in from right when subtext appears
  const masonSpring = spring({
    frame: frame - 80,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const masonX = interpolate(masonSpring, [0, 1], [300, 0]);
  const masonOpacity = interpolate(masonSpring, [0, 1], [0, 1]);
  const masonScale = interpolate(masonSpring, [0, 1], [0.6, 1]);

  // Mason "working" bob animation - subtle up/down like he's hammering
  const masonBob = Math.sin((frame - 80) * 0.25) * 8;
  const masonRotate = Math.sin((frame - 80) * 0.15) * 2; // subtle rotation

  // Mason glow pulse matching the gold theme
  const masonGlow = interpolate((frame - 80) % 30, [0, 15, 30], [0.3, 0.7, 0.3], {
    extrapolateLeft: 'clamp',
  });

  // Background particles
  const particles = Array.from({ length: 35 }, (_, i) => {
    const baseX = (i * 97.3) % 100;
    const speed = 0.5 + (i % 3) * 0.3;
    const yPos = ((frame * speed + i * 25) % 120) - 10;
    const opacity = interpolate(yPos, [-10, 20, 90, 120], [0, 0.7, 0.7, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 3 + (i % 4) };
  });

  // Background glow intensifies with the punch
  const bgGlow = interpolate(frame, [30, 60], [0.05, 0.35], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Floating particles */}
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

      {/* Center glow - big and dramatic */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 1000,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 60%)`,
        }}
      />

      {/* Main text container - centered and HUGE */}
      <div className="flex flex-col items-center">
        {/* Line 1 - BIG */}
        <div
          style={{
            transform: `translateX(${line1X}px)`,
            opacity: line1Opacity,
          }}
        >
          <span
            className="font-inter font-medium"
            style={{
              fontSize: 90,
              color: 'rgba(255, 255, 255, 0.85)',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            Your codebase
          </span>
        </div>

        {/* Line 2 - BIGGER */}
        <div
          style={{
            transform: `translateX(${line2X}px)`,
            opacity: line2Opacity,
            marginTop: -10,
          }}
        >
          <span
            className="font-inter font-bold"
            style={{
              fontSize: 110,
              color: '#FFFFFF',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            improves itself.
          </span>
        </div>

        {/* Line 3 - THE PUNCH - MASSIVE */}
        <div
          className="mt-6"
          style={{
            transform: `scale(${line3Scale})`,
            opacity: line3Opacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 140,
              color: '#E2D243',
              textShadow: `0 0 ${100 * glowIntensity}px rgba(226, 210, 67, 0.9), 0 4px 30px rgba(0, 0, 0, 0.5)`,
            }}
          >
            Automatically.
          </span>
        </div>

        {/* Subtext - still big enough to read */}
        <div
          className="mt-8"
          style={{
            opacity: subtextOpacity,
            transform: `translateY(${subtextY}px)`,
          }}
        >
          <span
            className="font-inter font-semibold"
            style={{
              fontSize: 48,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '0.05em',
            }}
          >
            While you sleep.
          </span>
        </div>
      </div>

      {/* Mason character - the builder at work */}
      <div
        className="absolute"
        style={{
          right: 80,
          bottom: 60,
          opacity: masonOpacity,
          transform: `translateX(${masonX}px) translateY(${masonBob}px) scale(${masonScale}) rotate(${masonRotate}deg)`,
        }}
      >
        {/* Glow behind Mason */}
        <div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{
            background: `rgba(226, 210, 67, ${masonGlow})`,
            transform: 'scale(1.5)',
          }}
        />
        {/* Mason icon */}
        <Img
          src={staticFile('mason_icon.png')}
          style={{
            width: 200,
            height: 200,
            filter: `drop-shadow(0 0 30px rgba(226, 210, 67, ${masonGlow + 0.3}))`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
