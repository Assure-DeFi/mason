'use client';

import { clsx } from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Check,
  Clock,
  Circle,
  FileText,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { getMasonConfig } from '@/lib/supabase/user-client';
import type { BacklogStatus, ItemEvent, ItemEventType } from '@/types/backlog';

interface TimelineEvent {
  status?: BacklogStatus;
  eventType?: ItemEventType;
  timestamp: string;
  label: string;
  oldValue?: string | null;
  newValue?: string | null;
  notes?: string | null;
  isInferred?: boolean;
}

interface ItemTimelineProps {
  /** Item ID for fetching events */
  itemId: string;
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

const EVENT_TYPE_CONFIG: Record<
  ItemEventType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  status_changed: {
    label: 'Status Changed',
    icon: RefreshCw,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  prd_generated: {
    label: 'PRD Generated',
    icon: FileText,
    color: 'text-gold',
    bgColor: 'bg-gold/20',
  },
  branch_created: {
    label: 'Branch Created',
    icon: GitBranch,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  pr_created: {
    label: 'PR Created',
    icon: GitPullRequest,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  note_added: {
    label: 'Note Added',
    icon: MessageSquare,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

function getStatusIndex(status: BacklogStatus): number {
  const index = STATUS_ORDER.indexOf(status);
  return index >= 0 ? index : -1;
}

function getInferredEvents(
  createdAt: string,
  updatedAt: string,
  currentStatus: BacklogStatus,
  prdGeneratedAt?: string,
): TimelineEvent[] {
  const currentIndex = getStatusIndex(currentStatus);
  const events: TimelineEvent[] = [];

  events.push({
    status: 'new',
    timestamp: createdAt,
    label: 'Created',
    isInferred: true,
  });

  if (
    currentIndex > 0 ||
    currentStatus === 'deferred' ||
    currentStatus === 'rejected'
  ) {
    if (currentStatus === 'deferred' || currentStatus === 'rejected') {
      events.push({
        status: currentStatus,
        timestamp: updatedAt,
        label: STATUS_CONFIG[currentStatus].label,
        isInferred: true,
      });
    } else {
      for (let i = 1; i <= currentIndex; i++) {
        const status = STATUS_ORDER[i];
        events.push({
          status,
          timestamp: i === currentIndex ? updatedAt : createdAt,
          label: STATUS_CONFIG[status].label,
          isInferred: true,
        });
      }
    }
  }

  if (prdGeneratedAt) {
    events.push({
      eventType: 'prd_generated',
      timestamp: prdGeneratedAt,
      label: 'PRD Generated',
      isInferred: true,
    });
  }

  return events;
}

function convertToTimelineEvents(dbEvents: ItemEvent[]): TimelineEvent[] {
  return dbEvents.map((event) => {
    if (event.event_type === 'status_changed' && event.new_value) {
      const newStatus = event.new_value as BacklogStatus;
      return {
        status: newStatus,
        eventType: event.event_type,
        timestamp: event.created_at,
        label: `${STATUS_CONFIG[newStatus]?.label || event.new_value}`,
        oldValue: event.old_value,
        newValue: event.new_value,
        notes: event.notes,
        isInferred: false,
      };
    }

    const config = EVENT_TYPE_CONFIG[event.event_type];
    return {
      eventType: event.event_type,
      timestamp: event.created_at,
      label: config?.label || event.event_type,
      oldValue: event.old_value,
      newValue: event.new_value,
      notes: event.notes,
      isInferred: false,
    };
  });
}

export function ItemTimeline({
  itemId,
  createdAt,
  updatedAt,
  currentStatus,
  prdGeneratedAt,
}: ItemTimelineProps) {
  const [dbEvents, setDbEvents] = useState<ItemEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      const config = getMasonConfig();
      if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
        setIsLoading(false);
        setError('Database not configured');
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/backlog/${itemId}/events`, {
          headers: {
            'x-supabase-url': config.supabaseUrl,
            'x-supabase-anon-key': config.supabaseAnonKey,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDbEvents(data.data?.events || []);
          setError(null);
        } else {
          setError('Failed to load events');
        }
      } catch {
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchEvents();
  }, [itemId]);

  const hasRealEvents = dbEvents.length > 0;
  const events = hasRealEvents
    ? convertToTimelineEvents(dbEvents)
    : getInferredEvents(createdAt, updatedAt, currentStatus, prdGeneratedAt);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Status History
        </h4>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Status History
        </h4>
        {!hasRealEvents && !error && (
          <span className="text-xs text-gray-600 italic">Inferred</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-amber-500 text-xs mb-2">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-700" />

        <div className="space-y-4">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;
            const isCurrent = event.status === currentStatus;

            let config: {
              label: string;
              color: string;
              bgColor: string;
              icon?: React.ElementType;
            };
            let Icon: React.ElementType = Check;

            if (event.status) {
              config = STATUS_CONFIG[event.status];
            } else if (event.eventType) {
              config = EVENT_TYPE_CONFIG[event.eventType];
              Icon = EVENT_TYPE_CONFIG[event.eventType].icon;
            } else {
              config = {
                label: event.label,
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/20',
              };
            }

            return (
              <div
                key={`${event.eventType || event.status}-${index}`}
                className="flex items-start gap-3 relative"
              >
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
                    <Icon className="w-3 h-3" />
                  )}
                </div>

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
                  {event.oldValue &&
                    event.newValue &&
                    event.eventType === 'status_changed' && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {event.oldValue} → {event.newValue}
                      </div>
                    )}
                  {event.notes && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      &ldquo;{event.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
