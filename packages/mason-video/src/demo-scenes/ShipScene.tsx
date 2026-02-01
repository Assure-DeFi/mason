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
 * Scene 4: Ship It (20-26s) - 180 frames
 *
 * ROUND 1 IMPROVEMENTS:
 * - SHIPPED celebration at frame 100 (not 130)
 * - Faster counter animations
 * - More speed lines, more energy
 * - Bigger celebration explosion
 */
export const ShipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Speed lines shooting across
  const speedLines = Array.from({ length: 40 }, (_, i) => {
    const yPos = (i / 40) * 100;
    const speed = 2 + (i % 5) * 0.8;
    const length = 100 + (i % 4) * 150;
    const delay = (i % 8) * 3;
    const xProgress = ((frame - delay) * speed) % (1920 + length);

    return {
      id: i,
      y: yPos,
      x: xProgress - length,
      length,
      opacity: interpolate(
        xProgress,
        [0, 200, 1920 - 200, 1920],
        [0, 0.8, 0.8, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      ),
      color: i % 3 === 0 ? '#E2D243' : i % 3 === 1 ? '#34D399' : '#60A5FA',
    };
  });

  // Flying commits
  const commits = [
    { message: 'fix: error handling', delay: 10 },
    { message: 'perf: optimize queries', delay: 25 },
    { message: 'feat: add validation', delay: 40 },
    { message: 'fix: memory leak', delay: 55 },
    { message: 'feat: retry logic', delay: 70 },
    { message: 'chore: cleanup', delay: 85 },
    { message: 'docs: update README', delay: 100 },
    { message: 'test: add coverage', delay: 115 },
  ];

  // Counter animations - CHUNKED for impact
  const filesFixedRaw = interpolate(frame, [8, 50], [0, 23], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const filesFixed = Math.floor(filesFixedRaw);

  const hoursSavedRaw = interpolate(frame, [12, 55], [0, 47], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hoursSaved = Math.floor(hoursSavedRaw);

  const linesChangedRaw = interpolate(frame, [16, 60], [0, 2847], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const linesChanged = Math.floor(linesChangedRaw);

  // Counter glow pulses on update
  const counterGlow = Math.sin(frame * 0.4) * 0.2 + 0.8;

  // Central "SHIPPED" explosion - AT FRAME 70
  const shippedPhase = frame >= 70;
  const shippedSpring = spring({
    frame: frame - 70,
    fps,
    config: { damping: 4, stiffness: 70 },
  });
  const shippedScale = interpolate(shippedSpring, [0, 1], [0.2, 1]);
  const shippedOpacity = interpolate(shippedSpring, [0, 0.5, 1], [0, 0.8, 1]);

  // Confetti particles - MORE, FASTER, earlier timing
  const confetti = shippedPhase
    ? Array.from({ length: 100 }, (_, i) => {
        const angle = (i / 100) * Math.PI * 2 + (i % 4) * 0.2;
        const speed = 5 + (i % 7) * 2.5;
        const distance = (frame - 70) * speed;
        const rotation = (frame - 70) * (15 + (i % 6) * 5);
        const colors = [
          '#E2D243',
          '#34D399',
          '#60A5FA',
          '#F87171',
          '#A78BFA',
          '#FFFFFF',
        ];

        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance + (frame - 70) * 0.3 * (i % 4),
          rotation,
          color: colors[i % colors.length],
          opacity: interpolate(frame - 70, [0, 6, 60, 100], [0, 1, 0.85, 0], {
            extrapolateRight: 'clamp',
          }),
          size: 10 + (i % 6) * 5,
        };
      })
    : [];

  // Background pulse - MORE DRAMATIC, earlier peak
  const bgGlow = interpolate(frame, [0, 30, 70, 100], [0.15, 0.35, 0.35, 0.65], {
    extrapolateRight: 'clamp',
  });

  // Rocket icon flying up - FASTER
  const rocketY = interpolate(frame, [0, 50], [400, -500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const rocketOpacity = interpolate(frame, [0, 6, 45, 55], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Speed lines */}
      {speedLines.map((line) => (
        <div
          key={line.id}
          className="absolute"
          style={{
            left: line.x,
            top: `${line.y}%`,
            width: line.length,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${line.color})`,
            opacity: line.opacity,
          }}
        />
      ))}

      {/* Central glow */}
      <div
        className="absolute"
        style={{
          width: 1200,
          height: 800,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 60%)`,
        }}
      />

      {/* Flying commits */}
      {commits.map((commit, i) => {
        const commitProgress = (frame - commit.delay) / 40;
        const commitX = interpolate(commitProgress, [0, 1], [-400, 2200], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const commitOpacity = interpolate(
          commitProgress,
          [0, 0.1, 0.8, 1],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const commitY = 200 + (i % 4) * 180;

        return (
          <div
            key={i}
            className="absolute flex items-center gap-3 px-4 py-2 rounded-lg"
            style={{
              left: commitX,
              top: commitY,
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.5)',
              opacity: commitOpacity,
            }}
          >
            <span style={{ color: '#34D399', fontSize: 20 }}>✓</span>
            <span
              className="font-mono"
              style={{ color: '#34D399', fontSize: 18 }}
            >
              {commit.message}
            </span>
          </div>
        );
      })}

      {/* Rocket */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, ${rocketY}px)`,
          opacity: rocketOpacity,
          fontSize: 80,
        }}
      >
        🚀
      </div>

      {/* Stats counters */}
      <div
        className="absolute flex gap-16"
        style={{
          top: 120,
          opacity: interpolate(frame, [15, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {/* Files Fixed */}
        <div className="flex flex-col items-center">
          <span
            className="font-inter font-black tabular-nums"
            style={{
              fontSize: 90,
              color: '#34D399',
              textShadow: `0 0 ${40 * counterGlow}px rgba(52, 211, 153, 0.6)`,
            }}
          >
            {filesFixed}
          </span>
          <span
            className="font-inter font-semibold"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Files Fixed
          </span>
        </div>

        {/* Hours Saved */}
        <div className="flex flex-col items-center">
          <span
            className="font-inter font-black tabular-nums"
            style={{
              fontSize: 90,
              color: '#E2D243',
              textShadow: `0 0 ${40 * counterGlow}px rgba(226, 210, 67, 0.6)`,
            }}
          >
            {hoursSaved}
          </span>
          <span
            className="font-inter font-semibold"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Hours Saved
          </span>
        </div>

        {/* Lines Changed */}
        <div className="flex flex-col items-center">
          <span
            className="font-inter font-black tabular-nums"
            style={{
              fontSize: 90,
              color: '#60A5FA',
              textShadow: `0 0 ${40 * counterGlow}px rgba(96, 165, 250, 0.6)`,
            }}
          >
            {linesChanged.toLocaleString()}
          </span>
          <span
            className="font-inter font-semibold"
            style={{ fontSize: 24, color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Lines Changed
          </span>
        </div>
      </div>

      {/* SHIPPED explosion */}
      {shippedPhase && (
        <>
          {/* Confetti */}
          {confetti.map((c) => (
            <div
              key={c.id}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: c.size,
                height: c.size * 0.6,
                backgroundColor: c.color,
                transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotation}deg)`,
                opacity: c.opacity,
                borderRadius: 2,
              }}
            />
          ))}

          {/* SHIPPED text - BIGGER */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              transform: `scale(${shippedScale})`,
              opacity: shippedOpacity,
            }}
          >
            <span
              className="font-inter font-black"
              style={{
                fontSize: 200,
                color: '#34D399',
                textShadow: `
                  0 0 80px rgba(52, 211, 153, 0.9),
                  0 0 160px rgba(52, 211, 153, 0.6),
                  0 15px 60px rgba(0, 0, 0, 0.6)
                `,
              }}
            >
              SHIPPED
            </span>
            <span
              className="font-inter font-bold"
              style={{
                fontSize: 44,
                color: 'rgba(255, 255, 255, 0.9)',
                marginTop: -5,
                letterSpacing: '0.05em',
              }}
            >
              While you were sleeping
            </span>
          </div>
        </>
      )}

      {/* Bottom tagline */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          bottom: 60,
          opacity: interpolate(frame, [10, 25], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          className="font-inter font-bold"
          style={{ fontSize: 28, color: 'rgba(255, 255, 255, 0.6)' }}
        >
          Development at the
        </span>
        <span
          className="font-inter font-black"
          style={{ fontSize: 28, color: '#E2D243' }}
        >
          speed of thought
        </span>
      </div>
    </AbsoluteFill>
  );
};
