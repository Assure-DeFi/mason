import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { OpeningScene } from "./scenes/OpeningScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { FeatureShowcase } from "./scenes/FeatureShowcase";
import { HowItWorksScene } from "./scenes/HowItWorksScene";
import { CallToActionScene } from "./scenes/CallToActionScene";

export const MasonHypeVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing (in frames at 30fps)
  const SCENE_TIMING = {
    opening: { start: 0, duration: fps * 6 }, // 0-6s: Opening hook
    problem: { start: fps * 6, duration: fps * 7 }, // 6-13s: Problem statement
    solution: { start: fps * 13, duration: fps * 6 }, // 13-19s: Solution intro
    features: { start: fps * 19, duration: fps * 12 }, // 19-31s: Feature showcase
    howItWorks: { start: fps * 31, duration: fps * 8 }, // 31-39s: How it works
    cta: { start: fps * 39, duration: fps * 6 }, // 39-45s: Call to action
  };

  return (
    <AbsoluteFill className="bg-navy">
      {/* Scene 1: Opening Hook */}
      <Sequence
        from={SCENE_TIMING.opening.start}
        durationInFrames={SCENE_TIMING.opening.duration}
      >
        <OpeningScene />
      </Sequence>

      {/* Scene 2: Problem Statement */}
      <Sequence
        from={SCENE_TIMING.problem.start}
        durationInFrames={SCENE_TIMING.problem.duration}
      >
        <ProblemScene />
      </Sequence>

      {/* Scene 3: Solution Introduction */}
      <Sequence
        from={SCENE_TIMING.solution.start}
        durationInFrames={SCENE_TIMING.solution.duration}
      >
        <SolutionScene />
      </Sequence>

      {/* Scene 4: Feature Showcase */}
      <Sequence
        from={SCENE_TIMING.features.start}
        durationInFrames={SCENE_TIMING.features.duration}
      >
        <FeatureShowcase />
      </Sequence>

      {/* Scene 5: How It Works */}
      <Sequence
        from={SCENE_TIMING.howItWorks.start}
        durationInFrames={SCENE_TIMING.howItWorks.duration}
      >
        <HowItWorksScene />
      </Sequence>

      {/* Scene 6: Call to Action */}
      <Sequence
        from={SCENE_TIMING.cta.start}
        durationInFrames={SCENE_TIMING.cta.duration}
      >
        <CallToActionScene />
      </Sequence>
    </AbsoluteFill>
  );
};
