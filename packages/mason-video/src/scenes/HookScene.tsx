import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/**
 * Scene 1: The Hook (0-4s)
 * ITERATION 2: Faster start, no cheesy text, better syntax highlighting
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Code with syntax highlighting colors
  const codeLines = [
    {
      before: [
        { text: 'function ', color: '#C792EA' },
        { text: 'getData', color: '#82AAFF' },
        { text: '() {', color: '#89DDFF' },
      ],
      after: [
        { text: 'async ', color: '#C792EA' },
        { text: 'function ', color: '#C792EA' },
        { text: 'getData', color: '#82AAFF' },
        { text: '() {', color: '#89DDFF' },
      ],
      delay: 0,
    },
    {
      before: [
        { text: '  ', color: '#545454' },
        { text: '// TODO: add caching', color: '#545454' },
      ],
      after: [
        { text: '  ', color: '#fff' },
        { text: 'const ', color: '#C792EA' },
        { text: 'cached = ', color: '#fff' },
        { text: 'cache', color: '#82AAFF' },
        { text: '.get(key);', color: '#89DDFF' },
      ],
      delay: 6,
    },
    {
      before: [
        { text: '  ', color: '#fff' },
        { text: 'return ', color: '#C792EA' },
        { text: 'fetch', color: '#82AAFF' },
        { text: '(url);', color: '#89DDFF' },
      ],
      after: [
        { text: '  ', color: '#fff' },
        { text: 'return ', color: '#C792EA' },
        { text: 'cached ?? ', color: '#E2D243' },
        { text: 'await ', color: '#C792EA' },
        { text: 'fetch', color: '#82AAFF' },
        { text: '(url);', color: '#89DDFF' },
      ],
      delay: 12,
    },
    {
      before: [{ text: '}', color: '#89DDFF' }],
      after: [{ text: '}', color: '#89DDFF' }],
      delay: 18,
    },
  ];

  // FASTER: Start transformation at frame 10 (0.3s) instead of 30
  const transformStart = 10;

  // Scan line effect - faster sweep
  const scanLineY = interpolate(frame, [0, 40], [-10, 110], {
    extrapolateRight: 'clamp',
  });

  // Final burst effect
  const burstScale = spring({
    frame: frame - 55,
    fps,
    config: { damping: 8, stiffness: 100 },
  });

  // Particles that burst outward
  const burstParticles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const burstFrame = frame - 55;
    const distance = interpolate(burstFrame, [0, 15], [0, 350], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const opacity = interpolate(burstFrame, [0, 8, 15], [0, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity,
    };
  });

  // Background energy
  const bgGlow = interpolate(frame, [45, 70], [0, 0.35], {
    extrapolateRight: 'clamp',
  });

  // Editor entrance animation
  const editorSpring = spring({
    frame: frame - 3,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  const editorScale = interpolate(editorSpring, [0, 1], [0.9, 1]);
  const editorOpacity = interpolate(editorSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill className="bg-navy flex items-center justify-center overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(226, 210, 67, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 210, 67, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Center glow on transformation */}
      <div
        className="absolute"
        style={{
          width: 700,
          height: 500,
          background: `radial-gradient(ellipse, rgba(226, 210, 67, ${bgGlow}) 0%, transparent 70%)`,
          transform: `scale(${1 + burstScale * 0.4})`,
        }}
      />

      {/* Burst particles */}
      {burstParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: '#E2D243',
            left: '50%',
            top: '50%',
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
            boxShadow: '0 0 15px #E2D243',
          }}
        />
      ))}

      {/* Code editor container */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: 750,
          height: 280,
          backgroundColor: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid rgba(226, 210, 67, 0.15)',
          boxShadow: `0 0 ${50 * bgGlow}px rgba(226, 210, 67, 0.25)`,
          transform: `scale(${editorScale})`,
          opacity: editorOpacity,
        }}
      >
        {/* Editor header - VS Code style */}
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ backgroundColor: 'rgba(30, 30, 30, 0.8)' }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#FF5F56' }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#FFBD2E' }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#27CA40' }}
          />
          <span
            className="ml-4 font-mono text-xs"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          >
            api.ts — Mason
          </span>
        </div>

        {/* Code content with syntax highlighting */}
        <div
          className="px-6 py-4 font-mono"
          style={{ fontSize: 18, lineHeight: 1.6 }}
        >
          {codeLines.map((line, index) => {
            const lineProgress = interpolate(
              frame,
              [transformStart + line.delay, transformStart + line.delay + 12],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );

            const showAfter = lineProgress > 0.5;
            const glitchEffect = interpolate(
              lineProgress,
              [0.35, 0.5, 0.65],
              [1, 0.3, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );

            const tokens = showAfter ? line.after : line.before;

            return (
              <div
                key={index}
                className="py-0.5"
                style={{
                  opacity: glitchEffect,
                  transform: `translateX(${(1 - glitchEffect) * (index % 2 === 0 ? 3 : -3)}px)`,
                }}
              >
                {tokens.map((token, ti) => (
                  <span key={ti} style={{ color: token.color }}>
                    {token.text}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* Scan line effect */}
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{
            top: `${scanLineY}%`,
            background:
              'linear-gradient(90deg, transparent 5%, #E2D243 50%, transparent 95%)',
            opacity: scanLineY < 100 ? 0.9 : 0,
            boxShadow: '0 0 15px #E2D243',
          }}
        />
      </div>

      {/* "MASON" text reveal after burst - more dramatic */}
      <div
        className="absolute"
        style={{
          bottom: 100,
          opacity: interpolate(frame, [70, 85], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: `scale(${interpolate(frame, [70, 90], [0.7, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
        }}
      >
        <span
          className="font-inter font-black"
          style={{
            fontSize: 56,
            color: '#FFFFFF',
            textShadow: `0 0 ${40 * bgGlow}px rgba(226, 210, 67, 0.7)`,
          }}
        >
          <span style={{ color: '#E2D243' }}>M</span>ASON
        </span>
      </div>
    </AbsoluteFill>
  );
};
