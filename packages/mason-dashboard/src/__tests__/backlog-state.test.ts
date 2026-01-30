import { describe, it, expect, beforeEach } from 'vitest';

import type { BacklogItem, BacklogStatus } from '@/types/backlog';

// Mock item factory
function createMockItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    title: 'Test Item',
    problem: 'Test problem description',
    solution: 'Test solution description',
    type: 'dashboard',
    area: 'frontend',
    status: 'new' as BacklogStatus,
    priority_score: 50,
    impact_score: 7,
    effort_score: 4,
    complexity: 'medium',
    benefits: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    repository_id: 'repo-1',
    branch_name: null,
    pr_url: null,
    prd_content: null,
    prd_generated_at: null,
    analysis_run_id: null,
    risk_score: null,
    risk_analyzed_at: null,
    files_affected_count: null,
    has_breaking_changes: null,
    test_coverage_gaps: null,
    is_new_feature: false,
    is_banger_idea: false,
    ...overrides,
  };
}

describe('Backlog State Mutations', () => {
  describe('Item List State', () => {
    let items: BacklogItem[];
    let setItems: (updater: (prev: BacklogItem[]) => BacklogItem[]) => void;

    beforeEach(() => {
      items = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
        createMockItem({ id: 'item-3', status: 'new' }),
      ];

      setItems = (updater) => {
        items = updater(items);
      };
    });

    it('should update an item when status changes', () => {
      const updatedItem = { ...items[0], status: 'approved' as BacklogStatus };

      setItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      );

      expect(items[0].status).toBe('approved');
      expect(items.length).toBe(3);
    });

    it('should insert a new item at the beginning', () => {
      const newItem = createMockItem({ id: 'item-new' });

      setItems((prev) => [newItem, ...prev]);

      expect(items.length).toBe(4);
      expect(items[0].id).toBe('item-new');
    });

    it('should remove a deleted item', () => {
      const deletedId = 'item-2';

      setItems((prev) => prev.filter((item) => item.id !== deletedId));

      expect(items.length).toBe(2);
      expect(items.find((i) => i.id === deletedId)).toBeUndefined();
    });
  });

  describe('Bulk Status Update', () => {
    it('should update multiple items to approved status', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'new' }),
        createMockItem({ id: 'item-3', status: 'approved' }),
      ];
      const idsToUpdate = ['item-1', 'item-2'];
      const newStatus: BacklogStatus = 'approved';

      const updatedItems = items.map((item) =>
        idsToUpdate.includes(item.id) ? { ...item, status: newStatus } : item,
      );

      expect(updatedItems.filter((i) => i.status === 'approved').length).toBe(
        3,
      );
    });

    it('should update multiple items to rejected status', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
      ];
      const idsToUpdate = ['item-1', 'item-2'];
      const newStatus: BacklogStatus = 'rejected';

      const updatedItems = items.map((item) =>
        idsToUpdate.includes(item.id) ? { ...item, status: newStatus } : item,
      );

      expect(updatedItems.every((i) => i.status === 'rejected')).toBe(true);
    });

    it('should restore items to new status', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'rejected' }),
        createMockItem({ id: 'item-2', status: 'deferred' }),
      ];
      const idsToUpdate = ['item-1', 'item-2'];
      const newStatus: BacklogStatus = 'new';

      const updatedItems = items.map((item) =>
        idsToUpdate.includes(item.id) ? { ...item, status: newStatus } : item,
      );

      expect(updatedItems.every((i) => i.status === 'new')).toBe(true);
    });

    it('should handle bulk delete', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1' }),
        createMockItem({ id: 'item-2' }),
        createMockItem({ id: 'item-3' }),
      ];
      const idsToDelete = ['item-1', 'item-3'];

      const updatedItems = items.filter(
        (item) => !idsToDelete.includes(item.id),
      );

      expect(updatedItems.length).toBe(1);
      expect(updatedItems[0].id).toBe('item-2');
    });
  });

  describe('Selection State', () => {
    it('should toggle item selection', () => {
      let selectedIds: string[] = [];
      const toggle = (id: string) => {
        selectedIds = selectedIds.includes(id)
          ? selectedIds.filter((i) => i !== id)
          : [...selectedIds, id];
      };

      toggle('item-1');
      expect(selectedIds).toContain('item-1');

      toggle('item-1');
      expect(selectedIds).not.toContain('item-1');
    });

    it('should select all items', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1' }),
        createMockItem({ id: 'item-2' }),
        createMockItem({ id: 'item-3' }),
      ];

      const selectedIds = items.map((item) => item.id);

      expect(selectedIds.length).toBe(3);
      expect(selectedIds).toEqual(['item-1', 'item-2', 'item-3']);
    });

    it('should clear selection when items are deleted', () => {
      let selectedIds = ['item-1', 'item-2'];
      const deletedIds = ['item-1'];

      selectedIds = selectedIds.filter((id) => !deletedIds.includes(id));

      expect(selectedIds.length).toBe(1);
      expect(selectedIds).toContain('item-2');
    });
  });

  describe('Undo State', () => {
    interface UndoState {
      action: 'approve' | 'reject' | 'restore' | 'complete' | 'delete';
      itemIds: string[];
      previousStatuses: Map<string, BacklogStatus>;
      deletedItems?: BacklogItem[];
    }

    it('should store previous statuses for undo', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
      ];
      const idsToUpdate = ['item-1', 'item-2'];

      const previousStatuses = new Map<string, BacklogStatus>();
      idsToUpdate.forEach((id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          previousStatuses.set(id, item.status);
        }
      });

      const undoState: UndoState = {
        action: 'reject',
        itemIds: idsToUpdate,
        previousStatuses,
      };

      expect(undoState.previousStatuses.get('item-1')).toBe('new');
      expect(undoState.previousStatuses.get('item-2')).toBe('approved');
    });

    it('should restore items from undo state', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'rejected' }),
        createMockItem({ id: 'item-2', status: 'rejected' }),
      ];

      const undoState: UndoState = {
        action: 'reject',
        itemIds: ['item-1', 'item-2'],
        previousStatuses: new Map([
          ['item-1', 'new'],
          ['item-2', 'approved'],
        ]),
      };

      const restoredItems = items.map((item) => {
        const previousStatus = undoState.previousStatuses.get(item.id);
        return previousStatus ? { ...item, status: previousStatus } : item;
      });

      expect(restoredItems[0].status).toBe('new');
      expect(restoredItems[1].status).toBe('approved');
    });

    it('should store deleted items for undo', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
      ];
      const idsToDelete = ['item-1', 'item-2'];

      const deletedItems = items.filter((i) => idsToDelete.includes(i.id));

      const undoState: UndoState = {
        action: 'delete',
        itemIds: idsToDelete,
        previousStatuses: new Map(),
        deletedItems,
      };

      expect(undoState.deletedItems?.length).toBe(2);
      expect(undoState.deletedItems?.[0].id).toBe('item-1');
    });
  });

  describe('Filter and Sort State', () => {
    it('should filter items by status', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
        createMockItem({ id: 'item-3', status: 'new' }),
        createMockItem({ id: 'item-4', status: 'completed' }),
      ];
      const activeStatus: BacklogStatus = 'new';

      const filtered = items.filter((item) => item.status === activeStatus);

      expect(filtered.length).toBe(2);
      expect(filtered.every((i) => i.status === 'new')).toBe(true);
    });

    it('should sort items by priority score descending', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', priority_score: 50 }),
        createMockItem({ id: 'item-2', priority_score: 90 }),
        createMockItem({ id: 'item-3', priority_score: 30 }),
      ];

      const sorted = [...items].sort(
        (a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0),
      );

      expect(sorted[0].id).toBe('item-2');
      expect(sorted[1].id).toBe('item-1');
      expect(sorted[2].id).toBe('item-3');
    });

    it('should sort items by title ascending', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', title: 'Zebra' }),
        createMockItem({ id: 'item-2', title: 'Apple' }),
        createMockItem({ id: 'item-3', title: 'Mango' }),
      ];

      const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));

      expect(sorted[0].title).toBe('Apple');
      expect(sorted[1].title).toBe('Mango');
      expect(sorted[2].title).toBe('Zebra');
    });

    it('should filter by repository', () => {
      const items: BacklogItem[] = [
        createMockItem({ id: 'item-1', repository_id: 'repo-1' }),
        createMockItem({ id: 'item-2', repository_id: 'repo-2' }),
        createMockItem({ id: 'item-3', repository_id: 'repo-1' }),
      ];
      const selectedRepoId = 'repo-1';

      const filtered = items.filter(
        (item) => item.repository_id === selectedRepoId,
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every((i) => i.repository_id === 'repo-1')).toBe(true);
    });
  });

  describe('Status Counts', () => {
    it('should calculate status counts correctly', () => {
      const items: BacklogItem[] = [
        createMockItem({ status: 'new' }),
        createMockItem({ status: 'new' }),
        createMockItem({ status: 'approved' }),
        createMockItem({ status: 'in_progress' }),
        createMockItem({ status: 'completed' }),
        createMockItem({ status: 'completed' }),
        createMockItem({ status: 'rejected' }),
      ];

      const counts = {
        total: items.length,
        new: 0,
        approved: 0,
        in_progress: 0,
        completed: 0,
        deferred: 0,
        rejected: 0,
      };

      items.forEach((item) => {
        counts[item.status]++;
      });

      expect(counts.total).toBe(7);
      expect(counts.new).toBe(2);
      expect(counts.approved).toBe(1);
      expect(counts.in_progress).toBe(1);
      expect(counts.completed).toBe(2);
      expect(counts.rejected).toBe(1);
      expect(counts.deferred).toBe(0);
    });

    it('should update counts after status change', () => {
      let items: BacklogItem[] = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'new' }),
      ];

      const getCounts = () => {
        const counts = { new: 0, approved: 0 };
        items.forEach((item) => {
          if (item.status === 'new') {
            counts.new++;
          }
          if (item.status === 'approved') {
            counts.approved++;
          }
        });
        return counts;
      };

      expect(getCounts()).toEqual({ new: 2, approved: 0 });

      items = items.map((item) =>
        item.id === 'item-1'
          ? { ...item, status: 'approved' as BacklogStatus }
          : item,
      );

      expect(getCounts()).toEqual({ new: 1, approved: 1 });
    });
  });

  describe('Banger Idea and Feature Filtering', () => {
    it('should filter banger ideas correctly', () => {
      const items: BacklogItem[] = [
        createMockItem({
          id: 'banger-1',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'new',
          priority_score: 100,
        }),
        createMockItem({
          id: 'feature-1',
          is_new_feature: true,
          is_banger_idea: false,
          status: 'new',
        }),
        createMockItem({
          id: 'improvement-1',
          is_new_feature: false,
          is_banger_idea: false,
          status: 'new',
        }),
      ];

      // Filter banger ideas (should only return items with is_banger_idea: true)
      const bangerItems = items.filter(
        (item) =>
          item.is_banger_idea &&
          item.status !== 'completed' &&
          item.status !== 'rejected',
      );

      expect(bangerItems).toHaveLength(1);
      expect(bangerItems[0].id).toBe('banger-1');
    });

    it('should filter feature ideas excluding banger idea', () => {
      const items: BacklogItem[] = [
        createMockItem({
          id: 'banger-1',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'new',
        }),
        createMockItem({
          id: 'feature-1',
          is_new_feature: true,
          is_banger_idea: false,
          status: 'new',
        }),
        createMockItem({
          id: 'feature-2',
          is_new_feature: true,
          is_banger_idea: false,
          status: 'approved',
        }),
        createMockItem({
          id: 'improvement-1',
          is_new_feature: false,
          is_banger_idea: false,
          status: 'new',
        }),
      ];

      // Filter feature ideas (is_new_feature: true but NOT banger idea)
      const featureIdeas = items.filter(
        (item) =>
          item.is_new_feature &&
          !item.is_banger_idea &&
          item.status !== 'completed' &&
          item.status !== 'rejected',
      );

      expect(featureIdeas).toHaveLength(2);
      expect(featureIdeas.map((f) => f.id)).toContain('feature-1');
      expect(featureIdeas.map((f) => f.id)).toContain('feature-2');
      expect(featureIdeas.map((f) => f.id)).not.toContain('banger-1');
    });

    it('should filter improvement items (non-features)', () => {
      const items: BacklogItem[] = [
        createMockItem({
          id: 'banger-1',
          is_new_feature: true,
          is_banger_idea: true,
        }),
        createMockItem({
          id: 'feature-1',
          is_new_feature: true,
          is_banger_idea: false,
        }),
        createMockItem({
          id: 'improvement-1',
          is_new_feature: false,
          is_banger_idea: false,
        }),
        createMockItem({
          id: 'improvement-2',
          is_new_feature: false,
          is_banger_idea: false,
        }),
      ];

      // Filter improvements (not new features)
      const improvements = items.filter((item) => !item.is_new_feature);

      expect(improvements).toHaveLength(2);
      expect(improvements.map((i) => i.id)).toContain('improvement-1');
      expect(improvements.map((i) => i.id)).toContain('improvement-2');
    });

    it('should select highest priority banger idea when multiple exist', () => {
      const items: BacklogItem[] = [
        createMockItem({
          id: 'banger-low',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'new',
          priority_score: 50,
        }),
        createMockItem({
          id: 'banger-high',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'new',
          priority_score: 100,
        }),
      ];

      // Get banger ideas and sort by priority
      const bangerItems = items
        .filter(
          (item) =>
            item.is_banger_idea &&
            item.status !== 'completed' &&
            item.status !== 'rejected',
        )
        .sort((a, b) => b.priority_score - a.priority_score);

      const topBanger = bangerItems[0];
      expect(topBanger.id).toBe('banger-high');
      expect(topBanger.priority_score).toBe(100);
    });

    it('should exclude completed/rejected banger ideas', () => {
      const items: BacklogItem[] = [
        createMockItem({
          id: 'banger-completed',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'completed',
        }),
        createMockItem({
          id: 'banger-rejected',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'rejected',
        }),
        createMockItem({
          id: 'banger-active',
          is_new_feature: true,
          is_banger_idea: true,
          status: 'approved',
        }),
      ];

      const activeBangers = items.filter(
        (item) =>
          item.is_banger_idea &&
          item.status !== 'completed' &&
          item.status !== 'rejected',
      );

      expect(activeBangers).toHaveLength(1);
      expect(activeBangers[0].id).toBe('banger-active');
    });
  });
});
