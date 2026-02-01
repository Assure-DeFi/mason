import React from "react";
import { Composition } from "remotion";
import { MasonHypeVideo } from "./MasonHypeVideo";
import "./styles.css";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MasonHypeVideo"
        component={MasonHypeVideo}
        durationInFrames={30 * 45} // 45 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
