'use client';

import Image from 'next/image';
import { clsx } from 'clsx';

interface MasonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  variant?: 'detailed' | 'minimal';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 180,
  '2xl': 240,
  hero: 320,
};

/**
 * Mason Avatar - The detailed character image
 * Uses the PNG artwork for rich detail
 * Variants:
 * - detailed: v2 icon with gradients and glow effects
 * - minimal: v5 flat geometric style
 */
export function MasonAvatar({
  size = 'md',
  variant = 'detailed',
  className,
  priority = false,
}: MasonAvatarProps) {
  const dimension = sizeMap[size];
  const imageSrc =
    variant === 'detailed'
      ? '/brand/mason_logo_v2_icon.png'
      : '/brand/mason_logo_v5_minimal.png';

  return (
    <div
      className={clsx(
        'mason-avatar relative flex-shrink-0',
        size === 'hero' && 'mason-avatar-hero',
        className,
      )}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={imageSrc}
        alt="Mason"
        width={dimension}
        height={dimension}
        className="object-contain"
        priority={priority}
      />
      {/* Subtle glow effect for hero size */}
      {size === 'hero' && (
        <div
          className="absolute inset-0 -z-10 blur-3xl opacity-30"
          style={{
            background:
              'radial-gradient(circle, var(--gold) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}

export default MasonAvatar;
