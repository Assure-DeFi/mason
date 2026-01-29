'use client';

import { clsx } from 'clsx';
import {
  AlertTriangle,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import type { FilteredItem, FilterTier } from '@/types/backlog';

interface FilteredItemsTabProps {
  onRestoreComplete?: () => void;
  selectedRepoId?: string | null;
}

const TIER_LABELS: Record<FilterTier, { label: string; color: string }> = {
  tier1: { label: 'Pattern Match', color: 'text-gray-400' },
  tier2: { label: 'Contextual', color: 'text-yellow-400' },
  tier3: { label: 'Impact', color: 'text-orange-400' },
};

export function FilteredItemsTab({
  onRestoreComplete,
  selectedRepoId,
}: FilteredItemsTabProps) {
  const { client } = useUserDatabase();
  const [items, setItems] = useState<FilteredItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchFilteredItems = useCallback(async () => {
    if (!client) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = client
        .from('mason_pm_filtered_items')
        .select('*')
        .eq('override_status', 'filtered');

      // Filter by repository if selected (include items with no repo for backwards compatibility)
      if (selectedRepoId) {
        query = query.or(
          `repository_id.eq.${selectedRepoId},repository_id.is.null`,
        );
      }

      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) {
        throw fetchError;
      }

      setItems(data || []);
    } catch (err) {
      console.error('Error fetching filtered items:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch filtered items',
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, selectedRepoId]);

  useEffect(() => {
    void fetchFilteredItems();
  }, [fetchFilteredItems]);

  const handleRestore = async (item: FilteredItem) => {
    if (!client) {
      return;
    }

    setRestoringId(item.id);

    try {
      const response = await fetch('/api/backlog/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filteredItemId: item.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore item');
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onRestoreComplete?.();
    } catch (err) {
      console.error('Error restoring item:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore item');
    } finally {
      setRestoringId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchFilteredItems();
    setIsRetrying(false);
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="border border-red-800 bg-red-900/20 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-700 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
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
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800/50 mb-4">
          <Eye className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No Filtered Items
        </h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Items that are identified as false positives during PM review
          validation will appear here. You can restore any item if you disagree
          with the filtering decision.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/50">
      {/* Header */}
      <div className="px-8 py-4 bg-black/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Filtered Items
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} filtered as
              false positives
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-gray-800/30">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const tierInfo = TIER_LABELS[item.filter_tier];
          const isRestoring = restoringId === item.id;

          return (
            <div
              key={item.id}
              className="bg-black/10 hover:bg-black/20 transition-colors"
            >
              {/* Row Header */}
              <div className="px-8 py-4 flex items-center gap-4">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="flex-shrink-0 p-1 text-gray-500 hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={clsx('text-xs font-medium', tierInfo.color)}
                    >
                      {tierInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(item.filter_confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(item)}
                  disabled={isRestoring}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all',
                    'border border-gray-700 text-gray-300',
                    'hover:border-gold/50 hover:text-gold hover:bg-gold/5',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <RotateCcw
                    className={clsx('w-4 h-4', isRestoring && 'animate-spin')}
                  />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-8 pb-6 pl-16 space-y-4">
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Filter Reason
                    </h5>
                    <p className="text-sm text-gray-300">
                      {item.filter_reason}
                    </p>
                  </div>

                  {item.evidence && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Evidence
                      </h5>
                      <code className="text-sm text-gold font-mono">
                        {item.evidence}
                      </code>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Problem
                      </h5>
                      <p className="text-sm text-gray-400">{item.problem}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Proposed Solution
                      </h5>
                      <p className="text-sm text-gray-400">{item.solution}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Impact: {item.impact_score}/10</span>
                    <span>Effort: {item.effort_score}/10</span>
                    <span>Type: {item.type}</span>
                    <span>Area: {item.area}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
