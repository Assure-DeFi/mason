'use client';

import { RefreshCw, Database, ArrowRight, Undo2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { BulkActionsBar } from '@/components/backlog/bulk-actions-bar';
import { EmptyStateOnboarding } from '@/components/backlog/EmptyStateOnboarding';
import { FirstItemCelebration } from '@/components/backlog/FirstItemCelebration';
import { ImprovementsTable } from '@/components/backlog/improvements-table';
import {
  ItemDetailModal,
  type ViewMode,
} from '@/components/backlog/item-detail-modal';
import { StatsBar } from '@/components/backlog/stats-bar';
import { StatusTabs, type TabStatus } from '@/components/backlog/status-tabs';
import { UnifiedExecuteButton } from '@/components/backlog/UnifiedExecuteButton';
import { GenerateIdeasModal } from '@/components/backlog/generate-ideas-modal';
import { ExecutionProgress } from '@/components/execution/execution-progress';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { NextStepBanner } from '@/components/ui/NextStepBanner';
import { OnboardingProgress } from '@/components/ui/OnboardingProgress';
import { QuickStartFAB } from '@/components/ui/QuickStartFAB';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useAutoMigrations } from '@/hooks/useAutoMigrations';
import {
  useExecutionListener,
  fetchItemForExecution,
} from '@/hooks/useExecutionListener';
import { useRealtimeBacklog } from '@/hooks/useRealtimeBacklog';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { createMasonUserRecord } from '@/lib/supabase/user-record';
import type {
  BacklogItem,
  BacklogStatus,
  StatusCounts,
  SortField,
  SortDirection,
} from '@/types/backlog';

interface UndoState {
  action: 'approve' | 'reject' | 'restore' | 'complete' | 'delete';
  itemIds: string[];
  previousStatuses: Map<string, BacklogStatus>;
  deletedItems?: BacklogItem[]; // For delete undo
  message: string;
}

export default function BacklogPage() {
  const { data: session } = useSession();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();

  // Auto-run database migrations when user has OAuth configured
  // Runs silently in background, once per 24h
  useAutoMigrations();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<TabStatus>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [executingItemId, setExecutingItemId] = useState<string | null>(null);
  const [executingItemTitle, setExecutingItemTitle] = useState<string | null>(
    null,
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showGenerateIdeasModal, setShowGenerateIdeasModal] = useState(false);
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);
  const [modalViewMode, setModalViewMode] = useState<ViewMode>('details');

  // Bulk action loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Undo state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Global execution listener - auto-shows BuildingTheater when CLI execution starts
  // Works across ALL repos, not filtered by selected repository
  const handleExecutionDetected = useCallback(
    (progress: { item_id: string }) => {
      if (!client) {
        return;
      }

      // Don't show if already showing an execution
      if (executionRunId) {
        return;
      }

      // Fetch item details and show the execution modal
      void fetchItemForExecution(client, progress.item_id).then((item) => {
        if (!item) {
          return;
        }

        // Show the execution modal
        setExecutionRunId(`cli-${progress.item_id}`);
        setExecutingItemId(progress.item_id);
        setExecutingItemTitle(item.title);
      });
    },
    [client, executionRunId],
  );

  useExecutionListener({
    client,
    enabled: isConfigured && !executionRunId,
    onExecutionStart: handleExecutionDetected,
  });

  const handleSortChange = useCallback((field: SortField) => {
    setSort((prev) => {
      if (prev?.field === field) {
        return prev.direction === 'asc' ? { field, direction: 'desc' } : null;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const fetchItems = useCallback(async () => {
    if (!client || !session?.user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let { data: userData } = await client
        .from('mason_users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      // Auto-create user record if it doesn't exist (for existing users who set up before this was added)
      if (!userData) {
        console.log('User record not found, auto-creating...');
        const createResult = await createMasonUserRecord(client, {
          github_id: session.user.github_id,
          github_username:
            session.user.github_username || session.user.github_id,
          github_email: session.user.github_email,
          github_avatar_url: session.user.github_avatar_url,
        });

        if (!createResult.success) {
          console.error('Failed to create user record:', createResult.error);
          setItems([]);
          return;
        }

        // Fetch the newly created user record
        const { data: newUserData } = await client
          .from('mason_users')
          .select('id')
          .eq('github_id', session.user.github_id)
          .single();

        userData = newUserData;

        if (!userData) {
          console.error('User record still not found after creation');
          setItems([]);
          return;
        }
      }

      // First, claim any orphaned items (items with null user_id)
      // This handles items created before user_id was added to pm-review
      const { data: orphanedItems } = await client
        .from('mason_pm_backlog_items')
        .select('id')
        .is('user_id', null);

      if (orphanedItems && orphanedItems.length > 0) {
        console.log(
          `Found ${orphanedItems.length} orphaned items, claiming for user...`,
        );
        const orphanedIds = orphanedItems.map((item) => item.id);
        await client
          .from('mason_pm_backlog_items')
          .update({ user_id: userData.id })
          .in('id', orphanedIds);
      }

      // Now fetch all items for this user
      const { data, error: fetchError } = await client
        .from('mason_pm_backlog_items')
        .select('*')
        .eq('user_id', userData.id)
        .order('priority_score', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setItems(data || []);
    } catch (err) {
      console.error('Error fetching backlog:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [client, session]);

  useEffect(() => {
    if (isConfigured && !isDbLoading) {
      void fetchItems();
    } else if (!isDbLoading && !isConfigured) {
      setIsLoading(false);
    }
  }, [fetchItems, isConfigured, isDbLoading]);

  // Subscribe to real-time backlog changes
  // This enables automatic updates when CLI changes item status
  useRealtimeBacklog({
    client,
    onItemUpdate: useCallback(
      (updatedItem: BacklogItem) => {
        setItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        );
        // Also update selected item if it's the one that changed
        if (selectedItem?.id === updatedItem.id) {
          setSelectedItem(updatedItem);
        }
      },
      [selectedItem],
    ),
    onItemInsert: useCallback((newItem: BacklogItem) => {
      setItems((prev) => [newItem, ...prev]);
    }, []),
    onItemDelete: useCallback(
      (deletedItem: BacklogItem) => {
        setItems((prev) => prev.filter((item) => item.id !== deletedItem.id));
        // Close detail modal if viewing deleted item
        if (selectedItem?.id === deletedItem.id) {
          setSelectedItem(null);
        }
      },
      [selectedItem],
    ),
    enabled: isConfigured && !isDbLoading,
  });

  // Show celebration when items first load
  useEffect(() => {
    if (!isLoading && items.length > 0) {
      const hasSeen = localStorage.getItem('mason_has_seen_first_items');
      if (!hasSeen) {
        setShowCelebration(true);
      }
    }
  }, [isLoading, items.length]);

  // Filter items by selected repository first
  const repoFilteredItems = useMemo(() => {
    if (!selectedRepoId) {
      return items;
    }
    return items.filter((item) => item.repository_id === selectedRepoId);
  }, [items, selectedRepoId]);

  // Calculate counts for stats bar (based on repo-filtered items)
  const counts: StatusCounts = useMemo(() => {
    const result: StatusCounts = {
      total: repoFilteredItems.length,
      new: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      deferred: 0,
      rejected: 0,
    };

    repoFilteredItems.forEach((item) => {
      result[item.status]++;
    });

    return result;
  }, [repoFilteredItems]);

  // Filter items by active status (on top of repo filter)
  const filteredItems = useMemo(() => {
    if (!activeStatus) {
      return repoFilteredItems;
    }
    return repoFilteredItems.filter((item) => item.status === activeStatus);
  }, [repoFilteredItems, activeStatus]);

  // Get approved item IDs for execute button (from repo-filtered items)
  const approvedItemIds = useMemo(() => {
    return repoFilteredItems
      .filter((item) => item.status === 'approved')
      .map((item) => item.id);
  }, [repoFilteredItems]);

  // Determine the contextual next step (based on repo-filtered items)
  const nextStepContext = useMemo(() => {
    if (repoFilteredItems.length === 0) {
      return 'empty-backlog';
    }
    if (counts.approved > 0) {
      return 'has-approved';
    }
    if (counts.new > 0) {
      return 'has-new-items';
    }
    if (counts.completed > 0 && counts.new === 0 && counts.approved === 0) {
      return 'all-complete';
    }
    return null;
  }, [items.length, counts]) as
    | 'empty-backlog'
    | 'has-new-items'
    | 'has-approved'
    | 'all-complete'
    | null;

  const handleUpdateStatus = async (id: string, status: BacklogStatus) => {
    if (!client) {
      throw new Error('Database not configured');
    }

    const { data: updated, error: updateError } = await client
      .from('mason_pm_backlog_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update status');
    }

    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (selectedItem?.id === id) {
      setSelectedItem(updated);
    }
  };

  const handleGeneratePrd = async (id: string) => {
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
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Handle clicking on an item row (opens modal with details view)
  const handleItemClick = (item: BacklogItem) => {
    setModalViewMode('details');
    setSelectedItem(item);
  };

  // Handle clicking on PRD icon (opens modal with PRD view)
  const handlePrdClick = (item: BacklogItem) => {
    setModalViewMode('prd');
    setSelectedItem(item);
  };

  // Get selected items from IDs
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  // Clear any existing undo timeout when component unmounts
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Handle undo action
  const handleUndo = async () => {
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
          .from('mason_pm_backlog_items')
          .insert({ ...itemWithoutId, id }) // Re-use original ID
          .select()
          .single();

        if (error) {
          console.error(`Failed to restore deleted item ${id}:`, error);
          return null;
        }
        return data as BacklogItem;
      });

      const results = await Promise.all(inserts);
      const restoredItems = results.filter((r): r is BacklogItem => r !== null);

      // Add restored items back to local state
      setItems((prev) => [...restoredItems, ...prev]);
      setUndoState(null);
      return;
    }

    // Restore all items to their previous statuses
    const updates = Array.from(undoState.previousStatuses.entries()).map(
      async ([id, status]) => {
        const { data, error } = await client
          .from('mason_pm_backlog_items')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error(`Failed to undo status for item ${id}:`, error);
          return null;
        }
        return data as BacklogItem;
      },
    );

    const results = await Promise.all(updates);

    // Update local state with the restored items
    setItems((prev) =>
      prev.map((item) => {
        const restored = results.find((r) => r?.id === item.id);
        return restored || item;
      }),
    );

    setUndoState(null);
  };

  // Bulk update status helper
  const bulkUpdateStatus = async (
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
        .from('mason_pm_backlog_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update status for item ${id}:`, error);
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

    // Clear undo state after 8 seconds
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setUndoState(null);
    }, 8000);
  };

  // Bulk action handlers
  const handleBulkApprove = async (ids: string[]) => {
    setIsApproving(true);
    try {
      await bulkUpdateStatus(ids, 'approved', 'approve', 'Approved');
    } finally {
      setIsApproving(false);
    }
  };

  const handleBulkReject = async (ids: string[]) => {
    setIsRejecting(true);
    try {
      await bulkUpdateStatus(ids, 'rejected', 'reject', 'Rejected');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleBulkRestore = async (ids: string[]) => {
    setIsRestoring(true);
    try {
      await bulkUpdateStatus(ids, 'new', 'restore', 'Restored');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleBulkComplete = async (ids: string[]) => {
    setIsCompleting(true);
    try {
      await bulkUpdateStatus(ids, 'completed', 'complete', 'Marked completed');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!client || ids.length === 0) {
      return;
    }

    setIsDeleting(true);

    try {
      // Store items for undo before deleting
      const itemsToDelete = items.filter((i) => ids.includes(i.id));

      // Delete from database
      const { error } = await client
        .from('mason_pm_backlog_items')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Failed to delete items:', error);
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

      // Clear undo state after 8 seconds
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setUndoState(null);
      }, 8000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteAll = async () => {
    const command = `/execute-approved --ids ${approvedItemIds.join(',')}`;

    try {
      await navigator.clipboard.writeText(command);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const _handleRemoteExecute = (itemIds: string[], itemTitle?: string) => {
    // Start remote execution - handled by the UnifiedExecuteButton modal
    // This would integrate with the existing RemoteExecuteButton logic
    setExecutionRunId('starting'); // Placeholder - would get actual run ID
    if (itemIds.length > 0) {
      setExecutingItemId(itemIds[0]);
      setExecutingItemTitle(itemTitle ?? null);
    }
  };

  if (!isDbLoading && !isConfigured) {
    return (
      <main className="min-h-screen bg-navy">
        <div className="border-b border-gray-800">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  System Improvements
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Manage and track improvement ideas from PM reviews
                </p>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
            <Database className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-semibold text-white">
              Database Not Configured
            </h2>
            <p className="mb-6 text-gray-400">
              Mason stores all your data in your own Supabase database. Complete
              the setup wizard to connect your database and start analyzing your
              codebase.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 font-medium text-navy transition-opacity hover:opacity-90"
            >
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error && !isLoading) {
    return (
      <main className="min-h-screen bg-navy">
        <div className="mx-auto max-w-7xl p-8">
          <div className="border border-red-800 bg-red-900/20 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold text-red-400">Error</h2>
            <p className="mb-4 text-gray-300">{error}</p>
            <button
              onClick={fetchItems}
              className="bg-red-600 px-4 py-2 hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Check if backlog is empty (after loading)
  const isEmpty = !isLoading && items.length === 0;

  return (
    <main className="min-h-screen bg-navy">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                System Improvements
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage and track improvement ideas from PM reviews
              </p>
            </div>

            <div className="flex items-center gap-4">
              {session && (
                <RepositorySelector
                  value={selectedRepoId}
                  onChange={setSelectedRepoId}
                />
              )}

              <button
                onClick={() => setShowGenerateIdeasModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium hover:bg-gold/90 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate New Ideas
              </button>

              <button
                onClick={fetchItems}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>

              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Journey Map - shows workflow progress */}
      <JourneyMap counts={counts} />

      {/* Smart Next Step Banner */}
      {!isLoading && nextStepContext && (
        <NextStepBanner context={nextStepContext} />
      )}

      {/* Show stats and tabs only when not empty */}
      {!isEmpty && (
        <>
          {/* Stats Bar */}
          <StatsBar counts={counts} />

          {/* Status Tabs with Unified Execute Button */}
          <div className="border-b border-gray-800">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <StatusTabs
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
                onExecuteAll={handleExecuteAll}
                approvedCount={counts.approved}
              />

              {session && counts.approved > 0 && (
                <div className="px-6 py-3">
                  <UnifiedExecuteButton itemIds={approvedItemIds} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Onboarding Progress Checklist */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <OnboardingProgress
          isConfigured={isConfigured}
          counts={counts}
          hasSession={!!session}
        />
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          // Skeleton loading state
          <div className="p-6">
            <SkeletonTable rows={5} columns={5} />
          </div>
        ) : isEmpty ? (
          // Empty state onboarding
          <EmptyStateOnboarding onRefresh={fetchItems} />
        ) : (
          // Regular table view
          <ImprovementsTable
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onItemClick={handleItemClick}
            onPrdClick={handlePrdClick}
            sort={sort}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdateStatus={handleUpdateStatus}
          onGeneratePrd={handleGeneratePrd}
          initialViewMode={modalViewMode}
        />
      )}

      {/* Execution Progress Modal */}
      {executionRunId && (
        <ExecutionProgress
          runId={executionRunId}
          itemId={executingItemId ?? undefined}
          itemTitle={executingItemTitle ?? undefined}
          client={client}
          onClose={() => {
            setExecutionRunId(null);
            setExecutingItemId(null);
            setExecutingItemTitle(null);
            void fetchItems(); // Refresh to show updated statuses
          }}
        />
      )}

      {/* Generate Ideas Modal */}
      <GenerateIdeasModal
        isOpen={showGenerateIdeasModal}
        onClose={() => setShowGenerateIdeasModal(false)}
      />

      {/* Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-green-600 text-white shadow-lg">
          Command copied! Paste into Claude Code to execute.
        </div>
      )}

      {/* Execution Error Toast */}
      {executionError && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-red-600 text-white shadow-lg">
          {executionError}
          <button
            onClick={() => setExecutionError(null)}
            className="ml-4 text-white/80 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Start FAB */}
      <QuickStartFAB />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedItems={selectedItems}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onRestore={handleBulkRestore}
        onComplete={handleBulkComplete}
        onDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
        isApproving={isApproving}
        isRejecting={isRejecting}
        isRestoring={isRestoring}
        isCompleting={isCompleting}
        isDeleting={isDeleting}
      />

      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-700 shadow-2xl">
            <span className="text-white">{undoState.message}</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-3 py-1.5 bg-gold/20 border border-gold/40 text-gold font-medium hover:bg-gold/30 transition-all"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={() => setUndoState(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* First Item Celebration Modal */}
      {showCelebration && items.length > 0 && (
        <FirstItemCelebration
          itemCount={items.length}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </main>
  );
}
