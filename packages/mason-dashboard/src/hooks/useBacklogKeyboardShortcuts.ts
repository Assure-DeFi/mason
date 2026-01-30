/**
 * Backlog Keyboard Shortcuts Hook
 *
 * Handles keyboard shortcuts for bulk actions on backlog items.
 * - Escape: Clear selection
 * - Cmd/Ctrl+A: Select all / Deselect all
 * - Cmd/Ctrl+Shift+A: Approve selected
 * - Cmd/Ctrl+Shift+X: Reject selected
 */

import { useEffect } from 'react';

interface UseBacklogKeyboardShortcutsOptions {
  selectedIds: string[];
  filteredItemIds: string[];
  isModalOpen: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}

export function useBacklogKeyboardShortcuts({
  selectedIds,
  filteredItemIds,
  isModalOpen,
  isApproving,
  isRejecting,
  onSelectAll,
  onClearSelection,
  onApprove,
  onReject,
}: UseBacklogKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields or when modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isModalOpen
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      // Escape - Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearSelection();
        return;
      }

      // Cmd/Ctrl+A - Select all / Deselect all
      if (isModKey && !e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Cmd/Ctrl+Shift+A - Approve selected
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedIds.length > 0 && !isApproving) {
          onApprove(selectedIds);
        }
        return;
      }

      // Cmd/Ctrl+Shift+X - Reject selected
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (selectedIds.length > 0 && !isRejecting) {
          onReject(selectedIds);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isModalOpen,
    selectedIds,
    filteredItemIds,
    isApproving,
    isRejecting,
    onSelectAll,
    onClearSelection,
    onApprove,
    onReject,
  ]);
}
