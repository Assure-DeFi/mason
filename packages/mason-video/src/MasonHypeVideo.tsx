import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { HookScene } from './scenes/HookScene';
import { ValueScene } from './scenes/ValueScene';
import { FlowScene } from './scenes/FlowScene';
import { CTAScene } from './scenes/CTAScene';

export const MasonHypeVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Tight 20-second video structure (600 frames at 30fps)
  const SCENE_TIMING = {
    hook: { start: 0, duration: fps * 4 }, // 0-4s: Visual hook - code transforming
    value: { start: fps * 4, duration: fps * 5 }, // 4-9s: Clear value proposition
    flow: { start: fps * 9, duration: fps * 6 }, // 9-15s: Scan → Approve → Ship
    cta: { start: fps * 15, duration: fps * 5 }, // 15-20s: CTA + Assure DeFi branding
  };

  return (
    <AbsoluteFill className="bg-navy">
      {/* Scene 1: Visual Hook - Show the magic immediately */}
      <Sequence
        from={SCENE_TIMING.hook.start}
        durationInFrames={SCENE_TIMING.hook.duration}
      >
        <HookScene />
      </Sequence>

      {/* Scene 2: Value Proposition - One clear message */}
      <Sequence
        from={SCENE_TIMING.value.start}
        durationInFrames={SCENE_TIMING.value.duration}
      >
        <ValueScene />
      </Sequence>

      {/* Scene 3: Flow - Three-step process */}
      <Sequence
        from={SCENE_TIMING.flow.start}
        durationInFrames={SCENE_TIMING.flow.duration}
      >
        <FlowScene />
      </Sequence>

      {/* Scene 4: CTA with Assure DeFi branding */}
      <Sequence
        from={SCENE_TIMING.cta.start}
        durationInFrames={SCENE_TIMING.cta.duration}
      >
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
