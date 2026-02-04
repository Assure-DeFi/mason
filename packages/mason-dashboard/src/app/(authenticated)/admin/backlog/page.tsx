'use client';

import {
  RefreshCw,
  Database,
  ArrowRight,
  Undo2,
  Sparkles,
  Check,
  X,
  Search,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { BangerEmptyState } from '@/components/backlog/banger-empty-state';
import { BangerIdeaCard } from '@/components/backlog/banger-idea-card';
import { BulkActionsBar } from '@/components/backlog/bulk-actions-bar';
import { ConfirmationDialog } from '@/components/backlog/confirmation-dialog';
import { EmptyStateOnboarding } from '@/components/backlog/EmptyStateOnboarding';
import { FirstItemCelebration } from '@/components/backlog/FirstItemCelebration';
import { ImprovementsTable } from '@/components/backlog/improvements-table';
import type { ViewMode } from '@/components/backlog/item-detail-modal';
import { MasonRecommends } from '@/components/backlog/mason-recommends';
import { StatsBar } from '@/components/backlog/stats-bar';
import { StatusTabs, type TabStatus } from '@/components/backlog/status-tabs';
import { UnifiedExecuteButton } from '@/components/backlog/UnifiedExecuteButton';
import { MasonMark } from '@/components/brand';
import { ErrorBoundary } from '@/components/errors';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { AutopilotToast } from '@/components/ui/AutopilotToast';
import { ErrorBanner, ErrorToast } from '@/components/ui/ErrorBanner';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { NextStepBanner } from '@/components/ui/NextStepBanner';
import { OnboardingProgress } from '@/components/ui/OnboardingProgress';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { QuickStartFAB } from '@/components/ui/QuickStartFAB';
import { ImprovementsTableSkeleton } from '@/components/ui/Skeleton';
import { useAutoMigrations } from '@/hooks/useAutoMigrations';
import { useAutopilotNotifications } from '@/hooks/useAutopilotNotifications';
import {
  useExecutionListener,
  fetchItemForExecution,
} from '@/hooks/useExecutionListener';
import { useRealtimeBacklog } from '@/hooks/useRealtimeBacklog';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';
import { ensureExecutionProgress } from '@/lib/execution/progress';
import { getRecommendedItems } from '@/lib/recommendations';
import { createMasonUserRecord } from '@/lib/supabase/user-record';
import type {
  BacklogItem,
  BacklogStatus,
  StatusCounts,
  SortField,
  SortDirection,
} from '@/types/backlog';

// Dynamically import heavy modal components to reduce initial bundle size
const ItemDetailModal = dynamic(
  () =>
    import('@/components/backlog/item-detail-modal').then(
      (mod) => mod.ItemDetailModal,
    ),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    ),
  },
);

const ExecutionRunModal = dynamic(
  () =>
    import('@/components/execution/ExecutionRunModal').then(
      (mod) => mod.ExecutionRunModal,
    ),
  {
    loading: () => null,
  },
);

const GenerateIdeasWizard = dynamic(
  () =>
    import('@/components/backlog/generate-ideas-wizard').then(
      (mod) => mod.GenerateIdeasWizard,
    ),
  {
    loading: () => null,
  },
);

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
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'manual' | 'autopilot'
  >('all');
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [executingItemId, setExecutingItemId] = useState<string | null>(null);
  const [executingItemTitle, setExecutingItemTitle] = useState<string | null>(
    null,
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showGenerateIdeasModal, setShowGenerateIdeasModal] = useState(false);
  const [generateModalMode, setGenerateModalMode] = useState<'full' | 'banger'>(
    'full',
  );
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);
  const [modalViewMode, setModalViewMode] = useState<ViewMode>('details');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk action loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Undo state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent concurrent fetch calls and rapid retries
  const isFetchingRef = useRef(false);
  const lastFetchErrorRef = useRef<number>(0);
  const FETCH_RETRY_DELAY = 5000; // Wait 5 seconds before retrying after an error

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'restore' | 'complete' | 'delete';
    ids: string[];
    titles: string[];
    items?: BacklogItem[];
  } | null>(null);

  // Global execution listener - auto-shows ExecutionRunModal when CLI execution starts
  // Works across ALL repos, not filtered by selected repository
  const handleExecutionDetected = useCallback(
    (progress: { item_id: string; run_id: string | null }) => {
      console.log(
        '[Backlog] Execution detected for item:',
        progress.item_id,
        'run_id:',
        progress.run_id,
      );

      if (!client) {
        console.log('[Backlog] No client available, ignoring execution event');
        return;
      }

      // Allow showing new execution even if one is already visible
      // User can close the old one manually if needed
      if (executionRunId) {
        console.log(
          '[Backlog] Execution already showing, replacing with new one:',
          progress.item_id,
        );
      }

      // Fetch item details and show the execution modal
      void fetchItemForExecution(client, progress.item_id).then((item) => {
        if (!item) {
          console.log(
            '[Backlog] Could not fetch item details for:',
            progress.item_id,
          );
          return;
        }

        console.log('[Backlog] Showing execution modal for item:', item.title);
        // Use the real run_id from execution_progress if available, otherwise fallback to cli-{item_id}
        const runId = progress.run_id || `cli-${progress.item_id}`;
        setExecutionRunId(runId);
        setExecutingItemId(progress.item_id);
        setExecutingItemTitle(item.title);
      });
    },
    [client, executionRunId],
  );

  // Keep listener enabled even when showing an execution
  // This allows detecting new executions (which will replace the current one)
  useExecutionListener({
    client,
    enabled: isConfigured,
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

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Rate limit retries after errors
    const now = Date.now();
    if (
      lastFetchErrorRef.current &&
      now - lastFetchErrorRef.current < FETCH_RETRY_DELAY
    ) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      let { data: userData } = await client
        .from(TABLES.USERS)
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
          .from(TABLES.USERS)
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

      // Claim orphaned items (items with null user_id or null repository_id)
      // This handles items created before user_id/repository_id were properly set in pm-review

      // Step 1: Claim items with null user_id
      const { data: userOrphanedItems } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .select('id')
        .is('user_id', null);

      if (userOrphanedItems && userOrphanedItems.length > 0) {
        console.log(
          `Found ${userOrphanedItems.length} items with null user_id, claiming for user...`,
        );
        const orphanedIds = userOrphanedItems.map((item) => item.id);
        await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .update({ user_id: userData.id })
          .in('id', orphanedIds);
      }

      // Step 2: If user has exactly one repository, claim items with null repository_id
      // (We can only auto-assign if there's no ambiguity about which repo)
      const { data: repos } = await client
        .from(TABLES.GITHUB_REPOSITORIES)
        .select('id')
        .eq('user_id', userData.id)
        .eq('is_active', true);

      if (repos && repos.length === 1) {
        const { data: repoOrphanedItems } = await client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .select('id')
          .eq('user_id', userData.id)
          .is('repository_id', null);

        if (repoOrphanedItems && repoOrphanedItems.length > 0) {
          console.log(
            `Found ${repoOrphanedItems.length} items with null repository_id, assigning to only repo...`,
          );
          const orphanedIds = repoOrphanedItems.map((item) => item.id);
          await client
            .from(TABLES.PM_BACKLOG_ITEMS)
            .update({ repository_id: repos[0].id })
            .in('id', orphanedIds);
        }
      }

      // Fetch items with selective columns for performance
      // Excludes prd_content (large text) which is lazy loaded on demand
      // Benefits included - required for detail modal display
      // CRITICAL: Filter by repository at database level for data isolation
      let query = client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .select(
          'id,title,problem,solution,type,status,area,complexity,' +
            'impact_score,effort_score,priority_score,' +
            'is_new_feature,is_banger_idea,tags,source,' +
            'updated_at,created_at,repository_id,' +
            'prd_generated_at,branch_name,pr_url,' + // prd_content lazy loaded on demand
            'risk_score,has_breaking_changes,files_affected_count,test_coverage_gaps,' +
            'user_id,analysis_run_id,' +
            'benefits', // JSON array - required for detail modal
        )
        .eq('user_id', userData.id);

      // Filter by selected repository at database level (not client-side)
      // This ensures strict data isolation between repositories
      if (selectedRepoId) {
        query = query.eq('repository_id', selectedRepoId);
      } else if (repos && repos.length > 0) {
        // If no repo selected, only show items from user's connected repos
        // This prevents showing items from disconnected/other repos
        const repoIds = repos.map((r) => r.id);
        query = query.in('repository_id', repoIds);
      }

      const { data, error: fetchError } = await query.order('priority_score', {
        ascending: false,
      });

      if (fetchError) {
        throw fetchError;
      }

      setItems((data as unknown as BacklogItem[]) || []);
      // Reset error timestamp on success
      lastFetchErrorRef.current = 0;
    } catch (err) {
      console.error('Error fetching backlog:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Track error time to rate limit retries
      lastFetchErrorRef.current = Date.now();
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [client, session, selectedRepoId]);

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
        setItems((prev) => {
          // Find previous item to detect status change
          const prevItem = prev.find((item) => item.id === updatedItem.id);

          // If status changed TO in_progress, auto-create execution_progress
          if (
            client &&
            prevItem?.status !== 'in_progress' &&
            updatedItem.status === 'in_progress'
          ) {
            // Create execution_progress record for ExecutionRunModal
            void ensureExecutionProgress(client, updatedItem.id, {
              totalWaves: 4,
              initialTask: `Starting: ${updatedItem.title}`,
            });
          }

          return prev.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          );
        });
        // Also update selected item if it's the one that changed
        if (selectedItem?.id === updatedItem.id) {
          setSelectedItem(updatedItem);
        }
      },
      [selectedItem, client],
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

  // Subscribe to autopilot run completions for toast notifications
  const { notification: autopilotNotification, dismiss: dismissAutopilot } =
    useAutopilotNotifications({
      client,
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

  // Filter items by selected repository and source filter
  const repoFilteredItems = useMemo(() => {
    let result = items;

    // Filter by repository
    if (selectedRepoId) {
      result = result.filter((item) => item.repository_id === selectedRepoId);
    }

    // Filter by source (manual vs autopilot)
    if (sourceFilter !== 'all') {
      result = result.filter((item) => item.source === sourceFilter);
    }

    return result;
  }, [items, selectedRepoId, sourceFilter]);

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

  // Filter items by active status, search query (on top of repo filter) and apply sorting
  const filteredItems = useMemo(() => {
    let result = repoFilteredItems;

    // Filter by status
    if (activeStatus) {
      result = result.filter((item) => item.status === activeStatus);
    }

    // Filter by search query (searches title, problem, solution)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const title = item.title?.toLowerCase() || '';
        const problem = item.problem?.toLowerCase() || '';
        const solution = item.solution?.toLowerCase() || '';
        return (
          title.includes(query) ||
          problem.includes(query) ||
          solution.includes(query)
        );
      });
    }

    // Apply sorting
    if (sort) {
      result = [...result].sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) {
          if (bVal === null || bVal === undefined) {
            return 0;
          }
          return sort.direction === 'asc' ? 1 : -1;
        }
        if (bVal === null || bVal === undefined) {
          return sort.direction === 'asc' ? -1 : 1;
        }

        // Compare based on type
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [repoFilteredItems, activeStatus, searchQuery, sort]);

  // Get approved item IDs for execute button (from repo-filtered items)
  const approvedItemIds = useMemo(() => {
    return repoFilteredItems
      .filter((item) => item.status === 'approved')
      .map((item) => item.id);
  }, [repoFilteredItems]);

  // Count stale approved items (approved > 2 days ago without execution)
  const staleApprovedCount = useMemo(() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    return repoFilteredItems.filter((item) => {
      if (item.status !== 'approved') {
        return false;
      }
      const updatedAt = new Date(item.updated_at);
      return updatedAt < twoDaysAgo;
    }).length;
  }, [repoFilteredItems]);

  // Get recommended items (strategic next steps)
  const recommendations = useMemo(() => {
    return getRecommendedItems(repoFilteredItems);
  }, [repoFilteredItems]);

  // Get banger idea (featured new idea) - only show NEW status bangers
  const bangerIdea = useMemo(() => {
    return repoFilteredItems.find(
      (item) => item.is_banger_idea && item.status === 'new',
    );
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
      .from(TABLES.PM_BACKLOG_ITEMS)
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

  const handleUpdatePrd = async (id: string, prdContent: string) => {
    const response = await fetch(`/api/backlog/${id}/prd`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prd_content: prdContent }),
    });

    if (!response.ok) {
      throw new Error('Failed to update PRD');
    }

    const { item: updated } = await response.json();

    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    if (selectedItem?.id === id) {
      setSelectedItem(updated);
    }
  };

  // Memoized to prevent ItemRow re-renders when parent state changes
  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

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
  // Memoized to prevent ItemRow re-renders when parent state changes
  const handleItemClick = useCallback((item: BacklogItem) => {
    setModalViewMode('details');
    setSelectedItem(item);
  }, []);

  // Handle clicking on PRD icon (opens modal with PRD view)
  // Memoized to prevent ItemRow re-renders when parent state changes
  const handlePrdClick = useCallback((item: BacklogItem) => {
    setModalViewMode('prd');
    setSelectedItem(item);
  }, []);

  // Handle clicking on a recommendation (scroll to item and highlight)
  const handleRecommendationClick = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return;
    }

    // Switch to the item's status tab if not already there
    if (activeStatus !== item.status) {
      setActiveStatus(item.status);
    }

    // Open the detail modal
    setModalViewMode('details');
    setSelectedItem(item);
  };

  // Handle quick approve from Mason Recommends
  const handleQuickApprove = async (itemId: string) => {
    await handleUpdateStatus(itemId, 'approved');
  };

  // Handle quick reject from Mason Recommends
  const handleQuickReject = async (itemId: string) => {
    await handleUpdateStatus(itemId, 'rejected');
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

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields or when modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        selectedItem
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      // Escape - Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }

      // Cmd/Ctrl+A - Select all / Deselect all
      if (isModKey && !e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedIds.length === filteredItems.length) {
          setSelectedIds([]);
        } else {
          setSelectedIds(filteredItems.map((item) => item.id));
        }
        return;
      }

      // Cmd/Ctrl+Shift+A - Approve selected
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedIds.length > 0 && !isApproving) {
          void handleBulkApprove(selectedIds);
        }
        return;
      }

      // Cmd/Ctrl+Shift+X - Reject selected
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (selectedIds.length > 0 && !isRejecting) {
          void handleBulkReject(selectedIds);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, selectedIds, filteredItems, isApproving, isRejecting]);

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
          .from(TABLES.PM_BACKLOG_ITEMS)
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
          .from(TABLES.PM_BACKLOG_ITEMS)
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
        .from(TABLES.PM_BACKLOG_ITEMS)
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
        .from(TABLES.PM_BACKLOG_ITEMS)
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

  // Confirmation dialog wrapper handlers
  const showConfirmation = (
    type: 'approve' | 'reject' | 'restore' | 'complete' | 'delete',
    ids: string[],
  ) => {
    const matchingItems = items.filter((item) => ids.includes(item.id));
    const titles = matchingItems.map((item) => item.title);
    // Include full item data for bulk approval preview (impact summary)
    setConfirmAction({ type, ids, titles, items: matchingItems });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    const { type, ids } = confirmAction;
    setConfirmAction(null);

    switch (type) {
      case 'approve':
        await handleBulkApprove(ids);
        break;
      case 'reject':
        await handleBulkReject(ids);
        break;
      case 'restore':
        await handleBulkRestore(ids);
        break;
      case 'complete':
        await handleBulkComplete(ids);
        break;
      case 'delete':
        await handleBulkDelete(ids);
        break;
    }
  };

  const getConfirmationConfig = () => {
    if (!confirmAction) {
      return null;
    }

    const configs = {
      approve: {
        title: 'Approve Items',
        message:
          'Are you sure you want to approve these items? They will be moved to the approved queue.',
        confirmLabel: 'Approve',
        confirmVariant: 'approve' as const,
      },
      reject: {
        title: 'Reject Items',
        message:
          'Are you sure you want to reject these items? They will be moved to the rejected list.',
        confirmLabel: 'Reject',
        confirmVariant: 'reject' as const,
      },
      restore: {
        title: 'Restore Items',
        message:
          'Are you sure you want to restore these items? They will be moved back to the new queue.',
        confirmLabel: 'Restore',
        confirmVariant: 'restore' as const,
      },
      complete: {
        title: 'Mark as Completed',
        message: 'Are you sure you want to mark these items as completed?',
        confirmLabel: 'Mark Completed',
        confirmVariant: 'complete' as const,
      },
      delete: {
        title: 'Delete Items',
        message:
          'Are you sure you want to permanently delete these items? This action cannot be undone after the undo period expires.',
        confirmLabel: 'Delete',
        confirmVariant: 'danger' as const,
      },
    };

    return configs[confirmAction.type];
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
                  Your Build Queue
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Mason found these. You decide what ships.
                </p>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
          <div className="rounded-lg border border-gray-800 bg-black/50 p-6 md:p-8 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 md:h-16 md:w-16 text-gray-600" />
            <h2 className="mb-2 text-lg md:text-xl font-semibold text-white">
              Let&apos;s get you set up
            </h2>
            <p className="mb-6 text-base text-gray-400">
              Mason stores all your data in your own Supabase database. Complete
              the setup wizard to connect your database and start building.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 min-h-[44px] font-medium text-navy transition-opacity hover:opacity-90 touch-feedback"
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
        <div className="mx-auto max-w-7xl px-4 py-8 md:p-8">
          <ErrorBanner
            error={new Error(error)}
            onRetry={fetchItems}
            onDismiss={() => setError(null)}
            dismissible={true}
            className="text-base"
          />
          {/* Mobile-friendly retry button with proper touch target */}
          <div className="mt-6 flex justify-center md:hidden">
            <button
              onClick={fetchItems}
              className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-gold text-navy font-medium touch-feedback"
            >
              <RefreshCw className="w-5 h-5" />
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
            <div className="flex items-center gap-4">
              <MasonMark size="lg" />
              <div className="h-10 w-px bg-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Your Build Queue
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Mason found these. You decide what ships.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session && (
                <RepositorySelector
                  value={selectedRepoId}
                  onChange={setSelectedRepoId}
                />
              )}

              <button
                onClick={() => {
                  setGenerateModalMode('full');
                  setShowGenerateIdeasModal(true);
                }}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 min-h-[40px] bg-gold text-navy font-medium whitespace-nowrap hover:bg-gold/90 transition-colors touch-feedback"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Generate New Ideas</span>
              </button>

              <button
                onClick={fetchItems}
                disabled={isLoading}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 min-h-[40px] border border-gray-700 text-gray-300 whitespace-nowrap hover:bg-white/5 disabled:opacity-50 touch-feedback"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
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
                counts={counts}
                staleApprovedCount={staleApprovedCount}
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

      {/* Mason Recommends Section - only on "All" (null) and "New" tabs */}
      {!isEmpty &&
        !isLoading &&
        recommendations.length > 0 &&
        (activeStatus === null || activeStatus === 'new') && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <MasonRecommends
              recommendations={recommendations}
              onItemClick={handleRecommendationClick}
              onApprove={handleQuickApprove}
              onReject={handleQuickReject}
            />
          </div>
        )}

      {/* Banger Idea Section - only on NEW tab */}
      {!isEmpty && !isLoading && activeStatus === 'new' && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          {bangerIdea ? (
            <BangerIdeaCard
              item={bangerIdea}
              onViewDetails={handleItemClick}
              onApprove={handleQuickApprove}
              onReject={handleQuickReject}
              onGenerateNew={() => {
                setGenerateModalMode('banger');
                setShowGenerateIdeasModal(true);
              }}
            />
          ) : (
            <BangerEmptyState
              onGenerateNew={() => {
                setGenerateModalMode('banger');
                setShowGenerateIdeasModal(true);
              }}
            />
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        <ErrorBoundary section="Backlog">
          {isLoading ? (
            // Skeleton loading state matching ImprovementsTable columns
            <div className="p-6">
              <ImprovementsTableSkeleton rows={5} />
            </div>
          ) : isEmpty ? (
            // Empty state onboarding
            <EmptyStateOnboarding onRefresh={fetchItems} />
          ) : (
            <div className="space-y-6 p-6">
              {/* Search and Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search backlog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/50 border border-gray-700 text-gray-300 text-sm placeholder-gray-500 focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Source Filter Dropdown */}
                <select
                  value={sourceFilter}
                  onChange={(e) =>
                    setSourceFilter(
                      e.target.value as 'all' | 'manual' | 'autopilot',
                    )
                  }
                  className="px-3 py-2 bg-black/50 border border-gray-700 text-gray-300 text-sm focus:outline-none focus:border-gold"
                >
                  <option value="all">All Sources</option>
                  <option value="manual">Manual Only</option>
                  <option value="autopilot">Autopilot Only</option>
                </select>

                {/* Result count */}
                <span className="text-sm text-gray-500">
                  {filteredItems.length} item
                  {filteredItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* All items in unified table - Features and Bangers shown with badges */}
              <ImprovementsTable
                items={filteredItems}
                selectedIds={selectedIds}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                onItemClick={handleItemClick}
                onPrdClick={handlePrdClick}
                onApprove={handleQuickApprove}
                onReject={handleQuickReject}
                sort={sort}
                onSortChange={handleSortChange}
                activeStatus={activeStatus}
              />
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ErrorBoundary
          section="Item Details"
          onError={() => setSelectedItem(null)}
        >
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdateStatus={handleUpdateStatus}
            onGeneratePrd={handleGeneratePrd}
            onUpdatePrd={handleUpdatePrd}
            initialViewMode={modalViewMode}
          />
        </ErrorBoundary>
      )}

      {/* Execution Progress Modal - Shows all items in the run */}
      {executingItemId && executionRunId && client && (
        <ExecutionRunModal
          runId={executionRunId}
          initialItemId={executingItemId}
          initialItemTitle={executingItemTitle ?? undefined}
          client={client}
          onComplete={() => {
            setExecutionRunId(null);
            setExecutingItemId(null);
            setExecutingItemTitle(null);
            void fetchItems(); // Refresh to show updated statuses
          }}
          onClose={() => {
            setExecutionRunId(null);
            setExecutingItemId(null);
            setExecutingItemTitle(null);
            void fetchItems(); // Refresh to show updated statuses
          }}
        />
      )}

      {/* Generate Ideas Wizard */}
      <GenerateIdeasWizard
        isOpen={showGenerateIdeasModal}
        onClose={() => {
          setShowGenerateIdeasModal(false);
          setGenerateModalMode('full'); // Reset to default mode
        }}
        initialMode={generateModalMode}
      />

      {/* Copy Success Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-5 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white shadow-lg">
            <Check className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Command copied!</span>
              <span className="text-sm text-green-100">
                Paste into Claude Code to execute
              </span>
            </div>
            <button
              onClick={() => setCopiedToast(false)}
              className="ml-2 p-1 hover:bg-green-700 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Execution Error Toast */}
      {executionError && (
        <ErrorToast
          message={executionError}
          onDismiss={() => setExecutionError(null)}
          duration={8000}
        />
      )}

      {/* Autopilot Notification Toast */}
      {autopilotNotification && (
        <AutopilotToast
          type={autopilotNotification.type}
          title={autopilotNotification.title}
          message={autopilotNotification.message}
          onDismiss={dismissAutopilot}
        />
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-8 mt-8 border-t border-gray-800">
        <PoweredByFooter showCTA={true} />
      </div>

      {/* Quick Start FAB */}
      <QuickStartFAB />

      {/* Bulk Actions Bar - hidden when detail modal is open */}
      {!selectedItem && (
        <BulkActionsBar
          selectedItems={selectedItems}
          onApprove={(ids) => showConfirmation('approve', ids)}
          onReject={(ids) => showConfirmation('reject', ids)}
          onRestore={(ids) => showConfirmation('restore', ids)}
          onComplete={(ids) => showConfirmation('complete', ids)}
          onDelete={(ids) => showConfirmation('delete', ids)}
          onClearSelection={handleClearSelection}
          isApproving={isApproving}
          isRejecting={isRejecting}
          isRestoring={isRestoring}
          isCompleting={isCompleting}
          isDeleting={isDeleting}
        />
      )}

      {/* Bulk Action Confirmation Dialog */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={getConfirmationConfig()?.title ?? ''}
          message={getConfirmationConfig()?.message ?? ''}
          itemCount={confirmAction.ids.length}
          itemTitles={confirmAction.titles}
          confirmLabel={getConfirmationConfig()?.confirmLabel ?? 'Confirm'}
          confirmVariant={getConfirmationConfig()?.confirmVariant ?? 'approve'}
          isLoading={
            isApproving ||
            isRejecting ||
            isRestoring ||
            isCompleting ||
            isDeleting
          }
          items={confirmAction.items}
        />
      )}

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
