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
 * Scene 1: The Hook (0-5s)
 *
 * ROUND 1 IMPROVEMENTS:
 * - Immediate motion from frame 0
 * - Faster bug spawning with more energy
 * - Bigger text, more dramatic
 * - Screen shake and distortion
 * - Epic transition to Mason logo
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Chaos (0-1.5s) - MAXIMUM CHAOS
  const chaosPhase = frame < fps * 1.5;

  // ROUND 3: Bugs fly in from outside screen with random trajectories
  const bugs = [
    { text: 'TypeError', startX: -800, startY: 0, endX: -350, endY: -180, delay: 0, color: '#FF6B6B', size: 50, rotSpeed: 8 },
    { text: 'undefined', startX: 1200, startY: -400, endX: 380, endY: 80, delay: 0, color: '#FF8E72', size: 46, rotSpeed: -6 },
    { text: 'NaN', startX: 0, startY: -600, endX: 320, endY: -180, delay: 1, color: '#FF6B6B', size: 60, rotSpeed: 10 },
    { text: 'CRASH', startX: -900, startY: 300, endX: 280, endY: 180, delay: 1, color: '#FF6B6B', size: 56, rotSpeed: -12 },
    { text: '500', startX: 1000, startY: 200, endX: -300, endY: -80, delay: 2, color: '#FFB347', size: 52, rotSpeed: 7 },
    { text: 'null', startX: 400, startY: -700, endX: 350, endY: -280, delay: 2, color: '#FF6B6B', size: 48, rotSpeed: -9 },
    { text: 'FATAL', startX: -700, startY: -300, endX: -150, endY: -250, delay: 3, color: '#FF4444', size: 62, rotSpeed: 11 },
    { text: 'PANIC', startX: 800, startY: 400, endX: -400, endY: 150, delay: 3, color: '#FF4444', size: 58, rotSpeed: -8 },
    { text: 'LEAK', startX: -500, startY: 500, endX: 420, endY: -50, delay: 4, color: '#FF6B6B', size: 54, rotSpeed: 6 },
    { text: '404', startX: 600, startY: -500, endX: 450, endY: -100, delay: 4, color: '#FFB347', size: 50, rotSpeed: -10 },
    { text: 'ERR', startX: -600, startY: 100, endX: 200, endY: 250, delay: 5, color: '#FF6B6B', size: 52, rotSpeed: 9 },
    { text: 'BUG', startX: 0, startY: -800, endX: 0, endY: 0, delay: 6, color: '#FF4444', size: 90, rotSpeed: 0 },
  ];

  // Chromatic aberration during chaos
  const chromaOffset = chaosPhase ? Math.sin(frame * 0.5) * 3 : 0;

  // MAXIMUM shake effect during chaos
  const shakeIntensity = interpolate(
    frame,
    [0, fps * 1, fps * 1.5],
    [3, 12, 0],
    {
      extrapolateRight: 'clamp',
    },
  );
  const shakeX = chaosPhase ? Math.sin(frame * 4) * shakeIntensity : 0;
  const shakeY = chaosPhase ? Math.cos(frame * 5) * shakeIntensity * 0.9 : 0;

  // Red vignette pulsing during chaos - MAXIMUM INTENSITY
  const vignetteOpacity = chaosPhase
    ? interpolate(Math.sin(frame * 0.5), [-1, 1], [0.25, 0.6])
    : interpolate(frame - fps * 1.5, [0, 15], [0.6, 0], {
        extrapolateRight: 'clamp',
      });

  // Transition flash at 1.5s - INSTANT IMPACT
  const flashOpacity = interpolate(
    frame,
    [fps * 1.5 - 1, fps * 1.5, fps * 1.5 + 6],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Mason logo burst at 1.5s - SLAM EFFECT (scale up then settle)
  const masonSpring = spring({
    frame: frame - fps * 1.5,
    fps,
    config: { damping: 5, stiffness: 100 },
  });
  const masonScale = interpolate(masonSpring, [0, 0.5, 1], [0.1, 1.15, 1]); // Overshoot!
  const masonOpacity = interpolate(masonSpring, [0, 0.15, 1], [0, 0.7, 1]);

  // Logo glow pulse - AGGRESSIVE
  const glowPulse = interpolate((frame - fps * 1.5) % 12, [0, 6, 12], [1.2, 2.2, 1.2], {
    extrapolateLeft: 'clamp',
  });

  // Speed lines emanating from center - MORE LINES, FASTER
  const speedLines = Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2;
    const lineProgress = interpolate(frame - fps * 1.5 - 2, [0, 15], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      id: i,
      angle,
      length: lineProgress * 1200,
      opacity: interpolate(lineProgress, [0, 0.15, 0.6, 1], [0, 1, 0.95, 0]),
      width: 2 + (i % 4),
    };
  });

  // Tagline reveal - at 2s
  const taglineOpacity = interpolate(frame, [fps * 2, fps * 2.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [fps * 2, fps * 2.5], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2.5)),
  });

  // Subtitle effect - at 3s
  const subtitleOpacity = interpolate(frame, [fps * 3, fps * 3.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      className="bg-navy flex items-center justify-center overflow-hidden"
      style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}
    >
      {/* Dark grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(226, 210, 67, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 210, 67, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Red vignette during chaos */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(255, 0, 0, ${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Flying bugs during chaos - FLY IN FROM OUTSIDE */}
      {chaosPhase &&
        bugs.map((bug, i) => {
          // Fly-in progress
          const flyProgress = interpolate(
            frame,
            [bug.delay, bug.delay + 12],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );
          const currentX = interpolate(flyProgress, [0, 1], [bug.startX, bug.endX]);
          const currentY = interpolate(flyProgress, [0, 1], [bug.startY, bug.endY]);

          const bugOpacity = interpolate(
            frame,
            [bug.delay, bug.delay + 3, fps * 1.3, fps * 1.5],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );

          // Continuous rotation
          const rotation = (frame - bug.delay) * bug.rotSpeed;

          // Glitch flicker effect
          const glitch = Math.random() > 0.92 ? 0.3 : 1;

          // Scale bounce on arrival
          const scale = interpolate(
            flyProgress,
            [0, 0.7, 0.85, 1],
            [0.3, 1.2, 0.9, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );

          return (
            <div
              key={i}
              className="absolute font-mono font-black"
              style={{
                left: `calc(50% + ${currentX}px)`,
                top: `calc(50% + ${currentY}px)`,
                fontSize: bug.size,
                color: bug.color,
                opacity: bugOpacity * glitch,
                transform: `rotate(${rotation}deg) scale(${scale}) translate(${chromaOffset}px, 0)`,
                textShadow: `0 0 40px ${bug.color}, 0 0 80px ${bug.color}, ${chromaOffset * 2}px 0 0 rgba(255,0,0,0.5), ${-chromaOffset * 2}px 0 0 rgba(0,255,255,0.5)`,
              }}
            >
              {bug.text}
            </div>
          );
        })}

      {/* Transition flash */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#E2D243',
          opacity: flashOpacity,
        }}
      />

      {/* Speed lines after transition - THICKER, MORE DYNAMIC */}
      {!chaosPhase &&
        speedLines.map((line) => (
          <div
            key={line.id}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: line.length,
              height: line.width,
              background: `linear-gradient(90deg, transparent 10%, #E2D243)`,
              opacity: line.opacity,
              transform: `rotate(${line.angle}rad)`,
              transformOrigin: 'left center',
              boxShadow: '0 0 10px #E2D243',
            }}
          />
        ))}

      {/* Gold center glow after transition */}
      {!chaosPhase && (
        <div
          className="absolute"
          style={{
            width: 800,
            height: 600,
            background: `radial-gradient(ellipse, rgba(226, 210, 67, ${0.3 * masonOpacity}) 0%, transparent 60%)`,
            transform: `scale(${masonScale})`,
          }}
        />
      )}

      {/* MASON logo */}
      {!chaosPhase && (
        <div
          className="flex flex-col items-center"
          style={{
            opacity: masonOpacity,
            transform: `scale(${masonScale})`,
          }}
        >
          <span
            className="font-inter font-black"
            style={{
              fontSize: 240,
              color: '#FFFFFF',
              textShadow: `
                0 0 ${100 * glowPulse}px rgba(226, 210, 67, 0.95),
                0 0 ${200 * glowPulse}px rgba(226, 210, 67, 0.6),
                0 10px 50px rgba(0, 0, 0, 0.6)
              `,
            }}
          >
            <span style={{ color: '#E2D243' }}>M</span>ASON
          </span>

          {/* Tagline - BIGGER */}
          <div
            style={{
              opacity: taglineOpacity,
              transform: `translateY(${taglineY}px)`,
              marginTop: -5,
            }}
          >
            <span
              className="font-inter font-bold"
              style={{
                fontSize: 56,
                color: 'rgba(255, 255, 255, 0.95)',
                letterSpacing: '0.12em',
              }}
            >
              Your AI Developer
            </span>
          </div>

          {/* Subtitle - appears after tagline */}
          <div
            style={{
              opacity: subtitleOpacity,
              marginTop: 20,
            }}
          >
            <span
              className="font-inter font-medium"
              style={{
                fontSize: 32,
                color: '#E2D243',
                letterSpacing: '0.2em',
              }}
            >
              Scan. Approve. Ship.
            </span>
          </div>
        </div>
      )}

      {/* Particle burst on logo reveal - MAXIMUM PARTICLES */}
      {!chaosPhase &&
        Array.from({ length: 64 }, (_, i) => {
          const angle = (i / 64) * Math.PI * 2;
          const particleProgress = interpolate(
            frame - fps * 1.5,
            [0, 20],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );
          const distance = particleProgress * 700 * (0.6 + (i % 6) * 0.12);
          const particleOpacity = interpolate(
            particleProgress,
            [0, 0.1, 0.5, 1],
            [0, 1, 0.95, 0],
          );

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                width: 10 + (i % 5) * 4,
                height: 10 + (i % 5) * 4,
                backgroundColor: i % 3 === 0 ? '#E2D243' : i % 3 === 1 ? '#FFFFFF' : '#34D399',
                transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`,
                opacity: particleOpacity,
                boxShadow: '0 0 25px #E2D243',
              }}
            />
          );
        })}
    </AbsoluteFill>
  );
};
