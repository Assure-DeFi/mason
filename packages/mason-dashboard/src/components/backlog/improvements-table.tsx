'use client';

import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
  Keyboard,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  useColumnResize,
  type ResizableColumnId,
} from '@/hooks/useColumnResize';
import type { BacklogItem, SortField, SortDirection } from '@/types/backlog';

import { ItemRow } from './item-row';
import { ResizeHandle } from './resize-handle';

const KEYBOARD_HINTS_HIDDEN_KEY = 'mason_keyboard_hints_hidden';

function KeyboardHintBar() {
  const [isHidden, setIsHidden] = useState(true);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem(KEYBOARD_HINTS_HIDDEN_KEY) === 'true';
    setIsHidden(hidden);
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const handleHide = () => {
    localStorage.setItem(KEYBOARD_HINTS_HIDDEN_KEY, 'true');
    setIsHidden(true);
  };

  if (isHidden) {
    return null;
  }

  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="mt-4 px-4 py-2 bg-black/30 border border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <Keyboard className="w-3.5 h-3.5 mr-1" />
        <span className="hidden sm:inline">Keyboard shortcuts:</span>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
            {modKey}+A
          </kbd>{' '}
          <span className="hidden sm:inline">Select all</span>
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
            {modKey}+Shift+A
          </kbd>{' '}
          <span className="hidden sm:inline">Approve</span>
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
            {modKey}+Shift+X
          </kbd>{' '}
          <span className="hidden sm:inline">Reject</span>
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
            Esc
          </kbd>{' '}
          <span className="hidden sm:inline">Clear</span>
        </span>
      </div>
      <button
        onClick={handleHide}
        className="p-1 hover:text-gray-300 transition-colors"
        title="Hide keyboard hints"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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

type TabStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'rejected'
  | 'filtered'
  | null;

interface ImprovementsTableProps {
  items: BacklogItem[];
  selectedIds: string[];
  onSelectItem: (id: string, event?: React.MouseEvent) => void;
  onSelectAll: () => void;
  onItemClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  sort: { field: SortField; direction: SortDirection } | null;
  onSortChange: (field: SortField) => void;
  activeStatus?: TabStatus;
}

// Empty state messages based on active status filter
function getEmptyStateContent(activeStatus: TabStatus) {
  switch (activeStatus) {
    case 'new':
      return {
        title: 'No new items awaiting review',
        description: 'Run /pm-review to discover improvements in your codebase',
      };
    case 'approved':
      return {
        title: 'No approved items ready to build',
        description:
          'Review new items and approve the ones you want to implement',
      };
    case 'in_progress':
      return {
        title: 'Nothing currently building',
        description: 'Approved items will appear here when execution starts',
      };
    case 'completed':
      return {
        title: 'No completed items yet',
        description: 'Items move here after successful implementation',
      };
    case 'deferred':
      return {
        title: 'No deferred items',
        description: 'Items you save for later will appear here',
      };
    case 'rejected':
      return {
        title: 'No rejected items',
        description: 'Items you reject will appear here for reference',
      };
    default:
      return {
        title: 'No items found',
        description: 'Run /pm-review to analyze your codebase',
      };
  }
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
  activeStatus,
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
          <p className="text-lg mb-2">
            {getEmptyStateContent(activeStatus ?? null).title}
          </p>
          <p className="text-sm">
            {getEmptyStateContent(activeStatus ?? null).description}
          </p>
        </div>
      )}

      {/* Keyboard shortcuts hint bar */}
      {items.length > 0 && <KeyboardHintBar />}
    </div>
  );
}
