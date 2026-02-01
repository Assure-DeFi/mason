import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/**
 * Scene 2: Value Proposition (4-9s)
 * ITERATION 2: Punchier subtext, better kinetic energy
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
  const line1X = interpolate(line1Spring, [0, 1], [-150, 0]);
  const line1Opacity = interpolate(line1Spring, [0, 1], [0, 1]);

  // Line 2: "improves itself." - slide in from right
  const line2Spring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const line2X = interpolate(line2Spring, [0, 1], [150, 0]);
  const line2Opacity = interpolate(line2Spring, [0, 1], [0, 1]);

  // Line 3: "Automatically." - scale up with glow
  const line3Spring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const line3Scale = interpolate(line3Spring, [0, 1], [0.6, 1]);
  const line3Opacity = interpolate(line3Spring, [0, 1], [0, 1]);

  // INTENSE glow pulse on "Automatically" - more dramatic
  const glowIntensity = interpolate(
    (frame - 35) % 22,
    [0, 11, 22],
    [0.5, 1.2, 0.5],
    { extrapolateLeft: 'clamp' },
  );

  // Subtext - punchy version
  const subtextOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtextY = interpolate(frame, [70, 90], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background particles - more dynamic
  const particles = Array.from({ length: 25 }, (_, i) => {
    const baseX = (i * 97.3) % 100;
    const speed = 0.4 + (i % 3) * 0.25;
    const yPos = ((frame * speed + i * 25) % 115) - 7;
    const opacity = interpolate(yPos, [-7, 15, 95, 115], [0, 0.5, 0.5, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 2 + (i % 3) };
  });

  // Background glow
  const bgGlow = interpolate(frame, [30, 60], [0, 0.15], {
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

      {/* Center glow */}
      <div
        className="absolute"
        style={{
          width: 900,
          height: 600,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 60%)`,
        }}
      />

      {/* Main text container */}
      <div className="flex flex-col items-center">
        {/* Line 1 */}
        <div
          style={{
            transform: `translateX(${line1X}px)`,
            opacity: line1Opacity,
          }}
        >
          <span
            className="font-inter font-medium"
            style={{ fontSize: 52, color: 'rgba(255, 255, 255, 0.75)' }}
          >
            Your codebase
          </span>
        </div>

        {/* Line 2 */}
        <div
          className="mt-1"
          style={{
            transform: `translateX(${line2X}px)`,
            opacity: line2Opacity,
          }}
        >
          <span
            className="font-inter font-bold"
            style={{ fontSize: 68, color: '#FFFFFF' }}
          >
            improves itself.
          </span>
        </div>

        {/* Line 3 - The punch */}
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
              fontSize: 84,
              color: '#E2D243',
              textShadow: `0 0 ${70 * glowIntensity}px rgba(226, 210, 67, 0.9)`,
            }}
          >
            Automatically.
          </span>
        </div>

        {/* Subtext - PUNCHY version */}
        <div
          className="mt-10"
          style={{
            opacity: subtextOpacity,
            transform: `translateY(${subtextY}px)`,
          }}
        >
          <span
            className="font-inter font-medium"
            style={{ fontSize: 26, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            While you sleep.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
