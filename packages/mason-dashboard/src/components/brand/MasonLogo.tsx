'use client';

import { clsx } from 'clsx';

import { MasonMark } from './MasonMark';

interface MasonLogoProps {
  variant?: 'mark' | 'wordmark' | 'lockup' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'auto' | 'light' | 'dark';
  className?: string;
  animated?: boolean;
}

const sizeConfig = {
  sm: { mark: 'sm' as const, text: 'text-lg', gap: 'gap-2' },
  md: { mark: 'md' as const, text: 'text-2xl', gap: 'gap-3' },
  lg: { mark: 'lg' as const, text: 'text-3xl', gap: 'gap-4' },
  xl: { mark: 'xl' as const, text: 'text-4xl', gap: 'gap-5' },
};

/**
 * Mason Logo Component
 * Variants:
 * - mark: Just the shield icon
 * - wordmark: Just "MASON" text
 * - lockup: Icon above text (vertical)
 * - horizontal: Icon + text side by side
 */
export function MasonLogo({
  variant = 'horizontal',
  size = 'md',
  theme = 'auto',
  className,
  animated = false,
}: MasonLogoProps) {
  const config = sizeConfig[size];

  const textColor =
    theme === 'light'
      ? 'text-navy'
      : theme === 'dark'
        ? 'text-white'
        : 'text-white';

  const markVariant =
    theme === 'light' ? 'default' : theme === 'dark' ? 'default' : 'default';

  if (variant === 'mark') {
    return (
      <MasonMark
        size={config.mark}
        variant={markVariant}
        className={className}
        animated={animated}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={clsx(
          'mason-wordmark font-bold tracking-wider',
          config.text,
          textColor,
          className,
        )}
      >
        MASON
      </span>
    );
  }

  if (variant === 'lockup') {
    return (
      <div
        className={clsx('flex flex-col items-center', config.gap, className)}
      >
        <MasonMark
          size={config.mark}
          variant={markVariant}
          animated={animated}
        />
        <span
          className={clsx(
            'mason-wordmark font-bold tracking-wider',
            config.text,
            textColor,
          )}
        >
          MASON
        </span>
      </div>
    );
  }

  // horizontal (default)
  return (
    <div className={clsx('flex items-center', config.gap, className)}>
      <MasonMark size={config.mark} variant={markVariant} animated={animated} />
      <span
        className={clsx(
          'mason-wordmark font-bold tracking-wider',
          config.text,
          textColor,
        )}
      >
        MASON
      </span>
    </div>
  );
}

export default MasonLogo;
