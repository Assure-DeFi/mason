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
    <div className="flex items-center gap-2 px-8 py-4">
      {TABS.map(({ status, label }) => (
        <button
          key={status ?? 'all'}
          onClick={() => onStatusChange(status)}
          className={clsx(
            'px-5 py-2.5 text-sm font-semibold transition-all relative',
            activeStatus === status
              ? 'text-gold'
              : 'text-gray-400 hover:text-white hover:bg-white/5',
          )}
        >
          {label}
          {activeStatus === status && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
          )}
        </button>
      ))}

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
