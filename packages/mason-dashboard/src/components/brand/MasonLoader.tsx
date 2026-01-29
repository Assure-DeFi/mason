'use client';

import { clsx } from 'clsx';
import { MasonMark } from './MasonMark';

interface MasonLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  variant?: 'pulse' | 'spin' | 'glow' | 'breathe';
  className?: string;
}

const sizeConfig = {
  sm: { mark: 'sm' as const, text: 'text-xs', container: 'gap-2' },
  md: { mark: 'md' as const, text: 'text-sm', container: 'gap-3' },
  lg: { mark: 'lg' as const, text: 'text-base', container: 'gap-4' },
};

/**
 * Mason Loader - Branded loading animation
 * Premium motion with the Mason mark
 *
 * Variants:
 * - pulse: Soft opacity pulse (default, most subtle)
 * - spin: Gentle rotation
 * - glow: Gold glow pulse effect
 * - breathe: Scale breathing animation
 */
export function MasonLoader({
  size = 'md',
  label,
  variant = 'glow',
  className,
}: MasonLoaderProps) {
  const config = sizeConfig[size];

  const animationClass = {
    pulse: 'mason-loader-pulse',
    spin: 'mason-loader-spin',
    glow: 'mason-loader-glow',
    breathe: 'mason-loader-breathe',
  }[variant];

  return (
    <div
      className={clsx(
        'mason-loader flex flex-col items-center justify-center',
        config.container,
        className,
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div className={clsx('relative', animationClass)}>
        <MasonMark size={config.mark} animated />
        {variant === 'glow' && (
          <div className="mason-glow-ring absolute inset-0 -z-10" />
        )}
      </div>
      {label && (
        <span className={clsx('text-gray-400 animate-pulse', config.text)}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Mason Splash - Full-screen loading state for app boot
 */
export function MasonSplash({ message }: { message?: string }) {
  return (
    <div className="mason-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy">
      <div className="mason-splash-content flex flex-col items-center gap-8">
        <div className="mason-loader-glow">
          <MasonMark size="xl" animated />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="mason-wordmark text-3xl font-bold tracking-wider text-white">
            MASON
          </span>
          {message && (
            <span className="text-sm text-gray-400 animate-pulse">
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mason Page Loader - Centered loader for page transitions
 */
export function MasonPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <MasonLoader size="lg" label={label} variant="glow" />
    </div>
  );
}

/**
 * Mason Inline Loader - Small inline loading indicator
 */
export function MasonInlineLoader({ className }: { className?: string }) {
  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <MasonMark size="xs" className="mason-loader-pulse" />
      <span className="text-sm text-gray-400">Loading...</span>
    </div>
  );
}

export default MasonLoader;
