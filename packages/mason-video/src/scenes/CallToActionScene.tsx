import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const CallToActionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main content spring animation
  const contentSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const contentScale = interpolate(contentSpring, [0, 1], [0.9, 1]);
  const contentOpacity = interpolate(contentSpring, [0, 1], [0, 1]);

  // Button pulse animation
  const buttonPulse = interpolate(
    frame % 45,
    [0, 22, 45],
    [1, 1.05, 1],
    { extrapolateRight: "clamp" }
  );

  // Background energy particles
  const energyParticles = Array.from({ length: 40 }, (_, i) => {
    const baseX = (i * 97.3) % 100;
    const speed = 0.8 + (i % 4) * 0.4;
    const yPos = ((frame * speed + i * 50) % 120) - 10;
    const particleOpacity = interpolate(
      yPos,
      [-10, 10, 100, 110],
      [0, 0.7, 0.7, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const size = 3 + (i % 3) * 2;

    return {
      id: i,
      x: baseX,
      y: yPos,
      opacity: particleOpacity,
      size,
    };
  });

  // Rays from center
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rayOpacity = interpolate(
      frame,
      [30, 60],
      [0, 0.15],
      { extrapolateRight: "clamp" }
    );

    return {
      id: i,
      angle,
      opacity: rayOpacity,
    };
  });

  // Tagline characters for stagger animation
  const tagline = "ROCK SOLID BY DESIGN";
  const taglineChars = tagline.split("").map((char, i) => {
    const charOpacity = interpolate(
      frame,
      [80 + i * 2, 100 + i * 2],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return { char, opacity: charOpacity };
  });

  // Final glow burst
  const finalGlow = interpolate(frame, [120, 160], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Radial rays */}
      {rays.map((ray) => (
        <div
          key={ray.id}
          className="absolute"
          style={{
            width: 3,
            height: 1200,
            background: `linear-gradient(to top, transparent, rgba(226, 210, 67, ${ray.opacity}), transparent)`,
            left: "50%",
            top: "50%",
            transform: `translateX(-50%) translateY(-50%) rotate(${ray.angle}deg)`,
          }}
        />
      ))}

      {/* Energy particles */}
      {energyParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: "#E2D243",
            opacity: p.opacity,
            boxShadow: "0 0 10px #E2D243",
          }}
        />
      ))}

      {/* Central glow */}
      <div
        className="absolute"
        style={{
          width: 800,
          height: 800,
          background: `radial-gradient(circle, rgba(226, 210, 67, ${0.2 * finalGlow}) 0%, transparent 50%)`,
          transform: `scale(${1 + finalGlow * 0.5})`,
        }}
      />

      {/* Main content */}
      <div
        className="flex flex-col items-center text-center"
        style={{
          transform: `scale(${contentScale})`,
          opacity: contentOpacity,
        }}
      >
        {/* Logo */}
        <div
          className="mb-8"
          style={{
            textShadow: `0 0 ${50 * finalGlow}px rgba(226, 210, 67, 0.8)`,
          }}
        >
          <h1
            className="font-inter font-black"
            style={{ fontSize: 140, color: "#FFFFFF" }}
          >
            <span style={{ color: "#E2D243" }}>M</span>ASON
          </h1>
        </div>

        {/* Tagline with staggered animation */}
        <div className="mb-16 flex">
          {taglineChars.map((item, i) => (
            <span
              key={i}
              className="font-inter font-semibold"
              style={{
                fontSize: 28,
                color: "#E2D243",
                letterSpacing: "0.25em",
                opacity: item.opacity,
              }}
            >
              {item.char === " " ? "\u00A0" : item.char}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <div
          className="relative"
          style={{
            transform: `scale(${buttonPulse})`,
          }}
        >
          {/* Button glow */}
          <div
            className="absolute inset-0 rounded-lg blur-xl"
            style={{
              background: "#E2D243",
              opacity: 0.4,
              transform: "scale(1.1)",
            }}
          />

          {/* Button */}
          <div
            className="relative px-16 py-6 rounded-lg"
            style={{
              background: "#E2D243",
              boxShadow: `0 0 ${30 * buttonPulse}px rgba(226, 210, 67, 0.6)`,
            }}
          >
            <span
              className="font-inter font-bold uppercase tracking-widest"
              style={{ fontSize: 24, color: "#0A0724" }}
            >
              Get Started Free
            </span>
          </div>
        </div>

        {/* Subtext */}
        <div
          className="mt-10"
          style={{
            opacity: interpolate(frame, [140, 160], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <p
            className="font-inter"
            style={{ fontSize: 20, color: "rgba(255, 255, 255, 0.6)" }}
          >
            Your code improves while you sleep
          </p>
        </div>
      </div>

      {/* Corner accents */}
      {[
        { top: 40, left: 40, borderTop: true, borderLeft: true },
        { top: 40, right: 40, borderTop: true, borderRight: true },
        { bottom: 40, left: 40, borderBottom: true, borderLeft: true },
        { bottom: 40, right: 40, borderBottom: true, borderRight: true },
      ].map((corner, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            width: 80,
            height: 80,
            ...corner,
            ...(corner.borderTop && {
              borderTop: "2px solid #E2D243",
            }),
            ...(corner.borderBottom && {
              borderBottom: "2px solid #E2D243",
            }),
            ...(corner.borderLeft && {
              borderLeft: "2px solid #E2D243",
            }),
            ...(corner.borderRight && {
              borderRight: "2px solid #E2D243",
            }),
            opacity: interpolate(frame, [60, 80], [0, 0.6], {
              extrapolateRight: "clamp",
            }),
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
