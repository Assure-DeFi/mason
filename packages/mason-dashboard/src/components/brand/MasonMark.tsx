'use client';

import { clsx } from 'clsx';

interface MasonMarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'white' | 'gold';
  className?: string;
  animated?: boolean;
}

const sizeMap = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

/**
 * Mason Mark - The minimal geometric icon (shield + hooded figure + star)
 * Based on mason_logo_minimal.png design
 * Uses inline SVG for crisp rendering and animation support
 */
export function MasonMark({
  size = 'md',
  variant = 'default',
  className,
  animated = false,
}: MasonMarkProps) {
  const dimension = sizeMap[size];

  const colors = {
    default: {
      stroke: '#E2D243', // gold
      fill: '#0A0724', // navy
      accent: '#FFFFFF', // white
    },
    white: {
      stroke: '#FFFFFF',
      fill: '#FFFFFF',
      accent: '#0A0724',
    },
    gold: {
      stroke: '#E2D243',
      fill: '#E2D243',
      accent: '#0A0724',
    },
  };

  const { stroke, fill, accent } = colors[variant];

  return (
    <svg
      viewBox="0 0 512 512"
      width={dimension}
      height={dimension}
      className={clsx(
        'mason-mark flex-shrink-0',
        animated && 'mason-mark-animated',
        className,
      )}
      aria-label="Mason"
      role="img"
    >
      {/* Outer hexagon shield frame */}
      <polygon
        className={clsx(animated && 'mason-shield-outer')}
        points="256,28 456,144 456,368 256,484 56,368 56,144"
        fill="none"
        stroke={stroke}
        strokeWidth="12"
      />

      {/* Inner hexagon shield frame */}
      <polygon
        className={clsx(animated && 'mason-shield-inner')}
        points="256,56 432,160 432,352 256,456 80,352 80,160"
        fill="none"
        stroke={stroke}
        strokeWidth="6"
      />

      {/* Star above figure */}
      <polygon
        className={clsx(animated && 'mason-star')}
        points="256,76 263,96 284,96 267,110 274,130 256,116 238,130 245,110 228,96 249,96"
        fill={stroke}
      />

      {/* Hooded figure - main body */}
      <path
        className={clsx(animated && 'mason-figure')}
        d="M 256 140
           L 200 200
           L 200 260
           L 136 340
           L 136 380
           L 200 340
           L 220 380
           L 256 400
           L 292 380
           L 312 340
           L 376 380
           L 376 340
           L 312 260
           L 312 200
           L 256 140
           Z"
        fill={fill}
      />

      {/* Hood peak */}
      <path
        d="M 256 140
           L 296 190
           L 256 170
           L 216 190
           Z"
        fill={fill}
      />

      {/* Diamond face opening */}
      <polygon
        className={clsx(animated && 'mason-face')}
        points="256,176 296,232 256,288 216,232"
        fill={accent}
      />

      {/* Open book - left page */}
      <path
        d="M 160 350
           L 252 310
           L 252 370
           L 160 405
           Z"
        fill={accent}
      />

      {/* Open book - right page */}
      <path
        d="M 352 350
           L 260 310
           L 260 370
           L 352 405
           Z"
        fill={accent}
      />

      {/* Book spine highlight */}
      <line
        x1="256"
        y1="310"
        x2="256"
        y2="372"
        stroke={stroke}
        strokeWidth="4"
      />
    </svg>
  );
}

export default MasonMark;
