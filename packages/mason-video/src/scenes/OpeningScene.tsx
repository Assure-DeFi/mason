import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Particle animation for background energy
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    startX: (i * 137.5) % 100,
    startY: (i * 73.7) % 100,
    speed: 0.5 + (i % 5) * 0.3,
    size: 2 + (i % 4),
  }));

  // Logo scale and opacity animation
  const logoSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline animation
  const taglineOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [70, 100], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulse effect on logo
  const pulseScale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.02, 1],
    { extrapolateRight: "clamp" }
  );

  // Glow intensity
  const glowIntensity = interpolate(frame, [50, 80], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(226, 210, 67, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 210, 67, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: `translateY(${(frame * 0.5) % 60}px)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => {
        const yOffset = ((frame * p.speed) % 120) - 10;
        const opacity = interpolate(
          yOffset,
          [-10, 20, 100, 120],
          [0, 0.6, 0.6, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.startX}%`,
              bottom: `${yOffset}%`,
              width: p.size,
              height: p.size,
              backgroundColor: "#E2D243",
              opacity,
              boxShadow: "0 0 10px #E2D243",
            }}
          />
        );
      })}

      {/* Center radial glow */}
      <div
        className="absolute"
        style={{
          width: 800,
          height: 800,
          background: `radial-gradient(circle, rgba(226, 210, 67, ${0.15 * glowIntensity}) 0%, transparent 60%)`,
          transform: `scale(${1 + glowIntensity * 0.3})`,
        }}
      />

      {/* Main content container */}
      <div
        className="flex flex-col items-center"
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale * pulseScale})`,
        }}
      >
        {/* Mason Logo - stylized text */}
        <div className="relative">
          {/* Glow effect behind logo */}
          <div
            className="absolute inset-0 blur-2xl"
            style={{
              background: "rgba(226, 210, 67, 0.4)",
              transform: "scale(1.5)",
              opacity: glowIntensity * 0.5,
            }}
          />

          {/* Logo text */}
          <h1
            className="relative font-inter font-black tracking-tight"
            style={{
              fontSize: 180,
              color: "#FFFFFF",
              textShadow: `0 0 ${40 * glowIntensity}px rgba(226, 210, 67, 0.8)`,
            }}
          >
            <span style={{ color: "#E2D243" }}>M</span>ASON
          </h1>
        </div>

        {/* Tagline */}
        <div
          className="mt-6"
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <p
            className="font-inter font-semibold tracking-widest uppercase"
            style={{
              fontSize: 32,
              color: "#E2D243",
              letterSpacing: "0.3em",
            }}
          >
            Rock Solid by Design
          </p>
        </div>
      </div>

      {/* Corner accents */}
      <div
        className="absolute top-0 left-0 w-32 h-32"
        style={{
          borderTop: "3px solid #E2D243",
          borderLeft: "3px solid #E2D243",
          opacity: interpolate(frame, [100, 120], [0, 0.6], {
            extrapolateRight: "clamp",
          }),
          margin: 40,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-32 h-32"
        style={{
          borderBottom: "3px solid #E2D243",
          borderRight: "3px solid #E2D243",
          opacity: interpolate(frame, [100, 120], [0, 0.6], {
            extrapolateRight: "clamp",
          }),
          margin: 40,
        }}
      />
    </AbsoluteFill>
  );
};
