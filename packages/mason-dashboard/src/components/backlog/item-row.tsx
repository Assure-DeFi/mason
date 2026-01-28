'use client';

import type { BacklogItem } from '@/types/backlog';
import { formatDistanceToNow } from 'date-fns';
import { TypeBadge } from './type-badge';
import { PriorityDots } from './priority-dots';

interface ItemRowProps {
  item: BacklogItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (item: BacklogItem) => void;
}

export function ItemRow({ item, selected, onSelect, onClick }: ItemRowProps) {
  return (
    <tr
      className="border-b border-gray-800/50 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => onClick(item)}
    >
      {/* Checkbox */}
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0"
        />
      </td>

      {/* Title */}
      <td className="py-3 px-4">
        <div className="max-w-md truncate font-medium">{item.title}</div>
      </td>

      {/* Type */}
      <td className="py-3 px-4">
        <TypeBadge type={item.type} />
      </td>

      {/* Priority */}
      <td className="py-3 px-4">
        <PriorityDots value={item.impact_score} variant="priority" />
      </td>

      {/* Complexity */}
      <td className="py-3 px-4">
        <PriorityDots
          value={item.complexity * 2}
          max={5}
          variant="complexity"
        />
      </td>

      {/* Area */}
      <td className="py-3 px-4">
        <span className="text-xs text-gray-400 uppercase">
          {item.area === 'frontend' ? 'FE' : 'BE'}
        </span>
      </td>

      {/* Last edited */}
      <td className="py-3 px-4 text-gray-500 text-xs">
        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: false })}
      </td>
    </tr>
  );
}
