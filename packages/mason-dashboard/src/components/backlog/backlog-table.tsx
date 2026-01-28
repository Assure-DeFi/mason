'use client';

import { useState } from 'react';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

interface BacklogTableProps {
  items: BacklogItem[];
  onSelectItem: (item: BacklogItem) => void;
  onUpdateStatus: (id: string, status: BacklogStatus) => Promise<void>;
}

const STATUS_COLORS: Record<BacklogStatus, string> = {
  new: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const AREA_COLORS: Record<string, string> = {
  'frontend-ux': 'bg-purple-500/20 text-purple-300',
  'api-backend': 'bg-cyan-500/20 text-cyan-300',
  reliability: 'bg-orange-500/20 text-orange-300',
  security: 'bg-red-500/20 text-red-300',
  'code-quality': 'bg-gray-500/20 text-gray-300',
};

export function BacklogTable({
  items,
  onSelectItem,
  onUpdateStatus,
}: BacklogTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (
    item: BacklogItem,
    newStatus: BacklogStatus,
  ) => {
    setUpdatingId(item.id);
    try {
      await onUpdateStatus(item.id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Priority
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Title
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Area
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Impact
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Effort
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Status
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Created
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-800/50 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => onSelectItem(item)}
            >
              <td className="py-3 px-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold font-semibold">
                  {item.priority_score}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="max-w-xs">
                  <div className="font-medium truncate">{item.title}</div>
                  <div className="text-gray-500 text-xs truncate">
                    {item.problem.slice(0, 60)}...
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={clsx(
                    'px-2 py-1 rounded text-xs',
                    AREA_COLORS[item.area],
                  )}
                >
                  {item.area}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-green-400">{item.impact_score}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-orange-400">{item.effort_score}</span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={clsx(
                    'px-2 py-1 rounded text-xs border',
                    STATUS_COLORS[item.status],
                  )}
                >
                  {item.status}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-500 text-xs">
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                })}
              </td>
              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                {item.status === 'new' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(item, 'approved')}
                      disabled={updatingId === item.id}
                      className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                    >
                      {updatingId === item.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleStatusChange(item, 'rejected')}
                      disabled={updatingId === item.id}
                      className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 rounded disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {item.status === 'approved' && !item.prd_content && (
                  <span className="text-yellow-400 text-xs">Needs PRD</span>
                )}
                {item.status === 'approved' && item.prd_content && (
                  <span className="text-green-400 text-xs">Ready</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No backlog items found. Run{' '}
          <code className="bg-black/50 px-2 py-0.5 rounded">/pm-review</code> to
          analyze your codebase.
        </div>
      )}
    </div>
  );
}
