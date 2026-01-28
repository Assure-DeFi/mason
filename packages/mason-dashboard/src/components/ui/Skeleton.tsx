'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Make it a circle */
  circle?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Basic skeleton element with pulse animation
 */
export function Skeleton({
  width,
  height,
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-800',
        circle ? 'rounded-full' : 'rounded',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={clsx(
            'w-full',
            // Make last line shorter for natural look
            i === lines - 1 && lines > 1 && 'w-3/4',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for a table row
 */
export function SkeletonRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-800">
      {/* Checkbox column */}
      <td className="px-4 py-4">
        <Skeleton width={20} height={20} />
      </td>
      {/* Data columns */}
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton
            height={16}
            className={clsx(i === 0 ? 'w-48' : i === 1 ? 'w-24' : 'w-16')}
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for a full table
 */
export function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-800">
          <th className="px-4 py-3 text-left">
            <Skeleton width={20} height={20} />
          </th>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left">
              <Skeleton height={12} className="w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}

/**
 * Skeleton for a card
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-gray-800 bg-black/50 p-6',
        className,
      )}
    >
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width={48} height={48} circle />
        <div className="flex-1">
          <Skeleton height={20} className="w-32 mb-2" />
          <Skeleton height={14} className="w-24" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

/**
 * Skeleton for modal content
 */
export function SkeletonModal() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton height={24} className="w-20" />
            <Skeleton height={24} className="w-32" />
          </div>
          <Skeleton height={28} className="w-3/4 mb-3" />
          <div className="flex items-center gap-3">
            <Skeleton height={28} className="w-24" />
            <Skeleton height={28} className="w-20" />
          </div>
        </div>
        <Skeleton width={36} height={36} />
      </div>

      {/* Scores */}
      <div className="flex items-center gap-8 py-4">
        <div>
          <Skeleton height={12} className="w-16 mb-2" />
          <Skeleton height={24} className="w-12" />
        </div>
        <div>
          <Skeleton height={12} className="w-16 mb-2" />
          <Skeleton height={24} className="w-12" />
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-6">
        <div>
          <Skeleton height={12} className="w-20 mb-2" />
          <div className="p-4 bg-black/30 border border-gray-800">
            <SkeletonText lines={3} />
          </div>
        </div>
        <div>
          <Skeleton height={12} className="w-24 mb-2" />
          <div className="p-4 bg-black/30 border border-gray-800">
            <SkeletonText lines={4} />
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Skeleton height={40} className="w-32" />
        <Skeleton height={40} className="w-24" />
        <Skeleton height={40} className="w-28" />
      </div>
    </div>
  );
}

export default Skeleton;
