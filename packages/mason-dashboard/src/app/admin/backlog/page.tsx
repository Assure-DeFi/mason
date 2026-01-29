'use client';

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatsBar } from '@/components/backlog/stats-bar';
import { StatusTabs, type TabStatus } from '@/components/backlog/status-tabs';
import { FilteredItemsTab } from './components/filtered-items-tab';
import { ImprovementsTable } from '@/components/backlog/improvements-table';
import { ItemDetailModal } from '@/components/backlog/item-detail-modal';
import { EmptyStateOnboarding } from '@/components/backlog/EmptyStateOnboarding';
import { UnifiedExecuteButton } from '@/components/backlog/UnifiedExecuteButton';
import { BulkActionsBar } from '@/components/backlog/bulk-actions-bar';
import { ConfirmationDialog } from '@/components/backlog/confirmation-dialog';
import { UserMenu } from '@/components/auth/user-menu';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { ExecutionProgress } from '@/components/execution/execution-progress';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { BacklogFilters } from '@/components/backlog/backlog-filters';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { API_ROUTES } from '@/lib/constants';
import type {
  BacklogItem,
  BacklogStatus,
  StatusCounts,
  BacklogArea,
  BacklogType,
  SortField,
  SortDirection,
} from '@/types/backlog';
import { getComplexityValue } from '@/types/backlog';
import {
  RefreshCw,
  Database,
  ArrowRight,
  Search,
  Loader2,
  Undo2,
  Sparkles,
} from 'lucide-react';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { PMReviewModal } from '@/components/pm-review/PMReviewModal';

interface UndoState {
  items: { id: string; previousStatus: BacklogStatus }[];
  action: 'approve' | 'reject';
  expiresAt: number;
}

interface BulkProgress {
  current: number;
  total: number;
}

// Wrapper component that provides Suspense boundary
export default function BacklogPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-navy">
          <div className="p-8">
            <SkeletonTable rows={5} columns={5} />
          </div>
        </main>
      }
    >
      <BacklogPageContent />
    </Suspense>
  );
}

function BacklogPageContent() {
  const { data: session } = useSession();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();
  const { token: githubToken, hasToken } = useGitHubToken();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<TabStatus>('new');
  const [filteredCount, setFilteredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isStartingExecution, setIsStartingExecution] = useState(false);

  // PM Review modal state
  const [showPMReviewModal, setShowPMReviewModal] = useState(false);
  const [pmReviewCopiedToast, setPmReviewCopiedToast] = useState(false);

  // Bulk action loading states
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [generationProgress, setGenerationProgress] =
    useState<BulkProgress | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject';
    ids: string[];
    titles: string[];
  }>({ isOpen: false, action: 'approve', ids: [], titles: [] });

  // Undo state
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Last selected item for shift+click range selection
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Sort state
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);

  // Initialize filter states from URL
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || '',
  );
  const [selectedAreas, setSelectedAreas] = useState<BacklogArea[]>(() => {
    const areas = searchParams.get('areas');
    return areas ? (areas.split(',') as BacklogArea[]) : [];
  });
  const [selectedTypes, setSelectedTypes] = useState<BacklogType[]>(() => {
    const types = searchParams.get('types');
    return types ? (types.split(',') as BacklogType[]) : [];
  });
  const [complexityRange, setComplexityRange] = useState<[number, number]>(
    () => {
      const min = searchParams.get('complexityMin');
      const max = searchParams.get('complexityMax');
      return [min ? parseInt(min) : 1, max ? parseInt(max) : 5];
    },
  );
  const [effortRange, setEffortRange] = useState<[number, number]>(() => {
    const min = searchParams.get('effortMin');
    const max = searchParams.get('effortMax');
    return [min ? parseInt(min) : 1, max ? parseInt(max) : 10];
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sync filter state to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('search', searchQuery);
    if (selectedAreas.length > 0) params.set('areas', selectedAreas.join(','));
    if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
    if (complexityRange[0] !== 1)
      params.set('complexityMin', complexityRange[0].toString());
    if (complexityRange[1] !== 5)
      params.set('complexityMax', complexityRange[1].toString());
    if (effortRange[0] !== 1)
      params.set('effortMin', effortRange[0].toString());
    if (effortRange[1] !== 10)
      params.set('effortMax', effortRange[1].toString());
    if (activeStatus && activeStatus !== 'new')
      params.set('status', activeStatus);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    router.replace(newUrl, { scroll: false });
  }, [
    searchQuery,
    selectedAreas,
    selectedTypes,
    complexityRange,
    effortRange,
    activeStatus,
    router,
  ]);

  // Initialize status from URL
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== activeStatus) {
      setActiveStatus(urlStatus as TabStatus);
    }
  }, [searchParams, activeStatus]);

  const fetchFilteredCount = useCallback(async () => {
    if (!client) return;

    try {
      let query = client
        .from('mason_pm_filtered_items')
        .select('*', { count: 'exact', head: true })
        .eq('override_status', 'filtered');

      // Filter by repository if selected
      if (selectedRepoId) {
        query = query.eq('repository_id', selectedRepoId);
      }

      const { count, error: countError } = await query;

      if (!countError && count !== null) {
        setFilteredCount(count);
      }
    } catch (err) {
      console.error('Error fetching filtered count:', err);
    }
  }, [client, selectedRepoId]);

  const fetchItems = useCallback(async () => {
    if (!client) {
      if (!isDbLoading) {
        setError('Database not configured. Please complete setup.');
      }
      setIsLoading(false);
      return;
    }

    if (!session?.user) {
      setError('Please sign in to view your backlog.');
      setIsLoading(false);
      return;
    }

    // Wait for repository selection before fetching
    if (!selectedRepoId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await client
        .from('mason_pm_backlog_items')
        .select('*')
        .eq('repository_id', selectedRepoId)
        .order('priority_score', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setItems(data || []);

      // Also fetch filtered count
      fetchFilteredCount();
    } catch (err) {
      console.error('Error fetching backlog:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch data from database',
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, session, isDbLoading, selectedRepoId, fetchFilteredCount]);

  useEffect(() => {
    if (isConfigured && !isDbLoading) {
      fetchItems();
    } else if (!isDbLoading && !isConfigured) {
      setIsLoading(false);
    }
  }, [fetchItems, isConfigured, isDbLoading]);

  // Real-time subscription - filters by selected repository
  useEffect(() => {
    if (!client || !isConfigured || !selectedRepoId) return;

    const channel = client
      .channel(`mason_pm_backlog_changes_${selectedRepoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mason_pm_backlog_items',
          filter: `repository_id=eq.${selectedRepoId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => {
              const newItem = payload.new as BacklogItem;
              // Only add if it matches the current repository
              if (newItem.repository_id !== selectedRepoId) return prev;
              const updated = [...prev, newItem].sort(
                (a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0),
              );
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as BacklogItem;
            // If repository changed and no longer matches, remove from list
            if (updatedItem.repository_id !== selectedRepoId) {
              setItems((prev) =>
                prev.filter((item) => item.id !== updatedItem.id),
              );
              if (selectedItem?.id === updatedItem.id) {
                setSelectedItem(null);
              }
              return;
            }
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? (payload.new as BacklogItem)
                  : item,
              ),
            );
            if (selectedItem?.id === payload.new.id) {
              setSelectedItem(payload.new as BacklogItem);
            }
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
            if (selectedItem?.id === payload.old.id) {
              setSelectedItem(null);
            }
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, isConfigured, selectedRepoId, selectedItem?.id]);

  // Calculate counts
  const counts: StatusCounts = useMemo(() => {
    const result: StatusCounts = {
      total: items.length,
      new: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      deferred: 0,
      rejected: 0,
    };

    items.forEach((item) => {
      result[item.status]++;
    });

    return result;
  }, [items]);

  // Check if viewing filtered items tab
  const isViewingFiltered = activeStatus === 'filtered';

  // Advanced filtering and sorting
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Status filter (skip for 'filtered' tab since it's a separate table)
    if (activeStatus && activeStatus !== 'filtered') {
      filtered = filtered.filter((item) => item.status === activeStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.problem.toLowerCase().includes(query) ||
          item.solution.toLowerCase().includes(query),
      );
    }

    // Area filter
    if (selectedAreas.length > 0) {
      filtered = filtered.filter((item) => selectedAreas.includes(item.area));
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((item) => selectedTypes.includes(item.type));
    }

    // Complexity filter
    filtered = filtered.filter((item) => {
      const numericComplexity = getComplexityValue(item.complexity);
      return (
        numericComplexity >= complexityRange[0] &&
        numericComplexity <= complexityRange[1]
      );
    });

    // Effort filter
    filtered = filtered.filter(
      (item) =>
        item.effort_score >= effortRange[0] &&
        item.effort_score <= effortRange[1],
    );

    // Apply sorting
    if (sort) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sort.field) {
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'type':
            aVal = a.type;
            bVal = b.type;
            break;
          case 'priority_score':
            aVal = a.priority_score;
            bVal = b.priority_score;
            break;
          case 'complexity':
            aVal = getComplexityValue(a.complexity);
            bVal = getComplexityValue(b.complexity);
            break;
          case 'area':
            aVal = a.area;
            bVal = b.area;
            break;
          case 'updated_at':
            aVal = new Date(a.updated_at).getTime();
            bVal = new Date(b.updated_at).getTime();
            break;
          case 'impact_score':
            aVal = a.impact_score;
            bVal = b.impact_score;
            break;
          case 'effort_score':
            aVal = a.effort_score;
            bVal = b.effort_score;
            break;
          case 'created_at':
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    items,
    activeStatus,
    searchQuery,
    selectedAreas,
    selectedTypes,
    complexityRange,
    effortRange,
    sort,
  ]);

  const handleSortChange = useCallback((field: SortField) => {
    setSort((prev) => {
      if (prev?.field === field) {
        // Toggle direction or clear
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' };
        }
        return null; // Clear sort on third click
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const approvedItemIds = useMemo(() => {
    return items
      .filter((item) => item.status === 'approved')
      .map((item) => item.id);
  }, [items]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const handleRestoreComplete = useCallback(() => {
    fetchItems();
    fetchFilteredCount();
  }, [fetchItems, fetchFilteredCount]);

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

    const data = await response.json();

    if (!response.ok) {
      // Parse specific error types for better user feedback
      if (data.error === 'AI_KEY_NOT_CONFIGURED') {
        throw new Error(
          'AI_KEY_NOT_CONFIGURED: No AI provider configured. Go to Settings > AI Providers to add your API key.',
        );
      }
      if (data.error === 'AI_KEY_INVALID') {
        throw new Error(
          'AI_KEY_INVALID: Your AI provider key is invalid. Please check your key in Settings > AI Providers.',
        );
      }
      throw new Error(data.message || data.error || 'Failed to generate PRD');
    }

    setItems((prev) => prev.map((item) => (item.id === id ? data : item)));

    if (selectedItem?.id === id) {
      setSelectedItem(data);
    }
  };

  const handleSelectItem = useCallback(
    (id: string, event?: React.MouseEvent) => {
      if (event?.shiftKey && lastSelectedId) {
        // Shift+click: select range
        const itemIds = filteredItems.map((item) => item.id);
        const lastIndex = itemIds.indexOf(lastSelectedId);
        const currentIndex = itemIds.indexOf(id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = itemIds.slice(start, end + 1);

          setSelectedIds((prev) => {
            const newSelection = new Set(prev);
            rangeIds.forEach((rangeId) => newSelection.add(rangeId));
            return Array.from(newSelection);
          });
        }
      } else {
        // Normal click: toggle selection
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
        setLastSelectedId(id);
      }
    },
    [lastSelectedId, filteredItems],
  );

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
      setLastSelectedId(null);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const handleBulkGeneratePrds = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsBulkGenerating(true);
    setGenerationProgress({ current: 0, total: ids.length });

    try {
      // Generate PRDs sequentially to avoid overwhelming the API
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        setGenerationProgress({ current: i + 1, total: ids.length });

        const response = await fetch(`/api/prd/${id}`, {
          method: 'POST',
        });

        if (!response.ok) {
          console.error(`Failed to generate PRD for ${id}`);
          continue;
        }

        const updated = await response.json();
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item)),
        );
      }
    } catch (err) {
      console.error('Bulk PRD generation error:', err);
    } finally {
      setIsBulkGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleBulkApproveRequest = (ids: string[]) => {
    if (ids.length === 0) return;
    const titles = items
      .filter((item) => ids.includes(item.id))
      .map((item) => item.title);
    setConfirmDialog({ isOpen: true, action: 'approve', ids, titles });
  };

  const handleBulkRejectRequest = (ids: string[]) => {
    if (ids.length === 0) return;
    const titles = items
      .filter((item) => ids.includes(item.id))
      .map((item) => item.title);
    setConfirmDialog({ isOpen: true, action: 'reject', ids, titles });
  };

  const handleConfirmBulkAction = async () => {
    if (!client) return;

    const { action, ids } = confirmDialog;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Store previous states for undo
    const previousStates = items
      .filter((item) => ids.includes(item.id))
      .map((item) => ({ id: item.id, previousStatus: item.status }));

    if (action === 'approve') {
      setIsBulkApproving(true);
    } else {
      setIsBulkRejecting(true);
    }

    try {
      const { data: updated, error: updateError } = await client
        .from('mason_pm_backlog_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select();

      if (updateError) {
        throw updateError;
      }

      if (updated) {
        setItems((prev) =>
          prev.map((item) => {
            const match = updated.find((u) => u.id === item.id);
            return match ? match : item;
          }),
        );
      }
      setSelectedIds([]);
      setConfirmDialog({
        isOpen: false,
        action: 'approve',
        ids: [],
        titles: [],
      });

      // Set up undo state
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      const expiresAt = Date.now() + 30000; // 30 seconds
      setUndoState({ items: previousStates, action, expiresAt });

      undoTimeoutRef.current = setTimeout(() => {
        setUndoState(null);
      }, 30000);
    } catch (err) {
      console.error(`Bulk ${action} error:`, err);
    } finally {
      setIsBulkApproving(false);
      setIsBulkRejecting(false);
    }
  };

  const handleUndo = async () => {
    if (!client || !undoState) return;

    try {
      // Restore each item to its previous status
      for (const { id, previousStatus } of undoState.items) {
        await client
          .from('mason_pm_backlog_items')
          .update({
            status: previousStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      }

      // Refresh items
      fetchItems();

      // Clear undo state
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      setUndoState(null);
    } catch (err) {
      console.error('Undo error:', err);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setLastSelectedId(null);
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

  const handleRemoteExecute = async (itemIds: string[]) => {
    if (!selectedRepoId) {
      setExecutionError('Please select a repository first');
      return;
    }

    if (!githubToken) {
      setExecutionError(
        'GitHub token not found. Please sign out and sign back in.',
      );
      return;
    }

    setIsStartingExecution(true);
    setExecutionError(null);

    try {
      const response = await fetch(API_ROUTES.EXECUTION_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: selectedRepoId,
          itemIds,
          githubToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start execution');
      }

      if (!data.runId) {
        throw new Error('No run ID returned from server');
      }

      setExecutionRunId(data.runId);
    } catch (err) {
      console.error('Failed to start remote execution:', err);
      setExecutionError(
        err instanceof Error ? err.message : 'Failed to start execution',
      );
    } finally {
      setIsStartingExecution(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAreas([]);
    setSelectedTypes([]);
    setComplexityRange([1, 5]);
    setEffortRange([1, 10]);
    setSort(null);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedAreas.length > 0 ||
    selectedTypes.length > 0 ||
    complexityRange[0] !== 1 ||
    complexityRange[1] !== 5 ||
    effortRange[0] !== 1 ||
    effortRange[1] !== 10;

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
              className="inline-flex items-center gap-2 bg-gold px-6 py-3 font-semibold text-navy transition-opacity hover:opacity-90"
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
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-red-600 px-4 py-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isEmpty = !isLoading && items.length === 0;

  return (
    <main className="min-h-screen bg-navy">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-black/20">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                System Improvements
              </h1>
              <p className="text-gray-400 text-sm mt-2">
                Manage and track improvement ideas from PM reviews
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPMReviewModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#E2D243] text-[#0A0724] font-semibold hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Improvement Ideas</span>
              </button>

              {session && (
                <RepositorySelector
                  value={selectedRepoId}
                  onChange={setSelectedRepoId}
                />
              )}

              <button
                onClick={fetchItems}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span className="font-medium">Refresh</span>
              </button>

              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {!isEmpty && (
        <>
          {/* Stats Bar */}
          <StatsBar counts={counts} />

          {/* Filters & Search Bar */}
          <div className="border-b border-gray-800/50 bg-black/10">
            <div className="max-w-7xl mx-auto px-8 py-4">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search improvements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2.5 border font-medium transition-all ${
                    showFilters || hasActiveFilters
                      ? 'border-gold/50 bg-gold/10 text-gold'
                      : 'border-gray-700 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-gold text-navy rounded-full font-bold">
                      !
                    </span>
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-4 p-4 bg-black/30 border border-gray-800">
                  <BacklogFilters
                    selectedAreas={selectedAreas}
                    selectedTypes={selectedTypes}
                    complexityRange={complexityRange}
                    effortRange={effortRange}
                    onAreasChange={setSelectedAreas}
                    onTypesChange={setSelectedTypes}
                    onComplexityChange={setComplexityRange}
                    onEffortChange={setEffortRange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status Tabs with Execute Button */}
          <div className="border-b border-gray-800/50 bg-black/5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <StatusTabs
                activeStatus={activeStatus}
                onStatusChange={setActiveStatus}
                onExecuteAll={handleExecuteAll}
                approvedCount={counts.approved}
                filteredCount={filteredCount}
              />

              {session && counts.approved > 0 && (
                <div className="px-8 py-3">
                  <UnifiedExecuteButton
                    itemIds={approvedItemIds}
                    repositoryId={selectedRepoId}
                    onRemoteExecute={handleRemoteExecute}
                    remoteAvailable={
                      !!selectedRepoId && hasToken && !isStartingExecution
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="p-8">
            <SkeletonTable rows={5} columns={5} />
          </div>
        ) : isEmpty ? (
          <EmptyStateOnboarding onRefresh={fetchItems} />
        ) : isViewingFiltered ? (
          <FilteredItemsTab onRestoreComplete={handleRestoreComplete} />
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-500 text-lg mb-4">
              No items match your filters
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-gold text-navy font-semibold hover:opacity-90 transition-opacity"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <ImprovementsTable
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onItemClick={setSelectedItem}
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
        />
      )}

      {/* Execution Progress Modal */}
      {executionRunId && (
        <ExecutionProgress
          runId={executionRunId}
          onClose={() => {
            setExecutionRunId(null);
            fetchItems();
          }}
        />
      )}

      {/* PM Review Modal */}
      <PMReviewModal
        isOpen={showPMReviewModal}
        onClose={() => setShowPMReviewModal(false)}
        onCopyCommand={() => {
          setPmReviewCopiedToast(true);
          setTimeout(() => setPmReviewCopiedToast(false), 3000);
        }}
        repositoryId={selectedRepoId}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedItems={selectedItems}
        onGeneratePrds={handleBulkGeneratePrds}
        onApprove={handleBulkApproveRequest}
        onReject={handleBulkRejectRequest}
        onClearSelection={handleClearSelection}
        isGenerating={isBulkGenerating}
        isApproving={isBulkApproving}
        isRejecting={isBulkRejecting}
        generationProgress={generationProgress}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({
            isOpen: false,
            action: 'approve',
            ids: [],
            titles: [],
          })
        }
        onConfirm={handleConfirmBulkAction}
        title={
          confirmDialog.action === 'approve'
            ? 'Confirm Bulk Approve'
            : 'Confirm Bulk Reject'
        }
        message={
          confirmDialog.action === 'approve'
            ? 'Are you sure you want to approve these items? They will be marked as ready for implementation.'
            : 'Are you sure you want to reject these items? They will be removed from the active backlog.'
        }
        itemCount={confirmDialog.ids.length}
        itemTitles={confirmDialog.titles}
        confirmLabel={
          confirmDialog.action === 'approve' ? 'Approve All' : 'Reject All'
        }
        confirmVariant={
          confirmDialog.action === 'approve' ? 'approve' : 'reject'
        }
        isLoading={isBulkApproving || isBulkRejecting}
      />

      {/* Toast Notifications */}
      {copiedToast && (
        <div className="fixed bottom-8 right-8 px-6 py-4 bg-green-600 text-white font-medium shadow-2xl animate-fade-in">
          Command copied! Paste into Claude Code to execute.
        </div>
      )}

      {/* PM Review Toast */}
      {pmReviewCopiedToast && (
        <div className="fixed bottom-8 right-8 px-6 py-4 bg-green-600 text-white font-medium shadow-2xl animate-fade-in">
          Command copied! Paste into Claude Code to run.
        </div>
      )}

      {/* Undo Toast */}
      {undoState && (
        <div className="fixed bottom-8 right-8 px-6 py-4 bg-gray-800 border border-gray-700 text-white font-medium shadow-2xl animate-fade-in flex items-center gap-4">
          <span>
            {undoState.items.length} item
            {undoState.items.length !== 1 ? 's' : ''}{' '}
            {undoState.action === 'approve' ? 'approved' : 'rejected'}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 px-3 py-1.5 bg-gold text-navy font-semibold hover:opacity-90 transition-opacity"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        </div>
      )}

      {executionError && (
        <div className="fixed bottom-8 right-8 px-6 py-4 bg-red-600 text-white font-medium shadow-2xl flex items-center gap-4">
          {executionError}
          <button
            onClick={() => setExecutionError(null)}
            className="text-white/80 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <PoweredByFooter showCTA />
      </div>
    </main>
  );
}
