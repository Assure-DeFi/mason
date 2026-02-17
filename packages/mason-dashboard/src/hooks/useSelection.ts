/**
 * Selection State Hook
 *
 * Manages multi-select state for backlog items.
 * Uses Set<string> for O(1) lookup instead of array for O(n).
 * Includes toggle, select all, clear, and computed selected items.
 */

import { useCallback, useMemo, useState } from 'react';

import type { BacklogItem } from '@/types/backlog';

interface UseSelectionOptions {
  items: BacklogItem[];
}

interface UseSelectionReturn {
  selectedIds: Set<string>;
  selectedItems: BacklogItem[];
  isAllSelected: boolean;
  hasSelection: boolean;
  selectionCount: number;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useSelection({
  items,
}: UseSelectionOptions): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const isAllSelected = selectedIds.size === items.length && items.length > 0;
  const hasSelection = selectedIds.size > 0;
  const selectionCount = selectedIds.size;

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    hasSelection,
    selectionCount,
    toggle,
    selectAll,
    clear,
    setSelectedIds,
  };
}
