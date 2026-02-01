import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { label: "Analyze", icon: "🔬", color: "#60A5FA" },
    { label: "Suggest", icon: "💡", color: "#34D399" },
    { label: "Approve", icon: "✓", color: "#E2D243" },
    { label: "Execute", icon: "🚀", color: "#F472B6" },
    { label: "Repeat", icon: "∞", color: "#A78BFA" },
  ];

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Circular progress animation
  const circleProgress = interpolate(frame, [30, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Center rotation
  const rotation = interpolate(frame, [0, 240], [0, 360], {
    extrapolateRight: "clamp",
  });

  // Active step indicator
  const activeStep = Math.floor(circleProgress * 5) % 5;

  // Orbiting particles
  const orbitParticles = Array.from({ length: 12 }, (_, i) => {
    const baseAngle = (i / 12) * Math.PI * 2;
    const angle = baseAngle + (frame / 60) * Math.PI;
    const radius = 320;
    const particleOpacity = interpolate(
      Math.sin(angle + frame / 30),
      [-1, 1],
      [0.2, 0.8]
    );

    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      opacity: particleOpacity,
    };
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute"
        style={{
          width: 1000,
          height: 1000,
          background: `radial-gradient(circle, rgba(226, 210, 67, 0.1) 0%, transparent 60%)`,
        }}
      />

      {/* Title */}
      <div
        className="absolute"
        style={{
          top: 80,
          opacity: titleOpacity,
        }}
      >
        <h2
          className="font-inter font-bold text-center"
          style={{ fontSize: 56, color: "#FFFFFF" }}
        >
          The <span style={{ color: "#E2D243" }}>Improvement Loop</span>
        </h2>
      </div>

      {/* Orbiting particles */}
      {orbitParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: "#E2D243",
            left: "50%",
            top: "50%",
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
            boxShadow: "0 0 10px #E2D243",
          }}
        />
      ))}

      {/* Circle of steps */}
      <div
        className="relative"
        style={{ width: 640, height: 640 }}
      >
        {/* Connecting circle path */}
        <svg
          className="absolute inset-0"
          viewBox="0 0 640 640"
          style={{ transform: `rotate(${rotation * 0.1}deg)` }}
        >
          {/* Background circle */}
          <circle
            cx="320"
            cy="320"
            r="260"
            fill="none"
            stroke="rgba(226, 210, 67, 0.1)"
            strokeWidth="3"
          />
          {/* Animated progress circle */}
          <circle
            cx="320"
            cy="320"
            r="260"
            fill="none"
            stroke="#E2D243"
            strokeWidth="3"
            strokeDasharray={`${circleProgress * 1634} 1634`}
            strokeDashoffset="0"
            transform="rotate(-90 320 320)"
            style={{
              filter: "drop-shadow(0 0 10px rgba(226, 210, 67, 0.5))",
            }}
          />
        </svg>

        {/* Step nodes */}
        {steps.map((step, index) => {
          const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
          const radius = 260;
          const x = Math.cos(angle) * radius + 320;
          const y = Math.sin(angle) * radius + 320;

          const stepSpring = spring({
            frame: frame - 30 - index * 20,
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          const nodeScale = interpolate(stepSpring, [0, 1], [0, 1]);
          const nodeOpacity = interpolate(stepSpring, [0, 1], [0, 1]);

          const isActive = index === activeStep;
          const activeScale = isActive ? 1.2 : 1;
          const activeGlow = isActive ? 30 : 0;

          return (
            <div
              key={index}
              className="absolute flex flex-col items-center"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${nodeScale * activeScale})`,
                opacity: nodeOpacity,
              }}
            >
              {/* Node circle */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isActive
                    ? step.color
                    : "rgba(255, 255, 255, 0.1)",
                  border: `3px solid ${step.color}`,
                  boxShadow: `0 0 ${activeGlow}px ${step.color}`,
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ fontSize: 40 }}>{step.icon}</span>
              </div>
              {/* Label */}
              <p
                className="font-inter font-semibold mt-3"
                style={{
                  fontSize: 20,
                  color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                }}
              >
                {step.label}
              </p>
            </div>
          );
        })}

        {/* Center logo */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(226, 210, 67, 0.2) 0%, rgba(10, 7, 36, 0.8) 100%)",
              border: "2px solid rgba(226, 210, 67, 0.4)",
              boxShadow: "0 0 40px rgba(226, 210, 67, 0.2)",
            }}
          >
            <span
              className="font-inter font-black"
              style={{ fontSize: 48, color: "#E2D243" }}
            >
              M
            </span>
          </div>
        </div>
      </div>

      {/* Bottom caption */}
      <div
        className="absolute"
        style={{
          bottom: 80,
          opacity: interpolate(frame, [150, 180], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <p
          className="font-inter text-center"
          style={{ fontSize: 24, color: "rgba(255, 255, 255, 0.7)" }}
        >
          Set it up once. Improvements never stop.
        </p>
      </div>
    </AbsoluteFill>
  );
};
