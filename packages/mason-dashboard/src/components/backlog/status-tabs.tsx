'use client';

import { clsx } from 'clsx';
import { EyeOff } from 'lucide-react';

import type { BacklogStatus } from '@/types/backlog';

// Extended tab type that includes 'filtered' special tab
export type TabStatus = BacklogStatus | 'filtered' | null;

interface StatusTabsProps {
  activeStatus: TabStatus;
  onStatusChange: (status: TabStatus) => void;
  onExecuteAll?: () => void;
  approvedCount: number;
  filteredCount?: number;
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

export function StatusTabs({
  activeStatus,
  onStatusChange,
  onExecuteAll,
  approvedCount,
  filteredCount = 0,
}: StatusTabsProps) {
  return (
    <div
      className="flex items-center gap-2 px-8 py-4"
      role="tablist"
      aria-label="Backlog status filters"
    >
      {TABS.map(({ status, label }) => {
        const isFiltered = status === 'filtered';

        return (
          <button
            key={status ?? 'all'}
            onClick={() => onStatusChange(status)}
            role="tab"
            aria-selected={activeStatus === status}
            className={clsx(
              'px-5 py-2.5 text-sm font-semibold transition-all relative flex items-center gap-2',
              activeStatus === status
                ? 'text-gold'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
              isFiltered && 'ml-4 border-l border-gray-800 pl-6',
            )}
          >
            {isFiltered && <EyeOff className="w-3.5 h-3.5" />}
            {label}
            {isFiltered && filteredCount > 0 && (
              <span className="ml-1 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5">
                {filteredCount}
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
