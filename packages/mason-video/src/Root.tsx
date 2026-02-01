import React from 'react';
import { Composition } from 'remotion';
import { MasonHypeVideo } from './MasonHypeVideo';
import { MasonDemoVideo } from './MasonDemoVideo';
import './styles.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* NEW: 30-second hype demo video */}
      <Composition
        id="MasonDemoVideo"
        component={MasonDemoVideo}
        durationInFrames={30 * 30} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      {/* Original 20-second video */}
      <Composition
        id="MasonHypeVideo"
        component={MasonHypeVideo}
        durationInFrames={30 * 20} // 20 seconds at 30fps - tight, punchy
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
