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
 * Scene 3: Flow (9-15s)
 * ITERATION 3: Connected flow with animations, dashboard preview, larger text
 */
export const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepDelay = 25;

  // Step 1: SCAN - appears first
  const scanSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const scanScale = interpolate(scanSpring, [0, 1], [0.6, 1]);
  const scanOpacity = interpolate(scanSpring, [0, 1], [0, 1]);

  // Flow line 1: SCAN to APPROVE
  const flow1Start = 25;
  const flow1Progress = interpolate(
    frame,
    [flow1Start, flow1Start + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Step 2: APPROVE - appears after flow line
  const approveSpring = spring({
    frame: frame - flow1Start - 15,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const approveScale = interpolate(approveSpring, [0, 1], [0.6, 1]);
  const approveOpacity = interpolate(approveSpring, [0, 1], [0, 1]);

  // Flow line 2: APPROVE to SHIP
  const flow2Start = 55;
  const flow2Progress = interpolate(
    frame,
    [flow2Start, flow2Start + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Step 3: SHIP - appears after second flow line
  const shipSpring = spring({
    frame: frame - flow2Start - 15,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const shipScale = interpolate(shipSpring, [0, 1], [0.6, 1]);
  const shipOpacity = interpolate(shipSpring, [0, 1], [0, 1]);

  // Checkmark animation after SHIP
  const checkmarkSpring = spring({
    frame: frame - 90,
    fps,
    config: { damping: 8, stiffness: 120 },
  });
  const checkmarkScale = interpolate(checkmarkSpring, [0, 1], [0, 1.2]);
  const checkmarkOpacity = interpolate(checkmarkSpring, [0, 1], [0, 1]);

  // "DONE" burst effect
  const doneBurst = interpolate(frame, [95, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dashboard preview - slides up from bottom
  const dashboardOpacity = interpolate(frame, [110, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dashboardY = interpolate(frame, [110, 135], [60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Active glow effects
  const scanGlow = frame > 10 && frame < 40 ? 40 : 0;
  const approveGlow = frame > 45 && frame < 70 ? 40 : 0;
  const shipGlow = frame > 75 && frame < 100 ? 40 : 0;

  // Background glow intensifies
  const bgGlow = interpolate(frame, [0, 100], [0.02, 0.15], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Subtle radial background */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 700,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 70%)`,
        }}
      />

      {/* Title - larger */}
      <div
        className="absolute"
        style={{
          top: 80,
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          className="font-inter font-medium"
          style={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.6)' }}
        >
          How it works
        </span>
      </div>

      {/* Flow container - positioned in upper-middle area */}
      <div
        className="absolute flex items-center gap-4"
        style={{ top: '35%', transform: 'translateY(-50%)' }}
      >
        {/* SCAN */}
        <div
          className="flex flex-col items-center"
          style={{
            transform: `scale(${scanScale})`,
            opacity: scanOpacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 160,
              height: 100,
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              border: '3px solid #60A5FA',
              boxShadow: `0 0 ${scanGlow}px #60A5FA`,
            }}
          >
            <span
              className="font-inter font-bold"
              style={{ fontSize: 42, color: '#60A5FA' }}
            >
              Scan
            </span>
          </div>
          <span
            className="mt-3 font-inter"
            style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Find improvements
          </span>
        </div>

        {/* Flow line 1 - animated */}
        <div className="flex items-center" style={{ width: 100 }}>
          <div
            style={{
              width: `${flow1Progress * 70}px`,
              height: 4,
              background: 'linear-gradient(90deg, #60A5FA, #E2D243)',
              borderRadius: 2,
              boxShadow:
                flow1Progress > 0.5
                  ? '0 0 15px rgba(226, 210, 67, 0.5)'
                  : 'none',
            }}
          />
          <div
            style={{
              opacity: flow1Progress > 0.8 ? 1 : 0,
              transform: `translateX(${flow1Progress > 0.8 ? 0 : -10}px)`,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 32, color: '#E2D243' }}>→</span>
          </div>
        </div>

        {/* APPROVE */}
        <div
          className="flex flex-col items-center"
          style={{
            transform: `scale(${approveScale})`,
            opacity: approveOpacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 180,
              height: 100,
              backgroundColor: 'rgba(226, 210, 67, 0.15)',
              border: '3px solid #E2D243',
              boxShadow: `0 0 ${approveGlow}px #E2D243`,
            }}
          >
            <span
              className="font-inter font-bold"
              style={{ fontSize: 42, color: '#E2D243' }}
            >
              Approve
            </span>
          </div>
          <span
            className="mt-3 font-inter"
            style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            One click
          </span>
        </div>

        {/* Flow line 2 - animated */}
        <div className="flex items-center" style={{ width: 100 }}>
          <div
            style={{
              width: `${flow2Progress * 70}px`,
              height: 4,
              background: 'linear-gradient(90deg, #E2D243, #34D399)',
              borderRadius: 2,
              boxShadow:
                flow2Progress > 0.5
                  ? '0 0 15px rgba(52, 211, 153, 0.5)'
                  : 'none',
            }}
          />
          <div
            style={{
              opacity: flow2Progress > 0.8 ? 1 : 0,
              transform: `translateX(${flow2Progress > 0.8 ? 0 : -10}px)`,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 32, color: '#34D399' }}>→</span>
          </div>
        </div>

        {/* SHIP */}
        <div
          className="flex flex-col items-center relative"
          style={{
            transform: `scale(${shipScale})`,
            opacity: shipOpacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-2xl relative"
            style={{
              width: 160,
              height: 100,
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              border: '3px solid #34D399',
              boxShadow: `0 0 ${shipGlow}px #34D399`,
            }}
          >
            <span
              className="font-inter font-bold"
              style={{ fontSize: 42, color: '#34D399' }}
            >
              Ship
            </span>

            {/* Checkmark overlay */}
            <div
              className="absolute -top-3 -right-3 flex items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                backgroundColor: '#34D399',
                transform: `scale(${checkmarkScale})`,
                opacity: checkmarkOpacity,
                boxShadow: '0 0 20px #34D399',
              }}
            >
              <span style={{ fontSize: 24, color: '#0A0724' }}>✓</span>
            </div>
          </div>
          <span
            className="mt-3 font-inter"
            style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Auto-merged
          </span>
        </div>
      </div>

      {/* "DONE" celebration text */}
      <div
        className="absolute"
        style={{
          top: '55%',
          opacity: doneBurst,
          transform: `scale(${0.8 + doneBurst * 0.2})`,
        }}
      >
        <span
          className="font-inter font-black"
          style={{
            fontSize: 56,
            color: '#34D399',
            textShadow: `0 0 ${40 * doneBurst}px rgba(52, 211, 153, 0.8)`,
          }}
        >
          SHIPPED!
        </span>
      </div>

      {/* Dashboard preview - bottom */}
      <div
        className="absolute"
        style={{
          bottom: 30,
          opacity: dashboardOpacity,
          transform: `translateY(${dashboardY}px)`,
        }}
      >
        <div className="relative">
          {/* Glow behind dashboard */}
          <div
            className="absolute -inset-3 rounded-xl blur-lg"
            style={{ backgroundColor: 'rgba(226, 210, 67, 0.2)' }}
          />
          {/* Dashboard screenshot */}
          <div
            className="relative overflow-hidden rounded-lg border-2"
            style={{
              width: 550,
              height: 110,
              borderColor: 'rgba(226, 210, 67, 0.4)',
            }}
          >
            <Img
              src={staticFile('screenshots/02-backlog-improvements.png')}
              style={{
                width: 550,
                height: 'auto',
                objectFit: 'cover',
                objectPosition: 'top center',
              }}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 50%, rgba(10, 7, 36, 0.95) 100%)',
              }}
            />
          </div>
          {/* Label */}
          <div
            className="absolute -bottom-1 left-0 right-0 text-center"
            style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Your backlog, always improving
          </div>
        </div>
      </div>

      {/* Repeat indicator */}
      <div
        className="absolute"
        style={{
          top: 80,
          right: 60,
          opacity: interpolate(frame, [120, 140], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span className="font-inter" style={{ fontSize: 24, color: '#E2D243' }}>
          ∞ Repeat forever
        </span>
      </div>
    </AbsoluteFill>
  );
};
