'use client';

import { RefreshCw, Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { EmptyStateOnboarding } from '@/components/backlog/EmptyStateOnboarding';
import { FirstItemCelebration } from '@/components/backlog/FirstItemCelebration';
import { ImprovementsTable } from '@/components/backlog/improvements-table';
import { ItemDetailModal } from '@/components/backlog/item-detail-modal';
import { StatsBar } from '@/components/backlog/stats-bar';
import { StatusTabs, type TabStatus } from '@/components/backlog/status-tabs';
import { UnifiedExecuteButton } from '@/components/backlog/UnifiedExecuteButton';
import { ExecutionProgress } from '@/components/execution/execution-progress';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { NextStepBanner } from '@/components/ui/NextStepBanner';
import { OnboardingProgress } from '@/components/ui/OnboardingProgress';
import { QuickStartFAB } from '@/components/ui/QuickStartFAB';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import type {
  BacklogItem,
  BacklogStatus,
  StatusCounts,
  SortField,
  SortDirection,
} from '@/types/backlog';

export default function BacklogPage() {
  const { data: session } = useSession();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<TabStatus>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);

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
      const { data: userData } = await client
        .from('mason_users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        setItems([]);
        return;
      }

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

  // Show celebration when items first load
  useEffect(() => {
    if (!isLoading && items.length > 0) {
      const hasSeen = localStorage.getItem('mason_has_seen_first_items');
      if (!hasSeen) {
        setShowCelebration(true);
      }
    }
  }, [isLoading, items.length]);

  // Calculate counts for stats bar
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

  // Filter items by active status
  const filteredItems = useMemo(() => {
    if (!activeStatus) {
      return items;
    }
    return items.filter((item) => item.status === activeStatus);
  }, [items, activeStatus]);

  // Get approved item IDs for execute button
  const approvedItemIds = useMemo(() => {
    return items
      .filter((item) => item.status === 'approved')
      .map((item) => item.id);
  }, [items]);

  // Determine the contextual next step
  const nextStepContext = useMemo(() => {
    if (items.length === 0) {
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

  const _handleRemoteExecute = (_itemIds: string[]) => {
    // Start remote execution - handled by the UnifiedExecuteButton modal
    // This would integrate with the existing RemoteExecuteButton logic
    setExecutionRunId('starting'); // Placeholder - would get actual run ID
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
            void fetchItems(); // Refresh to show updated statuses
          }}
        />
      )}

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
