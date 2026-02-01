import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

/**
 * Scene 2: CLI Magic (5-12s)
 *
 * ROUND 1 IMPROVEMENTS:
 * - FASTER typing animation
 * - BIGGER text (2x scale)
 * - More dynamic scanning effect
 * - Dramatic results reveal
 */
export const CLIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Terminal entrance - POWER UP effect
  const terminalSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 10, stiffness: 120 },
  });
  const terminalScale = interpolate(terminalSpring, [0, 0.5, 1], [0.7, 1.05, 1]);
  const terminalOpacity = interpolate(terminalSpring, [0, 1], [0, 1]);
  const terminalGlow = interpolate(frame, [3, 15, 30], [0, 0.8, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Command typing animation - FASTER
  const command = '/pm-review';
  const typedChars = Math.min(
    Math.floor(
      interpolate(frame, [15, 40], [0, command.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    ),
    command.length,
  );
  const typedCommand = command.slice(0, typedChars);
  const showCursor = frame < 45 && Math.floor(frame / 6) % 2 === 0;

  // Enter key press effect - FASTER
  const enterPressed = frame >= 45;
  const enterFlash = interpolate(frame, [45, 52], [0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scanning animation (50-95) - EVEN FASTER, 45 frames
  const scanningActive = frame >= 50 && frame < 95;
  const scanProgress = interpolate(frame, [50, 92], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0, 0.4, 1), // slow start, fast finish
  });

  // Scan line sweep - FASTER, 3 sweeps
  const scanLineY = interpolate(
    frame,
    [50, 60, 70, 80, 90],
    [0, 100, 0, 100, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Scan complete flash
  const scanCompleteFlash = interpolate(frame, [92, 95, 100], [0, 0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Files being scanned (rapidly changing) - FASTER
  const files = [
    'src/api/auth.ts',
    'src/components/Dashboard.tsx',
    'src/lib/database.ts',
    'src/utils/helpers.ts',
    'src/services/payment.ts',
    'src/hooks/useUser.ts',
    'src/api/orders.ts',
    'src/components/Cart.tsx',
  ];
  const currentFileIndex = Math.floor((frame - 50) / 2) % files.length;

  // Results appearing (100+) - EARLIER
  const resultsPhase = frame >= 100;

  const improvements = [
    { text: 'Add error handling to auth flow', type: 'enhancement', delay: 0 },
    { text: 'Optimize database queries', type: 'performance', delay: 8 },
    { text: 'Add input validation', type: 'security', delay: 16 },
    { text: 'Fix potential memory leak', type: 'bug', delay: 24 },
    { text: 'Add retry logic for API calls', type: 'enhancement', delay: 32 },
  ];

  // Counter animation - FASTER, with chunk jumps
  const issuesFound = Math.floor(
    interpolate(frame, [100, 125], [0, 23], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Background particles
  const particles = Array.from({ length: 30 }, (_, i) => {
    const speed = 0.3 + (i % 5) * 0.15;
    const xPos = (i * 73.7) % 100;
    const yPos = ((frame * speed + i * 40) % 120) - 10;
    return {
      id: i,
      x: xPos,
      y: yPos,
      opacity: interpolate(yPos, [-10, 20, 90, 110], [0, 0.5, 0.5, 0]),
      size: 2 + (i % 3),
    };
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(226, 210, 67, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 210, 67, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

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

      {/* Terminal window - POWER UP GLOW */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: 1100,
          height: 620,
          backgroundColor: 'rgba(13, 17, 23, 0.98)',
          border: '2px solid rgba(226, 210, 67, 0.4)',
          boxShadow: `
            0 0 ${80 + terminalGlow * 60}px rgba(226, 210, 67, ${0.2 + terminalGlow * 0.3}),
            0 0 ${40 + terminalGlow * 40}px rgba(52, 211, 153, ${terminalGlow * 0.2}),
            0 25px 80px rgba(0, 0, 0, 0.6)
          `,
          transform: `scale(${terminalScale})`,
          opacity: terminalOpacity,
        }}
      >
        {/* Terminal header */}
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ backgroundColor: 'rgba(30, 30, 30, 0.95)' }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56]" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E]" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#27CA40]" />
          <span className="ml-4 font-mono text-sm text-gray-400">
            mason-cli — ~/my-project
          </span>
          <div className="flex-1" />
          <div
            className="px-3 py-1 rounded text-xs font-mono"
            style={{
              color: '#E2D243',
              backgroundColor: 'rgba(226, 210, 67, 0.15)',
            }}
          >
            MASON v2.1
          </div>
        </div>

        {/* Terminal content - BIGGER FONTS */}
        <div className="p-8 font-mono" style={{ fontSize: 28 }}>
          {/* Prompt and command */}
          <div className="flex items-center gap-3">
            <span style={{ color: '#34D399', fontSize: 32 }}>$</span>
            <span style={{ color: '#E2D243', fontSize: 36, fontWeight: 700 }}>
              {typedCommand}
            </span>
            {showCursor && (
              <span
                style={{
                  width: 14,
                  height: 36,
                  backgroundColor: '#E2D243',
                  display: 'inline-block',
                  boxShadow: '0 0 15px #E2D243',
                }}
              />
            )}
          </div>

          {/* After enter press */}
          {enterPressed && (
            <div className="mt-4">
              {/* Scanning status */}
              {scanningActive && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{
                        backgroundColor: '#E2D243',
                        boxShadow: '0 0 15px #E2D243',
                      }}
                    />
                    <span style={{ color: '#E2D243' }}>
                      Scanning codebase...
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-2 rounded-full overflow-hidden mb-3"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scanProgress}%`,
                        background: 'linear-gradient(90deg, #E2D243, #34D399)',
                        boxShadow: '0 0 20px #E2D243',
                      }}
                    />
                  </div>

                  {/* Current file */}
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Analyzing:
                    </span>
                    <span style={{ color: '#60A5FA' }}>
                      {files[currentFileIndex]}
                    </span>
                  </div>
                </>
              )}

              {/* Results - BIGGER, MORE DRAMATIC */}
              {resultsPhase && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <span
                      style={{
                        color: '#34D399',
                        fontSize: 36,
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        color: '#34D399',
                        fontSize: 28,
                        fontWeight: 600,
                      }}
                    >
                      Scan complete!
                    </span>
                    <div
                      className="ml-6 px-6 py-2 rounded-full"
                      style={{
                        backgroundColor: 'rgba(226, 210, 67, 0.25)',
                        border: '2px solid #E2D243',
                        boxShadow: '0 0 20px rgba(226, 210, 67, 0.3)',
                      }}
                    >
                      <span
                        className="font-black"
                        style={{ color: '#E2D243', fontSize: 32 }}
                      >
                        {issuesFound}
                      </span>
                      <span
                        className="ml-3 font-medium"
                        style={{
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontSize: 24,
                        }}
                      >
                        improvements found
                      </span>
                    </div>
                  </div>

                  {/* Improvement list - BIGGER, FASTER */}
                  <div className="space-y-3 mt-5">
                    {improvements.map((imp, i) => {
                      const itemSpring = spring({
                        frame: frame - 105 - imp.delay * 0.7,
                        fps,
                        config: { damping: 8, stiffness: 160 },
                      });
                      const itemX = interpolate(itemSpring, [0, 1], [-80, 0]);
                      const itemOpacity = interpolate(
                        itemSpring,
                        [0, 1],
                        [0, 1],
                      );

                      const typeColors: Record<string, string> = {
                        enhancement: '#60A5FA',
                        performance: '#34D399',
                        security: '#FBBF24',
                        bug: '#F87171',
                      };

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-4"
                          style={{
                            opacity: itemOpacity,
                            transform: `translateX(${itemX}px)`,
                          }}
                        >
                          <span
                            style={{
                              color: typeColors[imp.type],
                              fontSize: 20,
                            }}
                          >
                            ●
                          </span>
                          <span
                            className="px-3 py-1 rounded text-sm uppercase font-bold"
                            style={{
                              backgroundColor: `${typeColors[imp.type]}25`,
                              color: typeColors[imp.type],
                              fontSize: 16,
                            }}
                          >
                            {imp.type}
                          </span>
                          <span
                            style={{
                              color: 'rgba(255, 255, 255, 0.95)',
                              fontSize: 22,
                            }}
                          >
                            {imp.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Scan line effect */}
        {scanningActive && (
          <div
            className="absolute left-0 right-0 h-0.5"
            style={{
              top: `${12 + scanLineY * 0.8}%`,
              background:
                'linear-gradient(90deg, transparent 5%, #E2D243 50%, transparent 95%)',
              boxShadow: '0 0 15px #E2D243',
            }}
          />
        )}

        {/* Enter key flash */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#E2D243',
            opacity: enterFlash,
            pointerEvents: 'none',
          }}
        />

        {/* Scan complete flash */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#34D399',
            opacity: scanCompleteFlash,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* "Just one command" text - BIGGER */}
      <div
        className="absolute"
        style={{
          bottom: 70,
          opacity: interpolate(frame, [8, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          className="font-inter font-bold"
          style={{
            fontSize: 48,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          One command.{' '}
          <span
            style={{
              color: '#E2D243',
              textShadow: '0 0 30px rgba(226, 210, 67, 0.5)',
            }}
          >
            Instant insights.
          </span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
