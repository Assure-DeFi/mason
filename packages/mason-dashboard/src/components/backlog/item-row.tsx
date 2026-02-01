'use client';

import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { FileText, Check, X, Clock } from 'lucide-react';
import { memo, useState } from 'react';

import type { ColumnWidths } from '@/hooks/useColumnResize';
import { getComplexityValue } from '@/types/backlog';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';

import { BangerBadge } from './BangerBadge';
import { CategoryBadge } from './category-badge';
import { FeatureBadge } from './FeatureBadge';
import { PriorityDots } from './priority-dots';
import { QuickWinBadge } from './QuickWinBadge';

type TabStatus = BacklogStatus | 'filtered' | null;

const STATUS_COLORS: Record<BacklogStatus, { text: string; bg: string }> = {
  new: { text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  approved: { text: 'text-green-400', bg: 'bg-green-500/10' },
  in_progress: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  completed: { text: 'text-green-400', bg: 'bg-green-500/10' },
  deferred: { text: 'text-gray-400', bg: 'bg-gray-500/10' },
  rejected: { text: 'text-red-400', bg: 'bg-red-500/10' },
};

const STATUS_LABELS: Record<BacklogStatus, string> = {
  new: 'New',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
  rejected: 'Rejected',
};

/**
 * Get the approval age color based on hours since approval.
 * - Green (<24h): Fresh approval
 * - Yellow (1-2 days): Getting stale
 * - Orange (>2 days): Needs attention
 */
function getApprovalAgeColor(hoursAgo: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (hoursAgo < 24) {
    return {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
    };
  }
  if (hoursAgo < 48) {
    return {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
    };
  }
  return {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  };
}

interface ItemRowProps {
  item: BacklogItem;
  selected: boolean;
  onSelect: (id: string, event?: React.MouseEvent) => void;
  onClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  columnWidths: ColumnWidths;
  activeStatus?: TabStatus;
}

function ItemRowComponent({
  item,
  selected,
  onSelect,
  onClick,
  onPrdClick,
  onApprove,
  onReject,
  columnWidths,
  activeStatus,
}: ItemRowProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApprove || isApproving) {
      return;
    }
    setIsApproving(true);
    try {
      await Promise.resolve(onApprove(item.id));
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReject || isRejecting) {
      return;
    }
    setIsRejecting(true);
    try {
      await Promise.resolve(onReject(item.id));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract shiftKey from the native event for range selection
    // Create a partial MouseEvent with the shiftKey property
    const syntheticEvent = {
      shiftKey:
        e.nativeEvent instanceof MouseEvent ? e.nativeEvent.shiftKey : false,
    } as React.MouseEvent;
    onSelect(item.id, syntheticEvent);
  };

  return (
    <tr
      tabIndex={0}
      className="border-b border-gray-800/30 hover:bg-white/5 cursor-pointer transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-inset focus-visible:bg-white/5"
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
    >
      {/* Checkbox */}
      <td
        className="py-3 px-3"
        style={{ width: `${columnWidths.checkbox}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${item.title}`}
          className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer"
        />
      </td>

      {/* Title */}
      <td className="py-3 px-3" style={{ width: `${columnWidths.title}px` }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white group-hover:text-gold transition-colors truncate">
              {item.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate">
              {item.problem.substring(0, 80)}...
            </div>
          </div>
          <QuickWinBadge
            impactScore={item.impact_score}
            effortScore={item.effort_score}
          />
          {item.source === 'autopilot' && (
            <span className="ml-1 rounded bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-400 border border-purple-700">
              Autopilot
            </span>
          )}
          {item.is_new_feature && !item.is_banger_idea && <FeatureBadge />}
          {(item.is_banger_idea || item.tags?.includes('banger')) && (
            <BangerBadge />
          )}
        </div>
      </td>

      {/* Category (was Type) */}
      <td className="py-3 px-3" style={{ width: `${columnWidths.type}px` }}>
        <CategoryBadge type={item.type} isNewFeature={item.is_new_feature} />
      </td>

      {/* Priority */}
      <td className="py-3 px-3" style={{ width: `${columnWidths.priority}px` }}>
        <div className="flex flex-col gap-1">
          <PriorityDots value={item.impact_score} variant="priority" />
          <span className="text-xs text-gray-500 font-medium">
            {item.impact_score}/10
          </span>
        </div>
      </td>

      {/* Complexity */}
      <td
        className="py-3 px-3"
        style={{ width: `${columnWidths.complexity}px` }}
      >
        <div className="flex flex-col gap-1">
          <PriorityDots
            value={getComplexityValue(item.complexity) * 2}
            max={5}
            variant="complexity"
          />
          <span className="text-xs text-gray-500 font-medium">
            {item.complexity}/5
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-3" style={{ width: `${columnWidths.status}px` }}>
        <span
          className={`px-2 py-1 text-xs font-medium ${STATUS_COLORS[item.status].bg} ${STATUS_COLORS[item.status].text} border border-current/20`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </td>

      {/* PRD Status */}
      <td
        className="py-3 px-3 text-center"
        style={{ width: `${columnWidths.prd}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.prd_content ? (
          <button
            onClick={() => onPrdClick?.(item)}
            className="inline-flex items-center justify-center hover:scale-110 transition-transform"
            title="View PRD"
            aria-label={`View PRD for ${item.title}`}
          >
            <FileText className="w-5 h-5 text-gold fill-gold" />
          </button>
        ) : (
          <div
            className="inline-flex items-center justify-center"
            title="No PRD (legacy item)"
            aria-label="No PRD available"
          >
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </td>

      {/* Last edited / Approval age */}
      <td
        className="py-3 px-3 text-xs whitespace-nowrap"
        style={{ width: `${columnWidths.updated}px` }}
      >
        {activeStatus === 'approved' && item.status === 'approved' ? (
          (() => {
            const hoursAgo = differenceInHours(
              new Date(),
              new Date(item.updated_at),
            );
            const colors = getApprovalAgeColor(hoursAgo);
            return (
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${colors.text}`} />
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} rounded`}
                  title={`Approved ${formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}`}
                >
                  {formatDistanceToNow(new Date(item.updated_at), {
                    addSuffix: false,
                  })}
                </span>
              </div>
            );
          })()
        ) : (
          <span className="text-gray-500">
            {formatDistanceToNow(new Date(item.updated_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </td>

      {/* Quick Actions - visible on mobile, hover on desktop */}
      <td
        className="py-3 px-2"
        style={{ width: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.status === 'new' && (
          <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="p-2 text-green-400 hover:bg-green-500/10 rounded active:scale-95 transition-all touch-feedback disabled:opacity-50"
              aria-label="Approve"
              title="Approve"
            >
              <Check
                className={`w-4 h-4 ${isApproving ? 'animate-pulse' : ''}`}
              />
            </button>
            <button
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded active:scale-95 transition-all touch-feedback disabled:opacity-50"
              aria-label="Reject"
              title="Reject"
            >
              <X className={`w-4 h-4 ${isRejecting ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// Memoize to prevent re-renders when parent state changes but item props are the same
export const ItemRow = memo(ItemRowComponent);
