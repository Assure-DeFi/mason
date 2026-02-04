/**
 * Backlog Mutations Hook
 *
 * Handles all backlog item mutations: approve, reject, restore, complete, delete.
 *
 * Features:
 * - OPTIMISTIC UPDATES: UI updates immediately for snappy feel
 * - BACKGROUND SYNC: Changes sent to server without blocking UI
 * - AUTOMATIC REVERT: If server fails, changes are rolled back
 * - UNDO FUNCTIONALITY: 8-second window to undo any action
 * - BATCH OPERATIONS: Single query for bulk actions (N+1 fix)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useRef, useState } from 'react';

import { TABLES } from '@/lib/constants';
import { getMasonConfig } from '@/lib/supabase/user-client';
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

  // Record status change event
  const recordStatusEvent = useCallback(
    async (
      itemId: string,
      oldStatus: BacklogStatus,
      newStatus: BacklogStatus,
    ) => {
      try {
        const config = getMasonConfig();
        if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
          return;
        }

        await fetch(`/api/backlog/${itemId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-url': config.supabaseUrl,
            'x-supabase-anon-key': config.supabaseAnonKey,
          },
          body: JSON.stringify({
            event_type: 'status_changed',
            old_value: oldStatus,
            new_value: newStatus,
          }),
        });
      } catch {
        // Fire-and-forget: don't block on event recording failure
        console.warn('Failed to record status event');
      }
    },
    [],
  );

  // Single item status update
  const updateStatus = useCallback(
    async (id: string, status: BacklogStatus) => {
      if (!client) {
        throw new Error('Database not configured');
      }

      // Get old status for event recording
      const oldItem = items.find((item) => item.id === id);
      const oldStatus = oldItem?.status;

      const { data: updated, error } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const errorMessage = error.message || 'Unknown database error';
        throw new Error(
          `Failed to update item status: ${errorMessage}. ` +
            'Try refreshing the page and attempting again. ' +
            'If the problem persists, check your database connection in Settings.',
        );
      }

      // Record status change event (fire-and-forget)
      if (oldStatus && oldStatus !== status) {
        void recordStatusEvent(id, oldStatus, status);
      }

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
    },
    [client, items, selectedItem, setItems, setSelectedItem, recordStatusEvent],
  );

  // Generate PRD for item
  const generatePrd = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/prd/${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `Failed to generate PRD: ${errorText}. ` +
            'This may be due to missing AI provider configuration. ' +
            'Check your API keys in Settings > AI Providers.',
        );
      }

      const updated = await response.json();

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
    },
    [selectedItem, setItems, setSelectedItem],
  );

  // Bulk update status helper - OPTIMISTIC UPDATE PATTERN
  // UI updates immediately for snappy feel, then syncs to server in background
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

      // Store previous statuses for undo/revert
      const previousStatuses = new Map<string, BacklogStatus>();
      ids.forEach((id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          previousStatuses.set(id, item.status);
        }
      });

      // === OPTIMISTIC UPDATE: Apply changes immediately for instant feedback ===
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => {
          if (ids.includes(item.id)) {
            return { ...item, status: newStatus, updated_at: now };
          }
          return item;
        }),
      );

      // Clear selection immediately
      setSelectedIds([]);

      // Set undo state immediately (user can undo while sync happens)
      setUndoState({
        action,
        itemIds: ids,
        previousStatuses,
        message: `${actionMessage} ${ids.length} item${ids.length !== 1 ? 's' : ''}`,
      });
      scheduleUndoClear();

      // === BACKGROUND SYNC: Send to server without blocking UI ===
      try {
        const { data: results, error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .update({ status: newStatus, updated_at: now })
          .in('id', ids)
          .select();

        if (error) {
          // Server failed - revert optimistic update
          console.error('Batch update failed, reverting:', error);
          setItems((prev) =>
            prev.map((item) => {
              const oldStatus = previousStatuses.get(item.id);
              if (oldStatus !== undefined) {
                return { ...item, status: oldStatus };
              }
              return item;
            }),
          );
          setUndoState(null);
          return;
        }

        // Server succeeded - update with any server-side changes (timestamps, etc.)
        if (results) {
          const serverResults = results as BacklogItem[];
          setItems((prev) =>
            prev.map((item) => {
              const serverItem = serverResults.find((r) => r.id === item.id);
              return serverItem || item;
            }),
          );
        }

        // Record status change events (fire-and-forget)
        ids.forEach((id) => {
          const oldStatus = previousStatuses.get(id);
          if (oldStatus && oldStatus !== newStatus) {
            void recordStatusEvent(id, oldStatus, newStatus);
          }
        });
      } catch (err) {
        // Network error - revert optimistic update
        console.error('Network error during update, reverting:', err);
        setItems((prev) =>
          prev.map((item) => {
            const oldStatus = previousStatuses.get(item.id);
            if (oldStatus !== undefined) {
              return { ...item, status: oldStatus };
            }
            return item;
          }),
        );
        setUndoState(null);
      }
    },
    [
      client,
      items,
      setItems,
      setSelectedIds,
      scheduleUndoClear,
      recordStatusEvent,
    ],
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

  // Bulk delete - OPTIMISTIC UPDATE PATTERN
  // Items disappear immediately for instant feedback
  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (!client || ids.length === 0) {
        return;
      }

      setIsDeleting(true);

      try {
        // Store items for undo/revert before "deleting"
        const itemsToDelete = items.filter((i) => ids.includes(i.id));

        // === OPTIMISTIC UPDATE: Remove items immediately ===
        setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
        setSelectedIds([]);

        // Close detail modal if viewing a deleted item
        if (selectedItem && ids.includes(selectedItem.id)) {
          setSelectedItem(null);
        }

        // Set undo state immediately (user can undo while sync happens)
        setUndoState({
          action: 'delete',
          itemIds: ids,
          previousStatuses: new Map(),
          deletedItems: itemsToDelete,
          message: `Deleted ${ids.length} item${ids.length !== 1 ? 's' : ''}`,
        });
        scheduleUndoClear();

        // === BACKGROUND SYNC: Delete from server ===
        const { error } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .delete()
          .in('id', ids);

        if (error) {
          // Server failed - restore items
          console.error('Delete failed, restoring items:', error);
          setItems((prev) => [...itemsToDelete, ...prev]);
          setUndoState(null);
        }
      } catch (err) {
        // Network error - we can't revert easily here since items were deleted
        // The undo state still allows manual restoration
        console.error('Network error during delete:', err);
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

    // Handle delete undo (re-insert items) - batch insert in single query
    if (undoState.action === 'delete' && undoState.deletedItems) {
      // Prepare items for batch insert (preserving original IDs)
      const itemsToInsert = undoState.deletedItems.map((item) => ({
        ...item,
      }));

      const { data: restoredItems, error } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('Failed to restore deleted items:', error);
        setUndoState(null);
        return;
      }

      setItems((prev) => [...(restoredItems as BacklogItem[]), ...prev]);
      setUndoState(null);
      return;
    }

    // Restore all items to their previous statuses
    // Group items by target status to minimize queries (1 query per unique status vs 1 per item)
    const statusGroups = new Map<BacklogStatus, string[]>();
    undoState.previousStatuses.forEach((status, id) => {
      const group = statusGroups.get(status) || [];
      group.push(id);
      statusGroups.set(status, group);
    });

    // Execute batch updates for each status group
    const allResults: BacklogItem[] = [];
    const statusEntries = Array.from(statusGroups.entries());
    for (const [status, ids] of statusEntries) {
      const { data, error } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select();

      if (!error && data) {
        allResults.push(...(data as BacklogItem[]));
      }
    }

    setItems((prev) =>
      prev.map((item) => {
        const restored = allResults.find((r) => r.id === item.id);
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
