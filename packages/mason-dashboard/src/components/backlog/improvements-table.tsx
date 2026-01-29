'use client';

import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
} from 'lucide-react';

import {
  useColumnResize,
  type ResizableColumnId,
} from '@/hooks/useColumnResize';
import type { BacklogItem, SortField, SortDirection } from '@/types/backlog';

import { ItemRow } from './item-row';
import { ResizeHandle } from './resize-handle';

interface SortableHeaderProps {
  label: string;
  field: SortField;
  columnId: ResizableColumnId;
  width: number;
  currentSort: { field: SortField; direction: SortDirection } | null;
  onSort: (field: SortField) => void;
  onResizeStart: (columnId: ResizableColumnId, event: React.MouseEvent) => void;
  isResizing: boolean;
  align?: 'left' | 'center';
}

function SortableHeader({
  label,
  field,
  columnId,
  width,
  currentSort,
  onSort,
  onResizeStart,
  isResizing,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = currentSort?.field === field;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className={`relative py-3 px-3 font-semibold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors select-none ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
      style={{ width: `${width}px` }}
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
      <ResizeHandle
        columnId={columnId}
        onResizeStart={onResizeStart}
        isResizing={isResizing}
      />
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
  const {
    columnWidths,
    resizingColumn,
    handleResizeStart,
    resetToDefaults,
    hasCustomWidths,
  } = useColumnResize();

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < items.length;

  return (
    <div>
      {/* Reset button - only shows when columns are customized */}
      {hasCustomWidths && (
        <div className="flex justify-end mb-2">
          <button
            onClick={resetToDefaults}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-700 hover:border-gold hover:text-gold transition-all duration-200 flex items-center gap-1.5"
            title="Reset column widths to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Columns</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-gray-800/50 bg-black/10">
              {/* Checkbox - Fixed width */}
              <th
                className="text-left py-3 px-3"
                style={{ width: `${columnWidths.checkbox}px` }}
              >
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

              {/* Resizable columns */}
              <SortableHeader
                label="Title"
                field="title"
                columnId="title"
                width={columnWidths.title}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'title'}
              />
              <SortableHeader
                label="Type"
                field="type"
                columnId="type"
                width={columnWidths.type}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'type'}
              />
              <SortableHeader
                label="Priority"
                field="priority_score"
                columnId="priority"
                width={columnWidths.priority}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'priority'}
              />
              <SortableHeader
                label="Complexity"
                field="complexity"
                columnId="complexity"
                width={columnWidths.complexity}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'complexity'}
              />
              <SortableHeader
                label="Area"
                field="area"
                columnId="area"
                width={columnWidths.area}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'area'}
              />
              <SortableHeader
                label="Status"
                field="status"
                columnId="status"
                width={columnWidths.status}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'status'}
              />

              {/* PRD - Fixed width */}
              <th
                className="text-center py-3 px-3 font-semibold text-gray-400 uppercase tracking-wider text-xs"
                style={{ width: `${columnWidths.prd}px` }}
              >
                PRD
              </th>

              <SortableHeader
                label="Updated"
                field="updated_at"
                columnId="updated"
                width={columnWidths.updated}
                currentSort={sort}
                onSort={onSortChange}
                onResizeStart={handleResizeStart}
                isResizing={resizingColumn === 'updated'}
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
                columnWidths={columnWidths}
              />
            ))}
          </tbody>
        </table>
      </div>

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
