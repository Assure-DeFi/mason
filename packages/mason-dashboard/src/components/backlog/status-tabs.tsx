'use client';

import { clsx } from 'clsx';
import { Clock, EyeOff } from 'lucide-react';

import type { BacklogStatus, StatusCounts } from '@/types/backlog';

// Extended tab type that includes 'filtered' special tab
export type TabStatus = BacklogStatus | 'filtered' | null;

interface StatusTabsProps {
  activeStatus: TabStatus;
  onStatusChange: (status: TabStatus) => void;
  onExecuteAll?: () => void;
  approvedCount: number;
  filteredCount?: number;
  /** Item counts per status for badges */
  counts?: StatusCounts;
  /** Number of approved items that are stale (approved > 2 days ago) */
  staleApprovedCount?: number;
}

const TABS: Array<{ status: TabStatus; label: string }> = [
  { status: null, label: 'All Items' },
  { status: 'new', label: 'New' },
  { status: 'approved', label: 'Approved' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'deferred', label: 'Deferred' },
  { status: 'rejected', label: 'Rejected' },
  { status: 'filtered', label: 'Filtered' },
];

// Helper to get count for a status
function getCountForStatus(
  status: TabStatus,
  counts?: StatusCounts,
  filteredCount?: number,
): number | undefined {
  if (!counts && status !== 'filtered') {
    return undefined;
  }
  if (status === null) {
    return counts?.total;
  }
  if (status === 'filtered') {
    return filteredCount;
  }
  return counts?.[status];
}

export function StatusTabs({
  activeStatus,
  onStatusChange,
  onExecuteAll,
  approvedCount,
  filteredCount = 0,
  counts,
  staleApprovedCount = 0,
}: StatusTabsProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 sm:px-8 py-4 overflow-x-auto scroll-smooth scrollbar-hide"
      role="tablist"
      aria-label="Backlog status filters"
    >
      {TABS.map(({ status, label }) => {
        const isFiltered = status === 'filtered';
        const count = getCountForStatus(status, counts, filteredCount);
        const showCount = count !== undefined && count > 0;

        // New tab with high count (> 5) gets gold pulse animation
        const isNewWithHighCount =
          status === 'new' && count !== undefined && count > 5;
        // Approved tab shows stale indicator if items approved > 2 days ago
        const hasStaleItems = status === 'approved' && staleApprovedCount > 0;

        return (
          <button
            key={status ?? 'all'}
            onClick={() => onStatusChange(status)}
            role="tab"
            aria-selected={activeStatus === status}
            className={clsx(
              'px-5 py-3 text-sm font-semibold transition-all relative flex items-center gap-2',
              activeStatus === status
                ? 'text-gold'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
              isFiltered && 'ml-4 border-l border-gray-800 pl-6',
            )}
          >
            {isFiltered && <EyeOff className="w-3.5 h-3.5" />}
            {label}
            {/* Count badge with urgency indicators */}
            {showCount && (
              <span
                className={clsx(
                  'ml-1 text-xs px-1.5 py-0.5 min-w-[20px] text-center',
                  isNewWithHighCount
                    ? 'bg-gold/30 text-gold animate-pulse-gold'
                    : activeStatus === status
                      ? 'bg-gold/20 text-gold'
                      : 'bg-gray-700 text-gray-300',
                )}
                title={
                  isNewWithHighCount
                    ? `${count} items awaiting review`
                    : undefined
                }
              >
                {count}
              </span>
            )}
            {/* Separate stale indicator for Approved tab */}
            {hasStaleItems && (
              <span
                className="flex items-center gap-1 ml-1 text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400"
                title={`${staleApprovedCount} item${staleApprovedCount !== 1 ? 's' : ''} approved > 2 days ago`}
              >
                <Clock className="w-3 h-3" />
                {staleApprovedCount}
              </span>
            )}
            {activeStatus === status && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        );
      })}

      {activeStatus === 'approved' && approvedCount > 0 && onExecuteAll && (
        <button
          onClick={onExecuteAll}
          className="ml-auto flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 text-sm hover:bg-white/5 hover:border-gray-600 transition-all font-medium"
          title="Copy command to clipboard"
        >
          Copy CLI Command
        </button>
      )}
    </div>
  );
}
