'use client';

import type { BacklogItem } from '@/types/backlog';
import { ItemRow } from './item-row';

interface ImprovementsTableProps {
  items: BacklogItem[];
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onItemClick: (item: BacklogItem) => void;
}

export function ImprovementsTable({
  items,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onItemClick,
}: ImprovementsTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800/50 bg-black/10">
            <th className="text-left py-4 px-6 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer"
              />
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Title
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Type
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Priority
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Complexity
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Area
            </th>
            <th className="text-left py-4 px-6 font-semibold text-gray-400 uppercase tracking-wider text-xs">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/30">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              onSelect={onSelectItem}
              onClick={onItemClick}
            />
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No items found</p>
          <p className="text-sm">
            Run{' '}
            <code className="bg-black/50 px-2 py-1 rounded text-gold font-mono">
              /pm-review
            </code>{' '}
            to analyze your codebase
          </p>
        </div>
      )}
    </div>
  );
}
