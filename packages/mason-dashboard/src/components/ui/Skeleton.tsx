'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-800/50';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClass, variantClasses.text, i === lines - 1 && 'w-3/4')}
            style={{ width: i === lines - 1 ? '75%' : width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(baseClass, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
}

export function BacklogItemSkeleton() {
  return (
    <div className="border border-gray-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-4 h-4" />
        <Skeleton variant="text" className="flex-1 h-5" />
        <Skeleton variant="rectangular" className="w-16 h-6" />
      </div>
      <Skeleton variant="text" lines={2} className="text-sm" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="w-20 h-6" />
        <Skeleton variant="rectangular" className="w-16 h-6" />
        <Skeleton variant="rectangular" className="w-24 h-6" />
      </div>
    </div>
  );
}

export function BacklogListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <BacklogItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table skeleton matching ImprovementsTable layout
 * Provides better perceived performance than a spinner
 */
export function ImprovementsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-gray-800 overflow-hidden">
      {/* Table Header */}
      <div className="bg-black/30 border-b border-gray-800 px-4 py-3 hidden md:grid md:grid-cols-[40px_1fr_120px_100px_100px] gap-4 items-center">
        <Skeleton variant="rectangular" className="w-4 h-4" />
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="text" className="w-16 h-4" />
        <Skeleton variant="text" className="w-14 h-4" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-gray-800 last:border-b-0 px-4 py-4"
        >
          {/* Mobile layout */}
          <div className="md:hidden space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton variant="circular" className="w-4 h-4 flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-5 w-full" />
                <Skeleton variant="text" className="h-4 w-3/4" />
              </div>
            </div>
            <div className="flex gap-2 pl-7">
              <Skeleton variant="rectangular" className="w-16 h-6" />
              <Skeleton variant="rectangular" className="w-20 h-6" />
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:grid md:grid-cols-[40px_1fr_120px_100px_100px] gap-4 items-center">
            <Skeleton variant="circular" className="w-4 h-4" />
            <div className="space-y-1">
              <Skeleton variant="text" className="h-5 w-full max-w-md" />
              <Skeleton variant="text" className="h-4 w-2/3 max-w-sm" />
            </div>
            <Skeleton variant="rectangular" className="w-20 h-6" />
            <Skeleton variant="rectangular" className="w-12 h-6" />
            <Skeleton variant="rectangular" className="w-16 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
