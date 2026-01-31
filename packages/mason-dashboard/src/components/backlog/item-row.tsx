'use client';

import { formatDistanceToNow } from 'date-fns';
import { FileText } from 'lucide-react';

import type { ColumnWidths } from '@/hooks/useColumnResize';
import { getComplexityValue } from '@/types/backlog';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';

import { BangerBadge } from './BangerBadge';
import { CategoryBadge } from './category-badge';
import { PriorityDots } from './priority-dots';
import { QuickWinBadge } from './QuickWinBadge';

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

interface ItemRowProps {
  item: BacklogItem;
  selected: boolean;
  onSelect: (id: string, event?: React.MouseEvent) => void;
  onClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  columnWidths: ColumnWidths;
}

export function ItemRow({
  item,
  selected,
  onSelect,
  onClick,
  onPrdClick,
  columnWidths,
}: ItemRowProps) {
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
      className="border-b border-gray-800/30 hover:bg-white/5 cursor-pointer transition-all group"
      onClick={() => onClick(item)}
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

      {/* Last edited */}
      <td
        className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap"
        style={{ width: `${columnWidths.updated}px` }}
      >
        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
      </td>
    </tr>
  );
}
