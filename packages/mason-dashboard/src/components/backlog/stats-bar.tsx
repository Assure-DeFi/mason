'use client';

import type { StatusCounts } from '@/types/backlog';

interface StatsBarProps {
  counts: StatusCounts;
}

const STAT_CONFIG = [
  {
    key: 'total',
    label: 'Total Items',
    color: 'text-white',
    bgColor: 'bg-white/5',
  },
  {
    key: 'new',
    label: 'New',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    key: 'approved',
    label: 'Approved',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    key: 'completed',
    label: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'deferred',
    label: 'Deferred',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
] as const;

export function StatsBar({ counts }: StatsBarProps) {
  return (
    <div className="border-b border-gray-800/50 bg-black/20">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-7 gap-4">
          {STAT_CONFIG.map(({ key, label, color, bgColor }) => (
            <div
              key={key}
              className={`${bgColor} border border-gray-800/50 p-4 transition-all hover:border-gray-700`}
            >
              <div className={`text-3xl font-bold ${color} mb-1`}>
                {counts[key as keyof StatusCounts]}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
