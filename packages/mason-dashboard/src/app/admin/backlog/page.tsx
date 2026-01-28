'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { StatsBar } from '@/components/backlog/stats-bar';
import { StatusTabs } from '@/components/backlog/status-tabs';
import { ImprovementsTable } from '@/components/backlog/improvements-table';
import { ItemDetailModal } from '@/components/backlog/item-detail-modal';
import { UserMenu } from '@/components/auth/user-menu';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { RemoteExecuteButton } from '@/components/execution/remote-execute-button';
import { ExecutionProgress } from '@/components/execution/execution-progress';
import type { BacklogItem, BacklogStatus, StatusCounts } from '@/types/backlog';
import { RefreshCw } from 'lucide-react';

export default function BacklogPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<BacklogStatus | null>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Fetch all items (no filter - we filter client-side for counts)
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backlog');

      if (!response.ok) {
        throw new Error('Failed to fetch backlog items');
      }

      const data = await response.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
    if (!activeStatus) return items;
    return items.filter((item) => item.status === activeStatus);
  }, [items, activeStatus]);

  // Get approved item IDs for execute button
  const approvedItemIds = useMemo(() => {
    return items
      .filter((item) => item.status === 'approved')
      .map((item) => item.id);
  }, [items]);

  const handleUpdateStatus = async (id: string, status: BacklogStatus) => {
    const response = await fetch(`/api/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    const updated = await response.json();

    // Update local state
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    // Update selected item if it's the one being updated
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

    // Update local state
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

    // Update selected item
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

  // Error state
  if (error && !isLoading) {
    return (
      <main className="min-h-screen bg-navy">
        <div className="max-w-7xl mx-auto p-8">
          <div className="p-8 bg-red-900/20 border border-red-800 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={fetchItems}
              className="px-4 py-2 bg-red-600 hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

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

      {/* Stats Bar */}
      <StatsBar counts={counts} />

      {/* Status Tabs with Remote Execute */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <StatusTabs
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            onExecuteAll={handleExecuteAll}
            approvedCount={counts.approved}
          />

          {session && activeStatus === 'approved' && counts.approved > 0 && (
            <div className="px-6 py-3">
              <RemoteExecuteButton
                itemIds={approvedItemIds}
                repositoryId={selectedRepoId}
                onExecutionStart={(runId) => {
                  setExecutionRunId(runId);
                  setExecutionError(null);
                }}
                onError={setExecutionError}
              />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <ImprovementsTable
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onItemClick={setSelectedItem}
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
            fetchItems(); // Refresh to show updated statuses
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
    </main>
  );
}
