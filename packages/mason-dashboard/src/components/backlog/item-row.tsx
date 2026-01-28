'use client';

import type { BacklogItem } from '@/types/backlog';
import { getComplexityValue } from '@/types/backlog';
import { formatDistanceToNow } from 'date-fns';
import { TypeBadge } from './type-badge';
import { PriorityDots } from './priority-dots';
import { QuickWinBadge } from './QuickWinBadge';

interface ItemRowProps {
  item: BacklogItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (item: BacklogItem) => void;
}

export function ItemRow({ item, selected, onSelect, onClick }: ItemRowProps) {
  return (
    <tr
      className="border-b border-gray-800/30 hover:bg-white/5 cursor-pointer transition-all group"
      onClick={() => onClick(item)}
    >
      {/* Checkbox */}
      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer"
        />
      </td>

      {/* Title */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium text-white group-hover:text-gold transition-colors max-w-md truncate">
              {item.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
              {item.problem.substring(0, 80)}...
            </div>
          </div>
          <QuickWinBadge
            impactScore={item.impact_score}
            effortScore={item.effort_score}
          />
        </div>
      </td>

      {/* Type */}
      <td className="py-4 px-6">
        <TypeBadge type={item.type} />
      </td>

      {/* Priority */}
      <td className="py-4 px-6">
        <div className="flex flex-col gap-1">
          <PriorityDots value={item.impact_score} variant="priority" />
          <span className="text-xs text-gray-500 font-medium">
            {item.impact_score}/10
          </span>
        </div>
      </td>

      {/* Complexity */}
      <td className="py-4 px-6">
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

      {/* Area */}
      <td className="py-4 px-6">
        <span className="px-2 py-1 text-xs font-medium bg-black/30 text-gray-400 border border-gray-700">
          {item.area === 'frontend' ? 'Frontend' : 'Backend'}
        </span>
      </td>

      {/* Last edited */}
      <td className="py-4 px-6 text-gray-500 text-xs">
        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
      </td>
    </tr>
  );
}
