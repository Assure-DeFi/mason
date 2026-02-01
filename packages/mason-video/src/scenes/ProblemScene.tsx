import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { text: "Endless backlog", icon: "stack", delay: 0 },
    { text: "Manual code reviews", icon: "eye", delay: 15 },
    { text: "Forgotten improvements", icon: "ghost", delay: 30 },
    { text: "No time to refactor", icon: "clock", delay: 45 },
  ];

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [-40, 0], {
    extrapolateRight: "clamp",
  });

  // Strike through animation on problems
  const strikeProgress = interpolate(frame, [150, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Red tint for problems
  const redOverlay = interpolate(frame, [60, 90], [0, 0.05], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Subtle red warning overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(239, 68, 68, ${redOverlay})`,
        }}
      />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="flex flex-col items-center w-full max-w-5xl px-8">
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <h2
            className="font-inter font-bold text-center mb-16"
            style={{ fontSize: 64, color: "#FFFFFF" }}
          >
            Sound familiar?
          </h2>
        </div>

        {/* Problem cards grid */}
        <div className="grid grid-cols-2 gap-8 w-full">
          {problems.map((problem, index) => {
            const cardSpring = spring({
              frame: frame - problem.delay - 20,
              fps,
              config: { damping: 15, stiffness: 80 },
            });

            const cardScale = interpolate(cardSpring, [0, 1], [0.8, 1]);
            const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

            // Strike through width
            const strikeWidth = strikeProgress * 100;

            return (
              <div
                key={index}
                className="relative flex items-center gap-6 p-8 rounded-lg"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  opacity: cardOpacity,
                  transform: `scale(${cardScale})`,
                }}
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                >
                  <span style={{ fontSize: 32 }}>
                    {problem.icon === "stack" && "📚"}
                    {problem.icon === "eye" && "👁️"}
                    {problem.icon === "ghost" && "👻"}
                    {problem.icon === "clock" && "⏰"}
                  </span>
                </div>

                {/* Text */}
                <p
                  className="font-inter font-semibold"
                  style={{ fontSize: 28, color: "#FFFFFF" }}
                >
                  {problem.text}
                </p>

                {/* Strike through line */}
                <div
                  className="absolute left-6 right-6 h-1 rounded"
                  style={{
                    background: "#E2D243",
                    width: `${strikeWidth}%`,
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: strikeProgress,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom text */}
        <div
          className="mt-16"
          style={{
            opacity: interpolate(frame, [100, 120], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <p
            className="font-inter text-center"
            style={{ fontSize: 24, color: "rgba(255, 255, 255, 0.6)" }}
          >
            You're not alone. Every developer struggles with this.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
