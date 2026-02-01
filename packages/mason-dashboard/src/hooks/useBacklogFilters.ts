/**
 * Backlog Filters Hook
 *
 * Manages filter state and computed values for the backlog page.
 * Encapsulates repository filtering, source filtering, status filtering,
 * search, and sorting logic.
 */

import { useMemo, useState, useCallback } from 'react';

import type { TabStatus } from '@/components/backlog/status-tabs';
import type {
  BacklogItem,
  StatusCounts,
  SortField,
  SortDirection,
} from '@/types/backlog';

interface UseBacklogFiltersOptions {
  items: BacklogItem[];
}

interface SortState {
  field: SortField;
  direction: SortDirection;
}

interface UseBacklogFiltersReturn {
  // Filter state
  selectedRepoId: string | null;
  setSelectedRepoId: (id: string | null) => void;
  sourceFilter: 'all' | 'manual' | 'autopilot';
  setSourceFilter: (filter: 'all' | 'manual' | 'autopilot') => void;
  activeStatus: TabStatus;
  setActiveStatus: (status: TabStatus) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sort: SortState | null;
  setSort: (sort: SortState | null) => void;

  // Computed values
  repoFilteredItems: BacklogItem[];
  filteredItems: BacklogItem[];
  counts: StatusCounts;
  approvedItemIds: string[];

  // Handler
  handleSortChange: (field: SortField) => void;
}

export function useBacklogFilters({
  items,
}: UseBacklogFiltersOptions): UseBacklogFiltersReturn {
  // Filter state
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'manual' | 'autopilot'
  >('all');
  const [activeStatus, setActiveStatus] = useState<TabStatus>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);

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
  const approvedItemIds = useMemo(
    () =>
      repoFilteredItems
        .filter((item) => item.status === 'approved')
        .map((item) => item.id),
    [repoFilteredItems],
  );

  // Sort handler
  const handleSortChange = useCallback((field: SortField) => {
    setSort((prev) => {
      // If clicking same field, toggle direction
      if (prev?.field === field) {
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' };
        }
        // If already desc, clear sort
        return null;
      }
      // New field - start with desc (highest first)
      return { field, direction: 'desc' };
    });
  }, []);

  return {
    // Filter state
    selectedRepoId,
    setSelectedRepoId,
    sourceFilter,
    setSourceFilter,
    activeStatus,
    setActiveStatus,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,

    // Computed values
    repoFilteredItems,
    filteredItems,
    counts,
    approvedItemIds,

    // Handler
    handleSortChange,
  };
}
