/**
 * Selection State Hook
 *
 * Manages multi-select state for backlog items.
 * Includes toggle, select all, clear, and computed selected items.
 */

import { useCallback, useMemo, useState } from 'react';

import type { BacklogItem } from '@/types/backlog';

interface UseSelectionOptions {
  items: BacklogItem[];
}

interface UseSelectionReturn {
  selectedIds: string[];
  selectedItems: BacklogItem[];
  isAllSelected: boolean;
  hasSelection: boolean;
  selectionCount: number;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useSelection({
  items,
}: UseSelectionOptions): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.length === items.length) {
        return [];
      }
      return items.map((item) => item.id);
    });
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const isAllSelected = selectedIds.length === items.length && items.length > 0;
  const hasSelection = selectedIds.length > 0;
  const selectionCount = selectedIds.length;

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
