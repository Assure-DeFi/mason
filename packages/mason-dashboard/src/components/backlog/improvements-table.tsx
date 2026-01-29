'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

import type { BacklogItem, SortField, SortDirection } from '@/types/backlog';

import { ItemRow } from './item-row';

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection } | null;
  onSort: (field: SortField) => void;
  align?: 'left' | 'center';
}

function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentSort?.field === field;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className={`py-3 px-3 font-semibold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors select-none ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
      onClick={() => onSort(field)}
    >
      <div
        className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}
      >
        <span>{label}</span>
        <span className="inline-flex">
          {isActive ? (
            direction === 'asc' ? (
              <ChevronUp className="w-4 h-4 text-gold" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gold" />
            )
          ) : (
            <ChevronsUpDown className="w-4 h-4 text-gray-600" />
          )}
        </span>
      </div>
    </th>
  );
}

interface ImprovementsTableProps {
  items: BacklogItem[];
  selectedIds: string[];
  onSelectItem: (id: string, event?: React.MouseEvent) => void;
  onSelectAll: () => void;
  onItemClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  sort: { field: SortField; direction: SortDirection } | null;
  onSortChange: (field: SortField) => void;
}

export function ImprovementsTable({
  items,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onItemClick,
  onPrdClick,
  sort,
  onSortChange,
}: ImprovementsTableProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <div>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-gray-800/50 bg-black/10">
            <th className="text-left py-3 px-3 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-600 bg-black/50 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer"
              />
            </th>
            <SortableHeader
              label="Title"
              field="title"
              currentSort={sort}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Type"
              field="type"
              currentSort={sort}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Priority"
              field="priority_score"
              currentSort={sort}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Complexity"
              field="complexity"
              currentSort={sort}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Area"
              field="area"
              currentSort={sort}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Status"
              field="status"
              currentSort={sort}
              onSort={onSortChange}
            />
            <th className="text-center py-3 px-3 font-semibold text-gray-400 uppercase tracking-wider text-xs w-14">
              PRD
            </th>
            <SortableHeader
              label="Updated"
              field="updated_at"
              currentSort={sort}
              onSort={onSortChange}
            />
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
              onPrdClick={onPrdClick}
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
