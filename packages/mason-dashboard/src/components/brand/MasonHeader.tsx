'use client';

import { clsx } from 'clsx';
import Link from 'next/link';

import { MasonMark } from './MasonMark';

interface MasonHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  variant?: 'full' | 'compact';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Mason Header - Branded header component for app pages
 * Includes the Mason mark/logo and consistent styling
 */
export function MasonHeader({
  title,
  subtitle,
  showLogo = true,
  variant = 'full',
  className,
  children,
}: MasonHeaderProps) {
  return (
    <header
      className={clsx(
        'border-b border-gray-800/50 bg-black/20',
        variant === 'compact' ? 'py-4' : 'py-6',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showLogo && (
              <Link
                href="/"
                className="group flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <MasonMark
                  size="md"
                  className="transition-transform group-hover:scale-105"
                />
                {variant === 'full' && (
                  <span className="mason-wordmark text-xl font-bold tracking-wider text-white">
                    MASON
                  </span>
                )}
              </Link>
            )}
            {title && (
              <>
                {showLogo && (
                  <div className="h-8 w-px bg-gray-700" aria-hidden="true" />
                )}
                <div>
                  <h1
                    className={clsx(
                      'font-bold tracking-tight text-white',
                      variant === 'compact' ? 'text-xl' : 'text-2xl',
                    )}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
                  )}
                </div>
              </>
            )}
          </div>
          {children && (
            <div className="flex items-center gap-3">{children}</div>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Mason Nav Header - Simplified navigation header with just logo
 */
export function MasonNavHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={clsx('border-b border-gray-800/50 bg-black/30', className)}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <MasonMark
              size="sm"
              className="transition-transform group-hover:scale-105"
            />
            <span className="mason-wordmark text-lg font-bold tracking-wider text-white">
              MASON
            </span>
          </Link>
          {children && (
            <div className="flex items-center gap-3">{children}</div>
          )}
        </div>
      </div>
    </header>
  );
}

export default MasonHeader;
