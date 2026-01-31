'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { STORAGE_KEYS } from '@/lib/constants';

export type ResizableColumnId =
  | 'title'
  | 'type'
  | 'priority'
  | 'complexity'
  | 'status'
  | 'updated';

export interface ColumnWidths {
  checkbox: number;
  title: number;
  type: number;
  priority: number;
  complexity: number;
  status: number;
  prd: number;
  updated: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  checkbox: 48,
  title: 420, // Increased since area column removed
  type: 130, // Increased for longer category names like "Code Quality"
  priority: 100,
  complexity: 110,
  status: 120,
  prd: 56,
  updated: 130,
};

const MIN_WIDTHS: ColumnWidths = {
  checkbox: 48,
  title: 200,
  type: 100,
  priority: 80,
  complexity: 90,
  status: 100,
  prd: 56,
  updated: 100,
};

const MAX_WIDTHS: ColumnWidths = {
  checkbox: 48,
  title: 800,
  type: 200,
  priority: 150,
  complexity: 150,
  status: 180,
  prd: 56,
  updated: 200,
};

// Only store the resizable columns
type StoredWidths = Omit<ColumnWidths, 'checkbox' | 'prd'>;

function loadStoredWidths(): ColumnWidths {
  if (typeof window === 'undefined') {
    return DEFAULT_WIDTHS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COLUMN_WIDTHS);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredWidths>;
      return {
        ...DEFAULT_WIDTHS,
        ...parsed,
        // Always use fixed widths for these
        checkbox: DEFAULT_WIDTHS.checkbox,
        prd: DEFAULT_WIDTHS.prd,
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored column widths:', e);
  }

  return DEFAULT_WIDTHS;
}

function saveWidths(widths: ColumnWidths): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Only store resizable columns
  const toStore: StoredWidths = {
    title: widths.title,
    type: widths.type,
    priority: widths.priority,
    complexity: widths.complexity,
    status: widths.status,
    updated: widths.updated,
  };

  localStorage.setItem(STORAGE_KEYS.COLUMN_WIDTHS, JSON.stringify(toStore));
}

function areWidthsCustomized(widths: ColumnWidths): boolean {
  const resizableKeys: ResizableColumnId[] = [
    'title',
    'type',
    'priority',
    'complexity',
    'status',
    'updated',
  ];

  return resizableKeys.some((key) => widths[key] !== DEFAULT_WIDTHS[key]);
}

export function useColumnResize() {
  const [columnWidths, setColumnWidths] =
    useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [resizingColumn, setResizingColumn] =
    useState<ResizableColumnId | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Load from localStorage on mount
  useEffect(() => {
    setColumnWidths(loadStoredWidths());
    setIsInitialized(true);
  }, []);

  // Save to localStorage when widths change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveWidths(columnWidths);
    }
  }, [columnWidths, isInitialized]);

  const handleResizeStart = useCallback(
    (columnId: ResizableColumnId, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setResizingColumn(columnId);
      startXRef.current = event.clientX;
      startWidthRef.current = columnWidths[columnId];
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnWidths],
  );

  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      if (!resizingColumn) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;
      const min = MIN_WIDTHS[resizingColumn];
      const max = MAX_WIDTHS[resizingColumn];

      // Clamp to min/max
      const finalWidth = Math.max(min, Math.min(max, newWidth));

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: Math.round(finalWidth),
      }));
    },
    [resizingColumn],
  );

  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Attach global mouse listeners during resize
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

  const resetToDefaults = useCallback(() => {
    setColumnWidths(DEFAULT_WIDTHS);
  }, []);

  const hasCustomWidths = isInitialized && areWidthsCustomized(columnWidths);

  return {
    columnWidths,
    resizingColumn,
    handleResizeStart,
    resetToDefaults,
    hasCustomWidths,
    isInitialized,
  };
}
