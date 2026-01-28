'use client';

import type { BacklogStatus } from '@/types/backlog';
import { clsx } from 'clsx';

interface StatusTabsProps {
  activeStatus: BacklogStatus | null;
  onStatusChange: (status: BacklogStatus | null) => void;
  onExecuteAll?: () => void;
  approvedCount: number;
}

const TABS: Array<{ status: BacklogStatus | null; label: string }> = [
  { status: 'new', label: 'New' },
  { status: 'approved', label: 'Approved' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'deferred', label: 'Deferred' },
  { status: 'rejected', label: 'Rejected' },
];

export function StatusTabs({
  activeStatus,
  onStatusChange,
  onExecuteAll,
  approvedCount,
}: StatusTabsProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
      <div className="flex gap-1">
        {TABS.map(({ status, label }) => (
          <button
            key={status ?? 'all'}
            onClick={() => onStatusChange(status)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeStatus === status
                ? 'bg-gold/20 text-gold border-b-2 border-gold'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeStatus === 'approved' && approvedCount > 0 && onExecuteAll && (
        <button
          onClick={onExecuteAll}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium text-sm hover:bg-gold/90 transition-colors"
        >
          Execute All ({approvedCount})
        </button>
      )}
    </div>
  );
}
