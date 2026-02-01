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
 * V3: Big bold steps with connected animated pipeline, no tiny elements
 */
export const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Step 1: SCAN
  const scanSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const scanScale = interpolate(scanSpring, [0, 1], [0.5, 1]);
  const scanOpacity = interpolate(scanSpring, [0, 1], [0, 1]);
  const scanActive = frame >= 15 && frame < 50;
  const scanDone = frame >= 50;

  // Flow line 1: SCAN to APPROVE
  const flow1Progress = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Step 2: APPROVE
  const approveSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const approveScale = interpolate(approveSpring, [0, 1], [0.5, 1]);
  const approveOpacity = interpolate(approveSpring, [0, 1], [0, 1]);
  const approveActive = frame >= 55 && frame < 90;
  const approveDone = frame >= 90;

  // Flow line 2: APPROVE to SHIP
  const flow2Progress = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Step 3: SHIP
  const shipSpring = spring({
    frame: frame - 90,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const shipScale = interpolate(shipSpring, [0, 1], [0.5, 1]);
  const shipOpacity = interpolate(shipSpring, [0, 1], [0, 1]);
  const shipActive = frame >= 95 && frame < 130;
  const shipDone = frame >= 130;

  // Big checkmark celebration
  const checkSpring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 8, stiffness: 100 },
  });
  const checkScale = interpolate(checkSpring, [0, 1], [0, 1.2]);
  const checkOpacity = interpolate(checkSpring, [0, 1], [0, 1]);

  // "Repeat forever" text
  const repeatOpacity = interpolate(frame, [145, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const infinityRotate = interpolate(frame, [145, 180], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background glow
  const bgGlow = interpolate(frame, [0, 100], [0.03, 0.2], {
    extrapolateRight: 'clamp',
  });

  const getStepStyle = (isActive: boolean, isDone: boolean, color: string) => ({
    backgroundColor: isDone
      ? color
      : isActive
        ? `${color}20`
        : 'rgba(255, 255, 255, 0.05)',
    borderColor: isActive || isDone ? color : 'rgba(255, 255, 255, 0.2)',
    boxShadow: isActive
      ? `0 0 60px ${color}60`
      : isDone
        ? `0 0 40px ${color}40`
        : 'none',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute"
        style={{
          width: 1600,
          height: 900,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 70%)`,
        }}
      />

      {/* Title - BIG */}
      <div
        className="absolute"
        style={{
          top: 80,
          opacity: titleOpacity,
        }}
      >
        <span
          className="font-inter font-bold"
          style={{ fontSize: 56, color: 'rgba(255, 255, 255, 0.8)' }}
        >
          How Mason Works
        </span>
      </div>

      {/* Flow container - large steps */}
      <div className="flex items-center gap-6">
        {/* SCAN */}
        <div
          className="flex flex-col items-center"
          style={{
            transform: `scale(${scanScale})`,
            opacity: scanOpacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-3xl border-4"
            style={{
              width: 220,
              height: 140,
              ...getStepStyle(scanActive, scanDone, '#60A5FA'),
              transition: 'all 0.3s ease',
            }}
          >
            {scanDone ? (
              <span style={{ fontSize: 64, color: '#0A0724' }}>✓</span>
            ) : (
              <span
                className="font-inter font-black"
                style={{
                  fontSize: 52,
                  color: scanActive ? '#60A5FA' : 'rgba(255, 255, 255, 0.5)',
                }}
              >
                SCAN
              </span>
            )}
          </div>
          <span
            className="mt-4 font-inter font-medium"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Find improvements
          </span>
        </div>

        {/* Flow line 1 */}
        <div style={{ width: 120, height: 8, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: `${flow1Progress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #60A5FA, #E2D243)',
              borderRadius: 4,
              boxShadow: flow1Progress > 0 ? '0 0 20px #E2D243' : 'none',
            }}
          />
          {flow1Progress > 0 && flow1Progress < 1 && (
            <div
              style={{
                position: 'absolute',
                left: `${flow1Progress * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#E2D243',
                boxShadow: '0 0 25px #E2D243',
              }}
            />
          )}
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
            className="flex items-center justify-center rounded-3xl border-4"
            style={{
              width: 260,
              height: 140,
              ...getStepStyle(approveActive, approveDone, '#E2D243'),
              transition: 'all 0.3s ease',
            }}
          >
            {approveDone ? (
              <span style={{ fontSize: 64, color: '#0A0724' }}>✓</span>
            ) : (
              <span
                className="font-inter font-black"
                style={{
                  fontSize: 48,
                  color: approveActive ? '#E2D243' : 'rgba(255, 255, 255, 0.5)',
                }}
              >
                APPROVE
              </span>
            )}
          </div>
          <span
            className="mt-4 font-inter font-medium"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            One click
          </span>
        </div>

        {/* Flow line 2 */}
        <div style={{ width: 120, height: 8, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: `${flow2Progress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #E2D243, #34D399)',
              borderRadius: 4,
              boxShadow: flow2Progress > 0 ? '0 0 20px #34D399' : 'none',
            }}
          />
          {flow2Progress > 0 && flow2Progress < 1 && (
            <div
              style={{
                position: 'absolute',
                left: `${flow2Progress * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#34D399',
                boxShadow: '0 0 25px #34D399',
              }}
            />
          )}
        </div>

        {/* SHIP */}
        <div
          className="flex flex-col items-center"
          style={{
            transform: `scale(${shipScale})`,
            opacity: shipOpacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-3xl border-4"
            style={{
              width: 200,
              height: 140,
              ...getStepStyle(shipActive, shipDone, '#34D399'),
              transition: 'all 0.3s ease',
            }}
          >
            {shipDone ? (
              <span style={{ fontSize: 64, color: '#0A0724' }}>✓</span>
            ) : (
              <span
                className="font-inter font-black"
                style={{
                  fontSize: 52,
                  color: shipActive ? '#34D399' : 'rgba(255, 255, 255, 0.5)',
                }}
              >
                SHIP
              </span>
            )}
          </div>
          <span
            className="mt-4 font-inter font-medium"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Auto-merged
          </span>
        </div>
      </div>

      {/* Big celebration checkmark */}
      <div
        className="absolute"
        style={{
          bottom: 180,
          opacity: checkOpacity,
          transform: `scale(${checkScale})`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 100,
            height: 100,
            backgroundColor: '#34D399',
            boxShadow: '0 0 60px rgba(52, 211, 153, 0.6)',
          }}
        >
          <span style={{ fontSize: 56, color: '#0A0724' }}>✓</span>
        </div>
      </div>

      {/* "Repeat forever" */}
      <div
        className="absolute flex items-center gap-5"
        style={{
          bottom: 60,
          opacity: repeatOpacity,
        }}
      >
        <span
          style={{
            fontSize: 52,
            color: '#E2D243',
            transform: `rotate(${infinityRotate}deg)`,
            display: 'inline-block',
          }}
        >
          ∞
        </span>
        <span
          className="font-inter font-bold"
          style={{ fontSize: 44, color: 'rgba(255, 255, 255, 0.85)' }}
        >
          Repeat forever.
        </span>
      </div>
    </AbsoluteFill>
  );
};
