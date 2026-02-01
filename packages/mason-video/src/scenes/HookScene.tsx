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
 * ITERATION 3: Bigger terminal, more code, faster typing effect
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Extended code with more lines and syntax highlighting
  const codeLines = [
    {
      before: [
        { text: 'import ', color: '#C792EA' },
        { text: '{ fetchData }', color: '#FFCB6B' },
        { text: ' from ', color: '#C792EA' },
        { text: "'./api'", color: '#C3E88D' },
        { text: ';', color: '#89DDFF' },
      ],
      after: [
        { text: 'import ', color: '#C792EA' },
        { text: '{ fetchData, cache }', color: '#FFCB6B' },
        { text: ' from ', color: '#C792EA' },
        { text: "'./api'", color: '#C3E88D' },
        { text: ';', color: '#89DDFF' },
      ],
      delay: 0,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [{ text: '', color: '#545454' }],
      delay: 3,
    },
    {
      before: [
        { text: 'function ', color: '#C792EA' },
        { text: 'getData', color: '#82AAFF' },
        { text: '(', color: '#89DDFF' },
        { text: 'userId', color: '#F78C6C' },
        { text: ') {', color: '#89DDFF' },
      ],
      after: [
        { text: 'async ', color: '#C792EA' },
        { text: 'function ', color: '#C792EA' },
        { text: 'getData', color: '#82AAFF' },
        { text: '(', color: '#89DDFF' },
        { text: 'userId', color: '#F78C6C' },
        { text: ') {', color: '#89DDFF' },
      ],
      delay: 5,
    },
    {
      before: [
        { text: '  ', color: '#545454' },
        { text: '// TODO: add error handling', color: '#545454' },
      ],
      after: [
        { text: '  ', color: '#fff' },
        { text: 'try ', color: '#C792EA' },
        { text: '{', color: '#89DDFF' },
      ],
      delay: 8,
    },
    {
      before: [
        { text: '  ', color: '#545454' },
        { text: '// TODO: add caching', color: '#545454' },
      ],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'const ', color: '#C792EA' },
        { text: 'cached = ', color: '#fff' },
        { text: 'await ', color: '#C792EA' },
        { text: 'cache', color: '#82AAFF' },
        { text: '.get(userId);', color: '#89DDFF' },
      ],
      delay: 11,
    },
    {
      before: [
        { text: '  ', color: '#fff' },
        { text: 'const ', color: '#C792EA' },
        { text: 'data = ', color: '#fff' },
        { text: 'fetch', color: '#82AAFF' },
        { text: '(url);', color: '#89DDFF' },
      ],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'if ', color: '#C792EA' },
        { text: '(cached) ', color: '#fff' },
        { text: 'return ', color: '#C792EA' },
        { text: 'cached;', color: '#E2D243' },
      ],
      delay: 14,
    },
    {
      before: [
        { text: '  ', color: '#fff' },
        { text: 'return ', color: '#C792EA' },
        { text: 'data;', color: '#fff' },
      ],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'const ', color: '#C792EA' },
        { text: 'data = ', color: '#fff' },
        { text: 'await ', color: '#C792EA' },
        { text: 'fetchData', color: '#82AAFF' },
        { text: '(userId);', color: '#89DDFF' },
      ],
      delay: 17,
    },
    {
      before: [{ text: '}', color: '#89DDFF' }],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'await ', color: '#C792EA' },
        { text: 'cache', color: '#82AAFF' },
        { text: '.set(userId, data);', color: '#89DDFF' },
      ],
      delay: 20,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'return ', color: '#C792EA' },
        { text: 'data;', color: '#E2D243' },
      ],
      delay: 23,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [
        { text: '  } ', color: '#89DDFF' },
        { text: 'catch ', color: '#C792EA' },
        { text: '(error) {', color: '#89DDFF' },
      ],
      delay: 26,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'logger', color: '#82AAFF' },
        { text: '.error(error);', color: '#89DDFF' },
      ],
      delay: 29,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [
        { text: '    ', color: '#fff' },
        { text: 'throw ', color: '#C792EA' },
        { text: 'new ', color: '#C792EA' },
        { text: 'DataError', color: '#FFCB6B' },
        { text: '(error);', color: '#89DDFF' },
      ],
      delay: 32,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [{ text: '  }', color: '#89DDFF' }],
      delay: 35,
    },
    {
      before: [{ text: '', color: '#545454' }],
      after: [{ text: '}', color: '#89DDFF' }],
      delay: 38,
    },
  ];

  // FASTER: Start transformation at frame 5 (0.16s)
  const transformStart = 5;

  // Scan line effect - faster sweep
  const scanLineY = interpolate(frame, [0, 50], [-10, 110], {
    extrapolateRight: 'clamp',
  });

  // Final burst effect
  const burstScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 8, stiffness: 100 },
  });

  // Particles that burst outward
  const burstParticles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const burstFrame = frame - 60;
    const distance = interpolate(burstFrame, [0, 15], [0, 400], {
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
  const bgGlow = interpolate(frame, [45, 70], [0, 0.4], {
    extrapolateRight: 'clamp',
  });

  // Editor entrance animation
  const editorSpring = spring({
    frame: frame - 2,
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
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center glow on transformation */}
      <div
        className="absolute"
        style={{
          width: 900,
          height: 700,
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
            width: 8,
            height: 8,
            backgroundColor: '#E2D243',
            left: '50%',
            top: '50%',
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
            boxShadow: '0 0 20px #E2D243',
          }}
        />
      ))}

      {/* Code editor container - BIGGER */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: 950,
          height: 420,
          backgroundColor: 'rgba(13, 17, 23, 0.98)',
          border: '2px solid rgba(226, 210, 67, 0.2)',
          boxShadow: `0 0 ${60 * bgGlow}px rgba(226, 210, 67, 0.3)`,
          transform: `scale(${editorScale})`,
          opacity: editorOpacity,
        }}
      >
        {/* Editor header - VS Code style */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ backgroundColor: 'rgba(30, 30, 30, 0.9)' }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: '#FF5F56' }}
          />
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: '#FFBD2E' }}
          />
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: '#27CA40' }}
          />
          <span
            className="ml-4 font-mono"
            style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}
          >
            api/getData.ts — Mason Auto-Improving
          </span>
          <div className="flex-1" />
          <span
            className="font-mono px-2 py-1 rounded"
            style={{
              fontSize: 11,
              color: '#E2D243',
              backgroundColor: 'rgba(226, 210, 67, 0.15)',
            }}
          >
            MASON ACTIVE
          </span>
        </div>

        {/* Code content with syntax highlighting */}
        <div
          className="px-6 py-4 font-mono"
          style={{ fontSize: 16, lineHeight: 1.5 }}
        >
          {codeLines.map((line, index) => {
            const lineProgress = interpolate(
              frame,
              [transformStart + line.delay, transformStart + line.delay + 8],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );

            const showAfter = lineProgress > 0.5;
            const glitchEffect = interpolate(
              lineProgress,
              [0.35, 0.5, 0.65],
              [1, 0.2, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );

            const tokens = showAfter ? line.after : line.before;

            return (
              <div
                key={index}
                className="py-0.5"
                style={{
                  opacity: glitchEffect,
                  transform: `translateX(${(1 - glitchEffect) * (index % 2 === 0 ? 4 : -4)}px)`,
                }}
              >
                <span style={{ color: '#545454', marginRight: 16 }}>
                  {String(index + 1).padStart(2, ' ')}
                </span>
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
          className="absolute left-0 right-0 h-1"
          style={{
            top: `${scanLineY}%`,
            background:
              'linear-gradient(90deg, transparent 5%, #E2D243 50%, transparent 95%)',
            opacity: scanLineY < 100 ? 0.9 : 0,
            boxShadow: '0 0 20px #E2D243',
          }}
        />
      </div>

      {/* "MASON" text reveal after burst - LARGER */}
      <div
        className="absolute"
        style={{
          bottom: 60,
          opacity: interpolate(frame, [75, 90], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: `scale(${interpolate(frame, [75, 95], [0.7, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
        }}
      >
        <span
          className="font-inter font-black"
          style={{
            fontSize: 72,
            color: '#FFFFFF',
            textShadow: `0 0 ${50 * bgGlow}px rgba(226, 210, 67, 0.8)`,
          }}
        >
          <span style={{ color: '#E2D243' }}>M</span>ASON
        </span>
      </div>
    </AbsoluteFill>
  );
};
