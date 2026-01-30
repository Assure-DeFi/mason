/**
 * Backlog Mutations Hook
 *
 * Handles all backlog item mutations: approve, reject, restore, complete, delete.
 * Includes undo functionality with 8-second timeout.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useRef, useState } from 'react';

import { TABLES } from '@/lib/constants';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';

interface UndoState {
  action: 'approve' | 'reject' | 'restore' | 'complete' | 'delete';
  itemIds: string[];
  previousStatuses: Map<string, BacklogStatus>;
  deletedItems?: BacklogItem[];
  message: string;
}

interface UseBacklogMutationsOptions {
  client: SupabaseClient | null;
  items: BacklogItem[];
  setItems: React.Dispatch<React.SetStateAction<BacklogItem[]>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedItem: BacklogItem | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<BacklogItem | null>>;
}

interface UseBacklogMutationsReturn {
  // Single item mutations
  updateStatus: (id: string, status: BacklogStatus) => Promise<void>;
  generatePrd: (id: string) => Promise<void>;

  // Bulk mutations
  bulkApprove: (ids: string[]) => Promise<void>;
  bulkReject: (ids: string[]) => Promise<void>;
  bulkRestore: (ids: string[]) => Promise<void>;
  bulkComplete: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;

  // Undo
  undo: () => Promise<void>;
  undoState: UndoState | null;

  // Loading states
  isApproving: boolean;
  isRejecting: boolean;
  isRestoring: boolean;
  isCompleting: boolean;
  isDeleting: boolean;
}

const UNDO_TIMEOUT_MS = 8000;

export function useBacklogMutations({
  client,
  items,
  setItems,
  setSelectedIds,
  selectedItem,
  setSelectedItem,
}: UseBacklogMutationsOptions): UseBacklogMutationsReturn {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Schedule undo state cleanup
  const scheduleUndoClear = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setUndoState(null);
    }, UNDO_TIMEOUT_MS);
  }, []);

  // Single item status update
  const updateStatus = useCallback(
    async (id: string, status: BacklogStatus) => {
      if (!client) {
        throw new Error('Database not configured');
      }

      const { data: updated, error } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update status');
      }

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
    },
    [client, selectedItem, setItems, setSelectedItem],
  );

  // Generate PRD for item
  const generatePrd = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/prd/${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PRD');
      }

      const updated = await response.json();

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
    },
    [selectedItem, setItems, setSelectedItem],
  );

  // Bulk update status helper
  const bulkUpdateStatus = useCallback(
    async (
      ids: string[],
      newStatus: BacklogStatus,
      action: UndoState['action'],
      actionMessage: string,
    ) => {
      if (!client || ids.length === 0) {
        return;
      }

      // Store previous statuses for undo
      const previousStatuses = new Map<string, BacklogStatus>();
      ids.forEach((id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          previousStatuses.set(id, item.status);
        }
      });

      // Update all items
      const updates = ids.map(async (id) => {
        const { data, error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return null;
        }
        return data as BacklogItem;
      });

      const results = await Promise.all(updates);

      // Update local state
      setItems((prev) =>
        prev.map((item) => {
          const updated = results.find((r) => r?.id === item.id);
          return updated || item;
        }),
      );

      // Clear selection
      setSelectedIds([]);

      // Set undo state
      const successCount = results.filter((r) => r !== null).length;
      setUndoState({
        action,
        itemIds: ids,
        previousStatuses,
        message: `${actionMessage} ${successCount} item${successCount !== 1 ? 's' : ''}`,
      });

      scheduleUndoClear();
    },
    [client, items, setItems, setSelectedIds, scheduleUndoClear],
  );

  // Bulk action handlers
  const bulkApprove = useCallback(
    async (ids: string[]) => {
      setIsApproving(true);
      try {
        await bulkUpdateStatus(ids, 'approved', 'approve', 'Approved');
      } finally {
        setIsApproving(false);
      }
    },
    [bulkUpdateStatus],
  );

  const bulkReject = useCallback(
    async (ids: string[]) => {
      setIsRejecting(true);
      try {
        await bulkUpdateStatus(ids, 'rejected', 'reject', 'Rejected');
      } finally {
        setIsRejecting(false);
      }
    },
    [bulkUpdateStatus],
  );

  const bulkRestore = useCallback(
    async (ids: string[]) => {
      setIsRestoring(true);
      try {
        await bulkUpdateStatus(ids, 'new', 'restore', 'Restored');
      } finally {
        setIsRestoring(false);
      }
    },
    [bulkUpdateStatus],
  );

  const bulkComplete = useCallback(
    async (ids: string[]) => {
      setIsCompleting(true);
      try {
        await bulkUpdateStatus(
          ids,
          'completed',
          'complete',
          'Marked completed',
        );
      } finally {
        setIsCompleting(false);
      }
    },
    [bulkUpdateStatus],
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (!client || ids.length === 0) {
        return;
      }

      setIsDeleting(true);

      try {
        // Store items for undo before deleting
        const itemsToDelete = items.filter((i) => ids.includes(i.id));

        // Delete from database
        const { error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .delete()
          .in('id', ids);

        if (error) {
          return;
        }

        // Update local state
        setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
        setSelectedIds([]);

        // Close detail modal if viewing a deleted item
        if (selectedItem && ids.includes(selectedItem.id)) {
          setSelectedItem(null);
        }

        // Set undo state with deleted items
        setUndoState({
          action: 'delete',
          itemIds: ids,
          previousStatuses: new Map(),
          deletedItems: itemsToDelete,
          message: `Deleted ${ids.length} item${ids.length !== 1 ? 's' : ''}`,
        });

        scheduleUndoClear();
      } finally {
        setIsDeleting(false);
      }
    },
    [
      client,
      items,
      selectedItem,
      setItems,
      setSelectedIds,
      setSelectedItem,
      scheduleUndoClear,
    ],
  );

  // Undo handler
  const undo = useCallback(async () => {
    if (!undoState || !client) {
      return;
    }

    // Clear the timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    // Handle delete undo (re-insert items)
    if (undoState.action === 'delete' && undoState.deletedItems) {
      const inserts = undoState.deletedItems.map(async (item) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...itemWithoutId } = item;
        const { data, error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .insert({ ...itemWithoutId, id })
          .select()
          .single();

        if (error) {
          return null;
        }
        return data as BacklogItem;
      });

      const results = await Promise.all(inserts);
      const restoredItems = results.filter((r): r is BacklogItem => r !== null);

      setItems((prev) => [...restoredItems, ...prev]);
      setUndoState(null);
      return;
    }

    // Restore all items to their previous statuses
    const updates = Array.from(undoState.previousStatuses.entries()).map(
      async ([id, status]) => {
        const { data, error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return null;
        }
        return data as BacklogItem;
      },
    );

    const results = await Promise.all(updates);

    setItems((prev) =>
      prev.map((item) => {
        const restored = results.find((r) => r?.id === item.id);
        return restored || item;
      }),
    );

    setUndoState(null);
  }, [client, undoState, setItems]);

  return {
    updateStatus,
    generatePrd,
    bulkApprove,
    bulkReject,
    bulkRestore,
    bulkComplete,
    bulkDelete,
    undo,
    undoState,
    isApproving,
    isRejecting,
    isRestoring,
    isCompleting,
    isDeleting,
  };
}
