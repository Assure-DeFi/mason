import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom and reveal animation
  const zoomSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 60 },
  });

  const scale = interpolate(zoomSpring, [0, 1], [1.5, 1]);
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Text reveal stagger
  const line1Opacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line1Y = interpolate(frame, [30, 60], [30, 0], {
    extrapolateRight: "clamp",
  });

  const line2Opacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Y = interpolate(frame, [60, 90], [30, 0], {
    extrapolateRight: "clamp",
  });

  // Gold highlight glow pulse
  const glowPulse = interpolate(
    frame % 45,
    [0, 22, 45],
    [0.6, 1, 0.6],
    { extrapolateRight: "clamp" }
  );

  // Particle burst from center
  const burstParticles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const burstFrame = frame - 20;
    const distance = interpolate(burstFrame, [0, 40], [0, 600], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const particleOpacity = interpolate(burstFrame, [0, 20, 40], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: particleOpacity,
      size: 4 + (i % 4) * 2,
    };
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Radial gradient background */}
      <div
        className="absolute"
        style={{
          width: "200%",
          height: "200%",
          background: `radial-gradient(circle at center, rgba(226, 210, 67, 0.15) 0%, transparent 50%)`,
          transform: `scale(${scale})`,
          opacity,
        }}
      />

      {/* Particle burst */}
      {burstParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            backgroundColor: "#E2D243",
            opacity: p.opacity,
            transform: `translate(${p.x}px, ${p.y}px)`,
            boxShadow: "0 0 15px #E2D243",
          }}
        />
      ))}

      {/* Main content */}
      <div className="flex flex-col items-center text-center">
        {/* "What if" text */}
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
          }}
        >
          <p
            className="font-inter font-medium mb-6"
            style={{ fontSize: 36, color: "rgba(255, 255, 255, 0.7)" }}
          >
            What if your codebase could
          </p>
        </div>

        {/* Main headline */}
        <div
          style={{
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
          }}
        >
          <h2
            className="font-inter font-black"
            style={{
              fontSize: 96,
              color: "#FFFFFF",
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                color: "#E2D243",
                textShadow: `0 0 ${60 * glowPulse}px rgba(226, 210, 67, 0.8)`,
              }}
            >
              Improve
            </span>{" "}
            Itself?
          </h2>
        </div>

        {/* Subtext */}
        <div
          className="mt-12"
          style={{
            opacity: interpolate(frame, [100, 120], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <p
            className="font-inter font-medium"
            style={{ fontSize: 28, color: "rgba(255, 255, 255, 0.6)" }}
          >
            Introducing autonomous code improvement
          </p>
        </div>
      </div>

      {/* Corner decorations */}
      <div
        className="absolute"
        style={{
          top: 100,
          left: 100,
          width: 200,
          height: 2,
          background: `linear-gradient(90deg, #E2D243, transparent)`,
          opacity: interpolate(frame, [80, 100], [0, 0.5], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        className="absolute"
        style={{
          top: 100,
          left: 100,
          width: 2,
          height: 200,
          background: `linear-gradient(180deg, #E2D243, transparent)`,
          opacity: interpolate(frame, [80, 100], [0, 0.5], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 100,
          right: 100,
          width: 200,
          height: 2,
          background: `linear-gradient(270deg, #E2D243, transparent)`,
          opacity: interpolate(frame, [80, 100], [0, 0.5], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 100,
          right: 100,
          width: 2,
          height: 200,
          background: `linear-gradient(0deg, #E2D243, transparent)`,
          opacity: interpolate(frame, [80, 100], [0, 0.5], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
