'use client';

import { clsx } from 'clsx';
import { useState, useRef, useEffect } from 'react';

import type { BacklogStatus } from '@/types/backlog';

const STATUS_COLORS: Record<BacklogStatus, { text: string; bg: string }> = {
  new: { text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  approved: { text: 'text-green-400', bg: 'bg-green-500/10' },
  in_progress: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  completed: { text: 'text-green-400', bg: 'bg-green-500/10' },
  deferred: { text: 'text-gray-400', bg: 'bg-gray-500/10' },
  rejected: { text: 'text-red-400', bg: 'bg-red-500/10' },
};

const STATUS_LABELS: Record<BacklogStatus, string> = {
  new: 'New',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
  rejected: 'Rejected',
};

const STATUS_DESCRIPTIONS: Record<BacklogStatus, string> = {
  new: 'Just discovered, needs your review',
  approved: 'Ready to be implemented',
  in_progress: 'Currently being worked on',
  completed: 'Done! Check the PR.',
  deferred: 'Saved for later',
  rejected: "Won't implement",
};

interface StatusBadgeProps {
  status: BacklogStatus;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  showTooltip = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>(
    'top',
  );
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isTooltipVisible && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceNeeded = 60; // Approximate tooltip height

      if (spaceAbove < spaceNeeded) {
        setTooltipPosition('bottom');
      } else {
        setTooltipPosition('top');
      }
    }
  }, [isTooltipVisible]);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span
      ref={badgeRef}
      className={clsx(
        'relative inline-flex items-center font-medium border border-current/20',
        STATUS_COLORS[status].bg,
        STATUS_COLORS[status].text,
        sizeClasses[size],
        showTooltip && 'cursor-help',
        className,
      )}
      onMouseEnter={() => showTooltip && setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
      onFocus={() => showTooltip && setIsTooltipVisible(true)}
      onBlur={() => setIsTooltipVisible(false)}
      tabIndex={showTooltip ? 0 : undefined}
      role={showTooltip ? 'button' : undefined}
      aria-label={
        showTooltip
          ? `${STATUS_LABELS[status]}: ${STATUS_DESCRIPTIONS[status]}`
          : undefined
      }
    >
      {STATUS_LABELS[status]}

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <div
          className={clsx(
            'absolute z-50 left-1/2 -translate-x-1/2 w-48 px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-lg',
            tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
          role="tooltip"
        >
          <p className="text-xs font-semibold text-white mb-0.5">
            {STATUS_LABELS[status]}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {STATUS_DESCRIPTIONS[status]}
          </p>
          {/* Arrow */}
          <span
            className={clsx(
              'absolute left-1/2 -translate-x-1/2 w-0 h-0 border-4',
              tooltipPosition === 'top'
                ? 'top-full border-t-gray-700 border-x-transparent border-b-transparent'
                : 'bottom-full border-b-gray-700 border-x-transparent border-t-transparent',
            )}
          />
        </div>
      )}
    </span>
  );
}

export default StatusBadge;
