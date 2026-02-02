import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/**
 * Scene 3: Dashboard Interaction (12-20s)
 *
 * ROUND 1 IMPROVEMENTS:
 * - BIGGER text throughout
 * - Faster cursor movement
 * - More dramatic click effect
 * - Items animate with more energy
 */
export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard entrance
  const dashSpring = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const dashScale = interpolate(dashSpring, [0, 1], [0.85, 1]);
  const dashOpacity = interpolate(dashSpring, [0, 1], [0, 1]);

  // Backlog items
  const items = [
    {
      title: 'Add error handling to auth flow',
      status: 'new',
      priority: 'high',
    },
    { title: 'Optimize database queries', status: 'new', priority: 'medium' },
    { title: 'Add input validation', status: 'new', priority: 'high' },
    { title: 'Fix potential memory leak', status: 'new', priority: 'critical' },
  ];

  // Cursor animation - SPRING BASED with overshoot
  const cursorVisible = frame >= 25;
  const cursorSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const cursorX = interpolate(cursorSpring, [0, 1], [150, 720]);
  const cursorY = interpolate(cursorSpring, [0, 1], [80, 195]);
  // Wobble effect on landing
  const cursorWobble = frame >= 50 && frame < 60 ? Math.sin((frame - 50) * 0.8) * 3 : 0;

  // Click at frame 55 - EVEN EARLIER
  const clickFrame = 55;
  const isClicking = frame >= clickFrame && frame < clickFrame + 8;
  const clickScale = isClicking ? 0.82 : 1;

  // After click - items start executing immediately
  const executingPhase = frame >= clickFrame + 5;

  // Approval animation - WAVE EFFECT, multiple items executing simultaneously
  const getItemStatus = (index: number) => {
    const approveDelay = clickFrame + 8 + index * 10; // Faster stagger
    if (frame < approveDelay) {return 'new';}
    if (frame < approveDelay + 10) {return 'executing';}
    return 'complete';
  };

  // Progress bars for executing items - FASTER with easing
  const getItemProgress = (index: number) => {
    const startFrame = clickFrame + 8 + index * 10;
    return interpolate(frame, [startFrame, startFrame + 10], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  };

  // Stats counter animation
  const completedCount = items.filter(
    (_, i) => getItemStatus(i) === 'complete',
  ).length;

  // Ripple effect from button click
  const rippleOpacity = interpolate(
    frame,
    [clickFrame, clickFrame + 5, clickFrame + 25],
    [0, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const rippleScale = interpolate(
    frame,
    [clickFrame, clickFrame + 25],
    [0.5, 3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Background particles
  const particles = Array.from({ length: 25 }, (_, i) => {
    const speed = 0.4 + (i % 4) * 0.2;
    const xPos = (i * 67.3) % 100;
    const yPos = ((frame * speed + i * 30) % 130) - 15;
    return {
      id: i,
      x: xPos,
      y: yPos,
      opacity: interpolate(yPos, [-15, 15, 100, 130], [0, 0.4, 0.4, 0]),
      size: 2 + (i % 3),
    };
  });

  const statusColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    new: { bg: 'rgba(96, 165, 250, 0.15)', text: '#60A5FA', border: '#60A5FA' },
    executing: {
      bg: 'rgba(226, 210, 67, 0.2)',
      text: '#E2D243',
      border: '#E2D243',
    },
    complete: {
      bg: 'rgba(52, 211, 153, 0.2)',
      text: '#34D399',
      border: '#34D399',
    },
  };

  const priorityColors: Record<string, string> = {
    critical: '#F87171',
    high: '#FBBF24',
    medium: '#60A5FA',
    low: '#9CA3AF',
  };

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Background particles */}
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

      {/* Dashboard container */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: 1200,
          height: 700,
          backgroundColor: 'rgba(13, 17, 23, 0.98)',
          border: '2px solid rgba(226, 210, 67, 0.2)',
          boxShadow: '0 25px 100px rgba(0, 0, 0, 0.6)',
          transform: `scale(${dashScale})`,
          opacity: dashOpacity,
        }}
      >
        {/* Dashboard header */}
        <div
          className="flex items-center justify-between px-8 py-4"
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <span
              className="font-inter font-black text-3xl"
              style={{ color: '#FFFFFF' }}
            >
              <span style={{ color: '#E2D243' }}>M</span>ASON
            </span>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-white/60 text-lg">Backlog</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)' }}
            >
              <span style={{ color: '#34D399', fontSize: 18, fontWeight: 600 }}>
                {completedCount}/{items.length} Complete
              </span>
            </div>
          </div>
        </div>

        {/* Approve All button with ripple */}
        <div className="relative px-8 py-4">
          <div
            className="inline-flex items-center gap-3 px-8 py-3 rounded-xl cursor-pointer relative overflow-hidden"
            style={{
              backgroundColor: executingPhase
                ? 'rgba(52, 211, 153, 0.2)'
                : '#E2D243',
              transform: `scale(${clickScale})`,
              transition: 'transform 0.1s',
            }}
          >
            {/* Ripple effect */}
            <div
              className="absolute rounded-full"
              style={{
                width: 100,
                height: 100,
                backgroundColor: '#FFFFFF',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${rippleScale})`,
                opacity: rippleOpacity,
              }}
            />

            <span
              className="relative z-10 font-inter font-bold text-xl"
              style={{
                color: executingPhase ? '#34D399' : '#0A0724',
              }}
            >
              {executingPhase ? '✓ Approved!' : 'Approve All'}
            </span>
          </div>
        </div>

        {/* Items list */}
        <div className="px-8 space-y-3">
          {items.map((item, i) => {
            const itemSpring = spring({
              frame: frame - 15 - i * 6,
              fps,
              config: { damping: 14, stiffness: 120 },
            });
            const itemY = interpolate(itemSpring, [0, 1], [30, 0]);
            const itemOpacity = interpolate(itemSpring, [0, 1], [0, 1]);

            const status = getItemStatus(i);
            const progress = getItemProgress(i);
            const colors = statusColors[status];

            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border-2"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px)`,
                }}
              >
                {/* Status indicator */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${colors.border}30`,
                    border: `2px solid ${colors.border}`,
                  }}
                >
                  {status === 'complete' ? (
                    <span style={{ color: colors.text, fontSize: 22 }}>✓</span>
                  ) : status === 'executing' ? (
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{
                        borderColor: `${colors.border} transparent transparent transparent`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colors.border }}
                    />
                  )}
                </div>

                {/* Item content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-inter font-medium text-lg"
                      style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                      style={{
                        backgroundColor: `${priorityColors[item.priority]}20`,
                        color: priorityColors[item.priority],
                      }}
                    >
                      {item.priority}
                    </span>
                  </div>

                  {/* Progress bar for executing items */}
                  {status === 'executing' && (
                    <div
                      className="mt-2 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: colors.border,
                          boxShadow: `0 0 10px ${colors.border}`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Status label */}
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold uppercase"
                  style={{
                    backgroundColor: `${colors.border}20`,
                    color: colors.text,
                  }}
                >
                  {status === 'complete'
                    ? 'Done'
                    : status === 'executing'
                      ? 'Running...'
                      : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cursor with wobble */}
      {cursorVisible && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: cursorX + cursorWobble,
            top: cursorY,
            transform: `scale(${isClicking ? 0.8 : 1})`,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.36-4.36a.996.996 0 01.71-.29h7.07c.45 0 .67-.54.35-.85L6.36 3.15c-.31-.31-.86-.09-.86.36z"
              fill="#FFFFFF"
              stroke="#0A0724"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Bottom text - BIGGER */}
      <div
        className="absolute flex items-center gap-4"
        style={{
          bottom: 50,
          opacity: interpolate(frame, [5, 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <span
          className="font-inter font-bold"
          style={{ fontSize: 44, color: 'rgba(255, 255, 255, 0.8)' }}
        >
          Review.
        </span>
        <span
          className="font-inter font-bold"
          style={{
            fontSize: 44,
            color: '#E2D243',
            textShadow: '0 0 20px rgba(226, 210, 67, 0.4)',
          }}
        >
          Approve.
        </span>
        <span
          className="font-inter font-bold"
          style={{
            fontSize: 44,
            color: '#34D399',
            textShadow: '0 0 20px rgba(52, 211, 153, 0.4)',
          }}
        >
          Ship.
        </span>
      </div>
    </AbsoluteFill>
  );
};
