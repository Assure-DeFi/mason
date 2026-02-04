'use client';

import {
  useRef,
  useMemo,
  forwardRef,
  memo,
  type CSSProperties,
} from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';

import type { ColumnWidths } from '@/hooks/useColumnResize';
import type { BacklogItem } from '@/types/backlog';

import { ItemRow } from './item-row';

// Fixed row height for consistent virtualization
export const ROW_HEIGHT = 72;

// Threshold for when to use virtualization (items count)
export const VIRTUALIZATION_THRESHOLD = 50;

type TabStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'rejected'
  | 'filtered'
  | null;

interface VirtualizedTableBodyProps {
  items: BacklogItem[];
  selectedIds: string[];
  onSelectItem: (id: string, event?: React.MouseEvent) => void;
  onItemClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  columnWidths: ColumnWidths;
  activeStatus?: TabStatus;
  containerHeight: number;
}

interface ItemData {
  items: BacklogItem[];
  selectedIds: string[];
  onSelectItem: (id: string, event?: React.MouseEvent) => void;
  onItemClick: (item: BacklogItem) => void;
  onPrdClick?: (item: BacklogItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  columnWidths: ColumnWidths;
  activeStatus?: TabStatus;
}

// Outer element wrapper to style the scrollable container
const OuterElementType = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        overflow: 'auto',
      }}
      className="divide-y divide-gray-800/30"
      {...rest}
    />
  )
);
OuterElementType.displayName = 'OuterElementType';

// Inner element wrapper to contain all rows
const InnerElementType = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={style}
      role="rowgroup"
      {...rest}
    />
  )
);
InnerElementType.displayName = 'InnerElementType';

// Memoized row renderer for react-window
const Row = memo(function Row({
  index,
  style,
  data,
}: ListChildComponentProps<ItemData>) {
  const {
    items,
    selectedIds,
    onSelectItem,
    onItemClick,
    onPrdClick,
    onApprove,
    onReject,
    columnWidths,
    activeStatus,
  } = data;

  const item = items[index];
  if (!item) {
    return null;
  }

  // Apply divider styling between rows
  const rowStyle: CSSProperties = {
    ...style,
    borderBottom: '1px solid rgba(31, 41, 55, 0.3)', // gray-800/30
  };

  return (
    <div style={rowStyle}>
      <ItemRow
        item={item}
        selected={selectedIds.includes(item.id)}
        onSelect={onSelectItem}
        onClick={onItemClick}
        onPrdClick={onPrdClick}
        onApprove={onApprove}
        onReject={onReject}
        columnWidths={columnWidths}
        activeStatus={activeStatus}
      />
    </div>
  );
});

/**
 * VirtualizedTableBody - Renders large lists efficiently using react-window
 *
 * Only renders visible rows plus a small overscan buffer, dramatically
 * reducing DOM nodes and improving performance for large backlogs (100+ items).
 */
export function VirtualizedTableBody({
  items,
  selectedIds,
  onSelectItem,
  onItemClick,
  onPrdClick,
  onApprove,
  onReject,
  columnWidths,
  activeStatus,
  containerHeight,
}: VirtualizedTableBodyProps) {
  const listRef = useRef<List>(null);

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo<ItemData>(
    () => ({
      items,
      selectedIds,
      onSelectItem,
      onItemClick,
      onPrdClick,
      onApprove,
      onReject,
      columnWidths,
      activeStatus,
    }),
    [
      items,
      selectedIds,
      onSelectItem,
      onItemClick,
      onPrdClick,
      onApprove,
      onReject,
      columnWidths,
      activeStatus,
    ]
  );

  // Note: scrollToItem can be exposed via ref if needed for keyboard navigation
  // listRef.current?.scrollToItem(itemIndex, 'smart');

  return (
    <List
      ref={listRef}
      height={containerHeight}
      width="100%"
      itemCount={items.length}
      itemSize={ROW_HEIGHT}
      itemData={itemData}
      overscanCount={5} // Render 5 extra rows above/below viewport
      outerElementType={OuterElementType}
      innerElementType={InnerElementType}
    >
      {Row}
    </List>
  );
}

/**
 * Helper hook to determine if virtualization should be used
 * based on item count and user preference
 */
export function useVirtualization(itemCount: number): boolean {
  return itemCount >= VIRTUALIZATION_THRESHOLD;
}
