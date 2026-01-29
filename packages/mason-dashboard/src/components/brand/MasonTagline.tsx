'use client';

import { clsx } from 'clsx';

interface MasonTaglineProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'accent';
  className?: string;
}

const sizeConfig = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const variantConfig = {
  default: 'text-gray-400',
  muted: 'text-gray-500',
  accent: 'text-gold',
};

/**
 * Mason Tagline Component
 * Displays "Rock Solid by Design" with configurable size and style variants.
 */
export function MasonTagline({
  size = 'md',
  variant = 'default',
  className,
}: MasonTaglineProps) {
  return (
    <p
      className={clsx(
        'font-medium tracking-wide',
        sizeConfig[size],
        variantConfig[variant],
        className,
      )}
    >
      Rock Solid by Design
    </p>
  );
}

export default MasonTagline;
