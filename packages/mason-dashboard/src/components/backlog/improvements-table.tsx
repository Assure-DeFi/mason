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
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0"
              />
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Title
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Type
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Priority
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Complexity
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Area
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-400">
              Last edited
            </th>
          </tr>
        </thead>
        <tbody>
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
        <div className="text-center py-12 text-gray-500">
          No items found. Run{' '}
          <code className="bg-black/50 px-2 py-0.5 rounded">/pm-review</code> to
          analyze your codebase.
        </div>
      )}
    </div>
  );
}
