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
 * ITERATION 3: Larger text, dashboard preview, less blank space
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
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const line2X = interpolate(line2Spring, [0, 1], [150, 0]);
  const line2Opacity = interpolate(line2Spring, [0, 1], [0, 1]);

  // Line 3: "Automatically." - scale up with glow
  const line3Spring = spring({
    frame: frame - 28,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const line3Scale = interpolate(line3Spring, [0, 1], [0.6, 1]);
  const line3Opacity = interpolate(line3Spring, [0, 1], [0, 1]);

  // INTENSE glow pulse on "Automatically" - more dramatic
  const glowIntensity = interpolate(
    (frame - 28) % 22,
    [0, 11, 22],
    [0.5, 1.2, 0.5],
    { extrapolateLeft: 'clamp' },
  );

  // Dashboard preview animation - earlier and more prominent
  const dashboardOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dashboardScale = interpolate(frame, [50, 70], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dashboardY = interpolate(frame, [50, 70], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background particles - more dynamic
  const particles = Array.from({ length: 35 }, (_, i) => {
    const baseX = (i * 97.3) % 100;
    const speed = 0.5 + (i % 3) * 0.3;
    const yPos = ((frame * speed + i * 25) % 115) - 7;
    const opacity = interpolate(yPos, [-7, 15, 95, 115], [0, 0.6, 0.6, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { id: i, x: baseX, y: yPos, opacity, size: 2 + (i % 3) };
  });

  // Background glow - intensifies
  const bgGlow = interpolate(frame, [20, 50], [0, 0.25], {
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
          width: 1100,
          height: 800,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 60%)`,
        }}
      />

      {/* Main content - positioned higher to make room for dashboard */}
      <div className="flex flex-col items-center" style={{ marginTop: -100 }}>
        {/* Line 1 - LARGER */}
        <div
          style={{
            transform: `translateX(${line1X}px)`,
            opacity: line1Opacity,
          }}
        >
          <span
            className="font-inter font-medium"
            style={{ fontSize: 72, color: 'rgba(255, 255, 255, 0.85)' }}
          >
            Your codebase
          </span>
        </div>

        {/* Line 2 - LARGER */}
        <div
          className="mt-1"
          style={{
            transform: `translateX(${line2X}px)`,
            opacity: line2Opacity,
          }}
        >
          <span
            className="font-inter font-bold"
            style={{ fontSize: 92, color: '#FFFFFF' }}
          >
            improves itself.
          </span>
        </div>

        {/* Line 3 - The punch - LARGER */}
        <div
          className="mt-4"
          style={{
            transform: `scale(${line3Scale})`,
            opacity: line3Opacity,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 120,
              color: '#E2D243',
              textShadow: `0 0 ${90 * glowIntensity}px rgba(226, 210, 67, 0.9)`,
            }}
          >
            Automatically.
          </span>
        </div>
      </div>

      {/* Dashboard preview - bottom portion, showing improvement suggestions */}
      <div
        className="absolute"
        style={{
          bottom: 35,
          opacity: dashboardOpacity,
          transform: `scale(${dashboardScale}) translateY(${dashboardY}px)`,
        }}
      >
        <div className="relative">
          {/* Glow behind dashboard */}
          <div
            className="absolute -inset-4 rounded-2xl blur-xl"
            style={{ backgroundColor: 'rgba(226, 210, 67, 0.2)' }}
          />
          {/* Dashboard screenshot - cropped view */}
          <div
            className="relative overflow-hidden rounded-xl border-2 border-gold/40"
            style={{
              width: 750,
              height: 160,
            }}
          >
            <Img
              src={staticFile('screenshots/02-backlog-improvements.png')}
              style={{
                width: 750,
                height: 'auto',
                objectFit: 'cover',
                objectPosition: 'top center',
              }}
            />
            {/* Gradient overlay for smooth edges */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(to bottom, transparent 50%, rgba(10, 7, 36, 0.95) 100%),
                  linear-gradient(to right, rgba(10, 7, 36, 0.4) 0%, transparent 10%, transparent 90%, rgba(10, 7, 36, 0.4) 100%)
                `,
              }}
            />
          </div>
          {/* Label */}
          <div className="text-center mt-2">
            <span
              className="font-inter"
              style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.55)' }}
            >
              Real suggestions from Mason
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
