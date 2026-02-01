import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';
import { HookScene } from './demo-scenes/HookScene';
import { CLIScene } from './demo-scenes/CLIScene';
import { DashboardScene } from './demo-scenes/DashboardScene';
import { ShipScene } from './demo-scenes/ShipScene';
import { CTAScene } from './demo-scenes/CTAScene';

/**
 * Gold Wipe Transition Component
 */
const GoldWipe: React.FC<{ triggerFrame: number }> = ({ triggerFrame }) => {
  const frame = useCurrentFrame();
  const wipeProgress = interpolate(
    frame,
    [triggerFrame, triggerFrame + 8],
    [-100, 110],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const wipeOpacity = interpolate(
    frame,
    [triggerFrame, triggerFrame + 3, triggerFrame + 6, triggerFrame + 8],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  if (wipeOpacity <= 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `linear-gradient(90deg,
          transparent ${wipeProgress - 30}%,
          rgba(226, 210, 67, 0.3) ${wipeProgress - 15}%,
          #E2D243 ${wipeProgress}%,
          rgba(226, 210, 67, 0.3) ${wipeProgress + 15}%,
          transparent ${wipeProgress + 30}%
        )`,
        opacity: wipeOpacity,
      }}
    />
  );
};

/**
 * Mason Demo Video - 30 Second Hype Edition
 * ROUND 3: Maximum energy, gold wipe transitions
 */
export const MasonDemoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  // 30-second structure (900 frames at 30fps)
  const SCENES = {
    hook: { start: 0, duration: fps * 5 },           // 0-5s: Problem → Solution
    cli: { start: fps * 5, duration: fps * 7 },      // 5-12s: CLI magic
    dashboard: { start: fps * 12, duration: fps * 8 }, // 12-20s: Dashboard interaction
    ship: { start: fps * 20, duration: fps * 6 },    // 20-26s: Ship it fast
    cta: { start: fps * 26, duration: fps * 4 },     // 26-30s: CTA explosion
  };

  return (
    <AbsoluteFill className="bg-navy">
      {/* Scene 1: Hook - The Problem & Solution */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}>
        <HookScene />
      </Sequence>

      {/* Gold wipe transition */}
      <GoldWipe triggerFrame={SCENES.cli.start - 4} />

      {/* Scene 2: CLI Magic - Real command execution */}
      <Sequence from={SCENES.cli.start} durationInFrames={SCENES.cli.duration}>
        <CLIScene />
      </Sequence>

      {/* Gold wipe transition */}
      <GoldWipe triggerFrame={SCENES.dashboard.start - 4} />

      {/* Scene 3: Dashboard - Interactive approval flow */}
      <Sequence from={SCENES.dashboard.start} durationInFrames={SCENES.dashboard.duration}>
        <DashboardScene />
      </Sequence>

      {/* Gold wipe transition */}
      <GoldWipe triggerFrame={SCENES.ship.start - 4} />

      {/* Scene 4: Ship It - Speed, deployment, celebration */}
      <Sequence from={SCENES.ship.start} durationInFrames={SCENES.ship.duration}>
        <ShipScene />
      </Sequence>

      {/* Gold wipe transition */}
      <GoldWipe triggerFrame={SCENES.cta.start - 4} />

      {/* Scene 5: CTA - Maximum energy */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
