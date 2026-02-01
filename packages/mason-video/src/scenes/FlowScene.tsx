import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/**
 * Scene 3: Flow (9-15s)
 * ITERATION 2: Cleaner, more minimal, faster
 */
export const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { word: 'Scan', color: '#60A5FA' },
    { word: 'Approve', color: '#E2D243' },
    { word: 'Ship', color: '#34D399' },
  ];

  const stepDelay = 20; // Faster sequencing

  // Arrow animations
  const arrow1Progress = interpolate(
    frame,
    [stepDelay + 10, stepDelay + 22],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const arrow2Progress = interpolate(
    frame,
    [stepDelay * 2 + 10, stepDelay * 2 + 22],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // "Forever." reveal - EARLIER so it's visible before scene ends
  const foreverOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const foreverScale = interpolate(frame, [85, 105], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle rotation for infinity feel
  const infinityRotate = interpolate(frame, [130, 180], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Subtle radial background */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 500,
          background:
            'radial-gradient(ellipse, rgba(226, 210, 67, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Title - minimal */}
      <div
        className="absolute"
        style={{
          top: 140,
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          className="font-inter"
          style={{ fontSize: 22, color: 'rgba(255, 255, 255, 0.4)' }}
        >
          How it works
        </span>
      </div>

      {/* Steps container - horizontal layout, minimal */}
      <div className="flex items-center gap-6">
        {steps.map((step, index) => {
          const stepSpring = spring({
            frame: frame - index * stepDelay - 8,
            fps,
            config: { damping: 14, stiffness: 120 },
          });

          const stepScale = interpolate(stepSpring, [0, 1], [0.7, 1]);
          const stepOpacity = interpolate(stepSpring, [0, 1], [0, 1]);

          // Active pulse timing
          const isActive =
            frame > index * stepDelay + 15 && frame < index * stepDelay + 50;
          const pulseGlow = isActive
            ? interpolate(
                (frame - index * stepDelay) % 20,
                [0, 10, 20],
                [20, 40, 20],
              )
            : 0;

          return (
            <React.Fragment key={index}>
              {/* Step word */}
              <div
                className="flex flex-col items-center"
                style={{
                  transform: `scale(${stepScale})`,
                  opacity: stepOpacity,
                }}
              >
                <span
                  className="font-inter font-bold"
                  style={{
                    fontSize: 56,
                    color: step.color,
                    textShadow: `0 0 ${pulseGlow}px ${step.color}`,
                    transition: 'text-shadow 0.15s ease',
                  }}
                >
                  {step.word}
                </span>
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <div
                  className="flex items-center mx-4"
                  style={{
                    opacity: index === 0 ? arrow1Progress : arrow2Progress,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 2,
                      background: `linear-gradient(90deg, ${steps[index].color}, ${steps[index + 1].color})`,
                      transform: `scaleX(${index === 0 ? arrow1Progress : arrow2Progress})`,
                      transformOrigin: 'left',
                    }}
                  />
                  <span
                    style={{
                      color: steps[index + 1].color,
                      fontSize: 28,
                      marginLeft: 4,
                    }}
                  >
                    →
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* "Repeat forever." with infinity symbol */}
      <div
        className="absolute flex items-center gap-4"
        style={{
          bottom: 160,
          opacity: foreverOpacity,
          transform: `scale(${foreverScale})`,
        }}
      >
        <span
          style={{
            fontSize: 32,
            color: '#E2D243',
            transform: `rotate(${infinityRotate}deg)`,
            display: 'inline-block',
          }}
        >
          ∞
        </span>
        <span
          className="font-inter font-semibold"
          style={{ fontSize: 28, color: 'rgba(255, 255, 255, 0.7)' }}
        >
          Repeat forever.
        </span>
      </div>
    </AbsoluteFill>
  );
};
