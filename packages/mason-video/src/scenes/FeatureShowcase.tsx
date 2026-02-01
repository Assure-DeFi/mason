import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each card animates in sequence
  const cardDelay = index * 30;

  const cardSpring = spring({
    frame: frame - cardDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const slideX = interpolate(
    cardSpring,
    [0, 1],
    [index % 2 === 0 ? -100 : 100, 0]
  );
  const opacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Glow effect
  const glowOpacity = interpolate(
    frame - cardDelay,
    [40, 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      className="flex items-start gap-6 p-8 rounded-xl relative"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(226, 210, 67, 0.2)",
        transform: `translateX(${slideX}px)`,
        opacity,
        boxShadow: `0 0 ${30 * glowOpacity}px rgba(226, 210, 67, 0.15)`,
      }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0"
        style={{
          backgroundColor: "rgba(226, 210, 67, 0.15)",
          border: "1px solid rgba(226, 210, 67, 0.3)",
        }}
      >
        <span style={{ fontSize: 40 }}>{icon}</span>
      </div>

      {/* Content */}
      <div>
        <h3
          className="font-inter font-bold mb-2"
          style={{ fontSize: 28, color: "#E2D243" }}
        >
          {title}
        </h3>
        <p
          className="font-inter"
          style={{ fontSize: 20, color: "rgba(255, 255, 255, 0.7)" }}
        >
          {description}
        </p>
      </div>

      {/* Accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: "#E2D243" }}
      />
    </div>
  );
};

export const FeatureShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    {
      title: "AI-Powered Code Review",
      description:
        "Mason analyzes your codebase and identifies improvements you'd never think to look for.",
      icon: "🔍",
    },
    {
      title: "Automatic PRDs",
      description:
        "Every improvement gets a detailed spec so you know exactly what's being changed.",
      icon: "📋",
    },
    {
      title: "One-Click Execution",
      description:
        "Approve changes in the dashboard, Mason implements them with full test coverage.",
      icon: "⚡",
    },
    {
      title: "Continuous Loop",
      description:
        "Set it on autopilot. Mason keeps improving while you focus on what matters.",
      icon: "🔄",
    },
  ];

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [-30, 0], {
    extrapolateRight: "clamp",
  });

  // Background pulse
  const bgPulse = interpolate(
    frame % 90,
    [0, 45, 90],
    [0.02, 0.05, 0.02],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, rgba(226, 210, 67, ${bgPulse}) 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 50%, rgba(226, 210, 67, ${bgPulse}) 0%, transparent 50%)`,
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(226, 210, 67, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 210, 67, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px",
        }}
      />

      <div className="w-full max-w-6xl px-12">
        {/* Title */}
        <div
          className="text-center mb-16"
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <h2
            className="font-inter font-bold"
            style={{ fontSize: 56, color: "#FFFFFF" }}
          >
            Built for{" "}
            <span style={{ color: "#E2D243" }}>Modern Developers</span>
          </h2>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              index={index}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
