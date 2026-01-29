'use client';

import { clsx } from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import { Check, Clock, Circle } from 'lucide-react';

import type { BacklogStatus } from '@/types/backlog';

interface TimelineEvent {
  status: BacklogStatus;
  timestamp: string;
  label: string;
}

interface ItemTimelineProps {
  /** Item creation timestamp */
  createdAt: string;
  /** Item last updated timestamp */
  updatedAt: string;
  /** Current status */
  currentStatus: BacklogStatus;
  /** Optional PRD generated timestamp */
  prdGeneratedAt?: string;
}

const STATUS_ORDER: BacklogStatus[] = [
  'new',
  'approved',
  'in_progress',
  'completed',
];

const STATUS_CONFIG: Record<
  BacklogStatus,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: 'Created',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  deferred: {
    label: 'Deferred',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
};

function getStatusIndex(status: BacklogStatus): number {
  const index = STATUS_ORDER.indexOf(status);
  return index >= 0 ? index : -1;
}

export function ItemTimeline({
  createdAt,
  updatedAt,
  currentStatus,
  prdGeneratedAt,
}: ItemTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus);

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Always show created
  events.push({
    status: 'new',
    timestamp: createdAt,
    label: 'Created',
  });

  // If we're past "new" status, show progression
  if (
    currentIndex > 0 ||
    currentStatus === 'deferred' ||
    currentStatus === 'rejected'
  ) {
    // For deferred/rejected, just show the final state
    if (currentStatus === 'deferred' || currentStatus === 'rejected') {
      events.push({
        status: currentStatus,
        timestamp: updatedAt,
        label: STATUS_CONFIG[currentStatus].label,
      });
    } else {
      // Show progression through statuses
      for (let i = 1; i <= currentIndex; i++) {
        const status = STATUS_ORDER[i];
        events.push({
          status,
          timestamp: i === currentIndex ? updatedAt : createdAt, // Only last one has real timestamp
          label: STATUS_CONFIG[status].label,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Status History
      </h4>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-700" />

        {/* Events */}
        <div className="space-y-4">
          {events.map((event, index) => {
            const config = STATUS_CONFIG[event.status];
            const isLast = index === events.length - 1;
            const isCurrent = event.status === currentStatus;

            return (
              <div
                key={`${event.status}-${index}`}
                className="flex items-start gap-3 relative"
              >
                {/* Status dot */}
                <div
                  className={clsx(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10',
                    isCurrent ? config.bgColor : 'bg-gray-800',
                    isCurrent && 'ring-2 ring-offset-2 ring-offset-navy',
                    config.color.replace('text-', 'ring-'),
                  )}
                >
                  {isLast && isCurrent ? (
                    <Circle className="w-3 h-3" fill="currentColor" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={clsx('font-medium text-sm', config.color)}>
                      {event.label}
                    </span>
                    <span
                      className="text-xs text-gray-500"
                      title={format(new Date(event.timestamp), 'PPpp')}
                    >
                      {formatDistanceToNow(new Date(event.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* PRD Generated event (if applicable) */}
          {prdGeneratedAt && (
            <div className="flex items-start gap-3 relative">
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10 bg-gold/20">
                <Check className="w-3 h-3 text-gold" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gold">
                    PRD Generated
                  </span>
                  <span
                    className="text-xs text-gray-500"
                    title={format(new Date(prdGeneratedAt), 'PPpp')}
                  >
                    {formatDistanceToNow(new Date(prdGeneratedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current status indicator */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400">
          Last updated{' '}
          {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default ItemTimeline;
