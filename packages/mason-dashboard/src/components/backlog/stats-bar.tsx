'use client';

import type { StatusCounts } from '@/types/backlog';

import type { TabStatus } from './status-tabs';

interface StatsBarProps {
  counts: StatusCounts;
  activeStatus?: TabStatus;
  onStatClick?: (status: TabStatus) => void;
}

const STAT_CONFIG: Array<{
  key: keyof StatusCounts;
  tabStatus: TabStatus;
  label: string;
  color: string;
  bgColor: string;
  activeRing: string;
}> = [
  {
    key: 'total',
    tabStatus: null,
    label: 'Total Items',
    color: 'text-white',
    bgColor: 'bg-white/5',
    activeRing: 'ring-white/50',
  },
  {
    key: 'new',
    tabStatus: 'new',
    label: 'New',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    activeRing: 'ring-cyan-400/50',
  },
  {
    key: 'approved',
    tabStatus: 'approved',
    label: 'Approved',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    activeRing: 'ring-green-400/50',
  },
  {
    key: 'in_progress',
    tabStatus: 'in_progress',
    label: 'In Progress',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    activeRing: 'ring-yellow-400/50',
  },
  {
    key: 'completed',
    tabStatus: 'completed',
    label: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    activeRing: 'ring-green-400/50',
  },
  {
    key: 'deferred',
    tabStatus: 'deferred',
    label: 'Deferred',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    activeRing: 'ring-gray-400/50',
  },
  {
    key: 'rejected',
    tabStatus: 'rejected',
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    activeRing: 'ring-red-400/50',
  },
];

export function StatsBar({ counts, activeStatus, onStatClick }: StatsBarProps) {
  return (
    <div className="border-b border-gray-800/50 bg-black/20">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-7 gap-4">
          {STAT_CONFIG.map(
            ({ key, tabStatus, label, color, bgColor, activeRing }) => {
              const isActive = activeStatus === tabStatus;
              const isClickable = onStatClick !== undefined;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onStatClick?.(tabStatus)}
                  disabled={!isClickable}
                  className={`${bgColor} border p-4 transition-all text-left ${
                    isClickable
                      ? 'cursor-pointer hover:border-gray-600 hover:bg-white/5'
                      : ''
                  } ${
                    isActive
                      ? `border-gray-600 ring-2 ${activeRing}`
                      : 'border-gray-800/50'
                  }`}
                >
                  <div className={`text-3xl font-bold ${color} mb-1`}>
                    {counts[key]}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {label}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
