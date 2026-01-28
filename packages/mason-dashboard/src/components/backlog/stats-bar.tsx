'use client';

import type { StatusCounts } from '@/types/backlog';

interface StatsBarProps {
  counts: StatusCounts;
}

const STAT_CONFIG = [
  { key: 'total', label: 'Total', color: 'text-white' },
  { key: 'new', label: 'New', color: 'text-cyan-400' },
  { key: 'approved', label: 'Approved', color: 'text-green-400' },
  { key: 'in_progress', label: 'In Progress', color: 'text-yellow-400' },
  { key: 'completed', label: 'Completed', color: 'text-green-400' },
  { key: 'deferred', label: 'Deferred', color: 'text-gray-400' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-400' },
] as const;

export function StatsBar({ counts }: StatsBarProps) {
  return (
    <div className="flex items-center gap-8 px-6 py-4 bg-black/20 border-b border-gray-800">
      {STAT_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="text-center">
          <div className={`text-2xl font-bold ${color}`}>
            {counts[key as keyof StatusCounts]}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
