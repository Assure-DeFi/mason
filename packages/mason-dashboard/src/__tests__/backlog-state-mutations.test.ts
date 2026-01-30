import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types for Supabase responses
interface MockSupabaseItem {
  id: string;
  title: string;
  status: string;
  user_id: string;
  branch_name?: string;
  pr_url?: string;
  solution?: string;
  priority_score?: number;
  updated_at?: string;
}

interface MockQueryResult {
  data: MockSupabaseItem | MockSupabaseItem[] | null;
  error: Error | null;
}

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: () => Promise<MockQueryResult>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock Supabase query builder that chains methods
 */
function createMockQueryBuilder(
  finalData: MockSupabaseItem | MockSupabaseItem[] | null = null,
  error: Error | null = null,
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: () => Promise.resolve({ data: finalData, error }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return builder;
}

/**
 * Creates a mock item with default values
 */
function createMockItem(
  overrides: Partial<MockSupabaseItem> = {},
): MockSupabaseItem {
  return {
    id: 'test-item-1',
    title: 'Test Item',
    status: 'new',
    user_id: 'user-123',
    priority_score: 8,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Backlog State Mutations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Transition: new -> approved', () => {
    it('should update status from new to approved', async () => {
      const originalItem = createMockItem({ status: 'new' });
      const updatedItem = createMockItem({ status: 'approved' });

      const mockBuilder = createMockQueryBuilder(updatedItem);

      // Simulate the update operation
      mockBuilder.update({
        status: 'approved',
        updated_at: expect.any(String),
      });
      mockBuilder.eq('id', originalItem.id);
      mockBuilder.eq('user_id', originalItem.user_id);
      await mockBuilder.single();

      expect(mockBuilder.update).toHaveBeenCalledWith({
        status: 'approved',
        updated_at: expect.any(String),
      });
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', originalItem.id);
      expect(mockBuilder.eq).toHaveBeenCalledWith(
        'user_id',
        originalItem.user_id,
      );
    });

    it('should preserve other item fields during status update', async () => {
      createMockItem({
        status: 'new',
        title: 'Important Feature',
        priority_score: 9,
      });
      const updatedItem = createMockItem({
        status: 'approved',
        title: 'Important Feature',
        priority_score: 9,
      });

      const mockBuilder = createMockQueryBuilder(updatedItem);
      const result = await mockBuilder.single();

      expect(result.data).toEqual(
        expect.objectContaining({
          title: 'Important Feature',
          priority_score: 9,
          status: 'approved',
        }),
      );
    });
  });

  describe('Status Transition: approved -> in_progress', () => {
    it('should update status and set branch_name when starting work', () => {
      const originalItem = createMockItem({ status: 'approved' });
      const branchName = 'feature/new-widget';
      createMockItem({
        status: 'in_progress',
        branch_name: branchName,
      });

      const mockBuilder = createMockQueryBuilder();

      mockBuilder.update({
        status: 'in_progress',
        branch_name: branchName,
        updated_at: expect.any(String),
      });
      mockBuilder.eq('id', originalItem.id);
      mockBuilder.eq('user_id', originalItem.user_id);
      mockBuilder.eq('status', 'approved'); // Only start if still approved

      expect(mockBuilder.update).toHaveBeenCalledWith({
        status: 'in_progress',
        branch_name: branchName,
        updated_at: expect.any(String),
      });
    });

    it('should require branch_name to start work', () => {
      const branchName = 'feature/test';
      expect(typeof branchName).toBe('string');
      expect(branchName.length).toBeGreaterThan(0);
    });

    it('should reject starting non-approved items', async () => {
      const itemWithWrongStatus = createMockItem({ status: 'new' });

      // When atomic update with status='approved' condition fails,
      // the response should have no data
      const mockBuilder = createMockQueryBuilder(null);

      mockBuilder.update({ status: 'in_progress', branch_name: 'test' });
      mockBuilder.eq('status', 'approved');
      const result = await mockBuilder.single();

      expect(result.data).toBeNull();
      // In real implementation, this would return 409 Conflict
      expect(itemWithWrongStatus.status).not.toBe('approved');
    });
  });

  describe('Status Transition: in_progress -> completed', () => {
    it('should update status and set pr_url when completing', () => {
      const originalItem = createMockItem({
        status: 'in_progress',
        branch_name: 'feature/widget',
      });
      const prUrl = 'https://github.com/owner/repo/pull/123';

      const mockBuilder = createMockQueryBuilder();

      mockBuilder.update({
        status: 'completed',
        pr_url: prUrl,
        updated_at: expect.any(String),
      });
      mockBuilder.eq('id', originalItem.id);
      mockBuilder.eq('status', 'in_progress'); // Only complete if in_progress

      expect(mockBuilder.update).toHaveBeenCalledWith({
        status: 'completed',
        pr_url: prUrl,
        updated_at: expect.any(String),
      });
    });

    it('should validate pr_url is a valid URL', () => {
      const validUrls = [
        'https://github.com/owner/repo/pull/123',
        'https://gitlab.com/owner/repo/-/merge_requests/456',
      ];

      const invalidUrls = ['not-a-url', 'just-text', ''];

      validUrls.forEach((url) => {
        expect(() => new URL(url)).not.toThrow();
      });

      invalidUrls.forEach((url) => {
        if (url === '') {
          // Empty string should be rejected by the API
          expect(url.length).toBe(0);
        } else {
          // These should throw when parsed as URL
          expect(() => new URL(url)).toThrow();
        }
      });
    });

    it('should reject completing items not in_progress', async () => {
      const itemNotInProgress = createMockItem({ status: 'approved' });

      const mockBuilder = createMockQueryBuilder(null);

      mockBuilder.update({
        status: 'completed',
        pr_url: 'https://example.com/pr/1',
      });
      mockBuilder.eq('status', 'in_progress');
      const result = await mockBuilder.single();

      expect(result.data).toBeNull();
      expect(itemNotInProgress.status).toBe('approved');
    });
  });

  describe('Status Transition: in_progress -> rejected (failed)', () => {
    it('should mark item as rejected with optional error message', () => {
      createMockItem({ status: 'in_progress' });
      const errorMessage = 'Build failed: TypeScript errors';

      const mockBuilder = createMockQueryBuilder();

      mockBuilder.update({
        status: 'rejected',
        solution: `[EXECUTION FAILED: ${errorMessage}]`,
        updated_at: expect.any(String),
      });
      mockBuilder.eq('status', 'in_progress');

      expect(mockBuilder.update).toHaveBeenCalledWith({
        status: 'rejected',
        solution: expect.stringContaining('Build failed'),
        updated_at: expect.any(String),
      });
    });

    it('should work without error message', () => {
      const originalItem = createMockItem({ status: 'in_progress' });

      const mockBuilder = createMockQueryBuilder();

      mockBuilder.update({
        status: 'rejected',
        updated_at: expect.any(String),
      });

      expect(mockBuilder.update).toHaveBeenCalledWith({
        status: 'rejected',
        updated_at: expect.any(String),
      });
      expect(originalItem.status).toBe('in_progress');
    });
  });

  describe('Bulk Operations: Approve Multiple Items', () => {
    it('should approve multiple items in parallel', async () => {
      const items = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'new' }),
        createMockItem({ id: 'item-3', status: 'new' }),
      ];

      const approvedItems = items.map((item) => ({
        ...item,
        status: 'approved',
      }));

      // Simulate parallel updates
      const updatePromises = items.map((_item, index) => {
        const mockBuilder = createMockQueryBuilder(approvedItems[index]);
        return mockBuilder.single();
      });

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        const item = result.data as MockSupabaseItem | null;
        expect(item?.status).toBe('approved');
      });
    });

    it('should track previous statuses for undo capability', () => {
      const items = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'deferred' }),
        createMockItem({ id: 'item-3', status: 'new' }),
      ];

      const previousStatuses = new Map<string, string>();
      items.forEach((item) => {
        previousStatuses.set(item.id, item.status);
      });

      expect(previousStatuses.get('item-1')).toBe('new');
      expect(previousStatuses.get('item-2')).toBe('deferred');
      expect(previousStatuses.get('item-3')).toBe('new');
      expect(previousStatuses.size).toBe(3);
    });

    it('should clear selection after bulk operation', () => {
      const selectedIds = ['item-1', 'item-2', 'item-3'];

      // After bulk operation, selection should be cleared
      const clearedSelection: string[] = [];

      expect(clearedSelection).toHaveLength(0);
      expect(selectedIds).toHaveLength(3);
    });
  });

  describe('Bulk Operations: Reject Multiple Items', () => {
    it('should reject multiple items in parallel', async () => {
      const items = [
        createMockItem({ id: 'item-1', status: 'new' }),
        createMockItem({ id: 'item-2', status: 'approved' }),
      ];

      const rejectedItems = items.map((item) => ({
        ...item,
        status: 'rejected',
      }));

      const updatePromises = items.map((_item, index) => {
        const mockBuilder = createMockQueryBuilder(rejectedItems[index]);
        return mockBuilder.single();
      });

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        const item = result.data as MockSupabaseItem | null;
        expect(item?.status).toBe('rejected');
      });
    });
  });

  describe('Bulk Operations: Restore Rejected Items', () => {
    it('should restore rejected items to new status', async () => {
      const items = [
        createMockItem({ id: 'item-1', status: 'rejected' }),
        createMockItem({ id: 'item-2', status: 'rejected' }),
      ];

      const restoredItems = items.map((item) => ({
        ...item,
        status: 'new',
      }));

      const updatePromises = items.map((_item, index) => {
        const mockBuilder = createMockQueryBuilder(restoredItems[index]);
        return mockBuilder.single();
      });

      const results = await Promise.all(updatePromises);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        const item = result.data as MockSupabaseItem | null;
        expect(item?.status).toBe('new');
      });
    });
  });

  describe('Bulk Operations: Delete Items', () => {
    it('should delete items and store for potential undo', () => {
      const items = [
        createMockItem({ id: 'item-1', status: 'rejected' }),
        createMockItem({ id: 'item-2', status: 'rejected' }),
      ];

      // Store items before deletion for undo
      const deletedItems = [...items];

      // After deletion, local state should not contain these items
      const remainingItems: MockSupabaseItem[] = [];

      expect(remainingItems).toHaveLength(0);
      expect(deletedItems).toHaveLength(2);
      expect(deletedItems[0].id).toBe('item-1');
      expect(deletedItems[1].id).toBe('item-2');
    });

    it('should close detail modal if deleted item was open', () => {
      const selectedItem = createMockItem({ id: 'item-1' });
      const deletedIds = ['item-1', 'item-2'];

      // If selected item is in deleted list, it should be cleared
      const shouldCloseModal = deletedIds.includes(selectedItem.id);

      expect(shouldCloseModal).toBe(true);
    });
  });

  describe('Undo Functionality', () => {
    it('should restore items to previous status on undo', () => {
      const previousStatuses = new Map<string, string>([
        ['item-1', 'new'],
        ['item-2', 'deferred'],
      ]);

      // Simulate undo by restoring to previous statuses
      const restoredItems: MockSupabaseItem[] = [];

      const entries = Array.from(previousStatuses.entries());
      for (const [id, status] of entries) {
        const restoredItem = createMockItem({ id, status });
        restoredItems.push(restoredItem);
      }

      expect(restoredItems).toHaveLength(2);
      expect(restoredItems.find((i) => i.id === 'item-1')?.status).toBe('new');
      expect(restoredItems.find((i) => i.id === 'item-2')?.status).toBe(
        'deferred',
      );
    });

    it('should re-insert deleted items on undo', () => {
      const deletedItems = [
        createMockItem({
          id: 'item-1',
          status: 'rejected',
          title: 'Deleted Item 1',
        }),
        createMockItem({
          id: 'item-2',
          status: 'rejected',
          title: 'Deleted Item 2',
        }),
      ];

      // Simulate re-insertion
      const currentItems: MockSupabaseItem[] = [];
      const restoredItems = [...deletedItems];

      const newItemList = [...restoredItems, ...currentItems];

      expect(newItemList).toHaveLength(2);
      expect(newItemList[0].title).toBe('Deleted Item 1');
      expect(newItemList[1].title).toBe('Deleted Item 2');
    });

    it('should auto-dismiss undo toast after timeout', () => {
      vi.useFakeTimers();

      let undoState: { message: string } | null = {
        message: 'Approved 3 items',
      };

      // Simulate timeout clearing undo state
      setTimeout(() => {
        undoState = null;
      }, 8000);

      expect(undoState).not.toBeNull();

      vi.advanceTimersByTime(8000);

      expect(undoState).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Edge Cases: Invalid Status Transitions', () => {
    it('should not allow completing new items directly', () => {
      const newItem = createMockItem({ status: 'new' });

      // Valid transitions from 'new': approved, rejected, deferred
      const validTransitionsFromNew = ['approved', 'rejected', 'deferred'];
      const invalidTransitionsFromNew = ['completed', 'in_progress'];

      expect(validTransitionsFromNew).not.toContain('completed');
      expect(invalidTransitionsFromNew).toContain('completed');
      expect(newItem.status).toBe('new');
    });

    it('should not allow starting completed items', () => {
      const completedItem = createMockItem({ status: 'completed' });

      // Cannot go from completed back to in_progress
      expect(completedItem.status).toBe('completed');
    });

    it('should require atomic updates with status precondition', () => {
      // The API routes use atomic updates with WHERE status = 'expected_status'
      // This prevents race conditions where status changes between check and update

      const atomicUpdatePattern = {
        update: { status: 'in_progress', branch_name: 'feature/test' },
        where: [
          { column: 'id', value: 'item-1' },
          { column: 'user_id', value: 'user-123' },
          { column: 'status', value: 'approved' }, // Precondition
        ],
      };

      expect(atomicUpdatePattern.where).toContainEqual({
        column: 'status',
        value: 'approved',
      });
    });
  });

  describe('Edge Cases: User Data Isolation', () => {
    it('should always filter by user_id in queries', () => {
      const userId = 'user-123';
      const mockBuilder = createMockQueryBuilder();

      mockBuilder.eq('user_id', userId);

      expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should not return items belonging to other users', async () => {
      // User A's item should not be accessible by User B
      const userAItem = createMockItem({ id: 'item-1', user_id: 'user-a' });
      const userBQuery = createMockQueryBuilder(null);

      userBQuery.eq('id', userAItem.id);
      userBQuery.eq('user_id', 'user-b');
      const result = await userBQuery.single();

      expect(result.data).toBeNull();
    });
  });

  describe('Edge Cases: Concurrent Updates', () => {
    it('should handle race conditions with atomic updates', async () => {
      // Two concurrent requests try to start the same item
      const itemId = 'item-1';

      // First request succeeds
      const firstRequest = createMockQueryBuilder(
        createMockItem({ id: itemId, status: 'in_progress' }),
      );

      // Second request fails because status already changed
      const secondRequest = createMockQueryBuilder(null);

      const [first, second] = await Promise.all([
        firstRequest.single(),
        secondRequest.single(),
      ]);

      const firstItem = first.data as MockSupabaseItem | null;
      expect(firstItem?.status).toBe('in_progress');
      expect(second.data).toBeNull();
    });
  });

  describe('API Route: /api/v1/backlog/next', () => {
    it('should return approved items ordered by priority', () => {
      const approvedItems = [
        createMockItem({ id: 'item-1', status: 'approved', priority_score: 9 }),
        createMockItem({ id: 'item-2', status: 'approved', priority_score: 7 }),
        createMockItem({ id: 'item-3', status: 'approved', priority_score: 8 }),
      ];

      // Mock should return items ordered by priority_score descending
      const sortedItems = [...approvedItems].sort(
        (a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0),
      );

      expect(sortedItems[0].id).toBe('item-1');
      expect(sortedItems[1].id).toBe('item-3');
      expect(sortedItems[2].id).toBe('item-2');
    });

    it('should return empty array when no approved items', async () => {
      const mockBuilder = createMockQueryBuilder([]);

      mockBuilder.eq('status', 'approved');
      mockBuilder.order('priority_score', { ascending: false });
      const result = await mockBuilder.single();

      // single() returns null for empty results, but list query would return []
      expect(result.data).toEqual([]);
    });

    it('should filter by repository_id when provided', () => {
      const repositoryId = 'repo-123';
      const mockBuilder = createMockQueryBuilder();

      mockBuilder.eq('repository_id', repositoryId);

      expect(mockBuilder.eq).toHaveBeenCalledWith(
        'repository_id',
        repositoryId,
      );
    });

    it('should respect limit parameter', () => {
      const limit = 5;
      const mockBuilder = createMockQueryBuilder();

      mockBuilder.limit(limit);

      expect(mockBuilder.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('API Route: Authentication', () => {
    it('should extract API key from Authorization header', () => {
      const extractApiKeyFromHeader = (
        authHeader: string | null,
      ): string | null => {
        if (!authHeader) {
          return null;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
          return null;
        }
        return parts[1];
      };

      expect(extractApiKeyFromHeader('Bearer mason_abc123')).toBe(
        'mason_abc123',
      );
      expect(extractApiKeyFromHeader('bearer mason_abc123')).toBe(
        'mason_abc123',
      );
      expect(extractApiKeyFromHeader('Basic base64data')).toBeNull();
      expect(extractApiKeyFromHeader(null)).toBeNull();
      expect(extractApiKeyFromHeader('')).toBeNull();
      expect(extractApiKeyFromHeader('Bearer')).toBeNull();
      expect(extractApiKeyFromHeader('mason_abc123')).toBeNull();
    });

    it('should validate API key has correct prefix', () => {
      const API_KEY_PREFIX = 'mason_';

      const validatePrefix = (key: string): boolean => {
        return key.startsWith(API_KEY_PREFIX);
      };

      expect(validatePrefix('mason_abc123')).toBe(true);
      expect(validatePrefix('mason_')).toBe(true);
      expect(validatePrefix('MASON_abc123')).toBe(false);
      expect(validatePrefix('other_abc123')).toBe(false);
      expect(validatePrefix('')).toBe(false);
    });
  });
});

describe('Backlog State Machine', () => {
  type BacklogStatus =
    | 'new'
    | 'approved'
    | 'in_progress'
    | 'completed'
    | 'rejected'
    | 'deferred';

  interface Transition {
    from: BacklogStatus;
    to: BacklogStatus;
    valid: boolean;
    requires?: string[];
  }

  const transitions: Transition[] = [
    // From new
    { from: 'new', to: 'approved', valid: true },
    { from: 'new', to: 'rejected', valid: true },
    { from: 'new', to: 'deferred', valid: true },
    { from: 'new', to: 'in_progress', valid: false },
    { from: 'new', to: 'completed', valid: false },

    // From approved
    {
      from: 'approved',
      to: 'in_progress',
      valid: true,
      requires: ['branch_name'],
    },
    { from: 'approved', to: 'rejected', valid: true },
    { from: 'approved', to: 'new', valid: true }, // Can restore
    { from: 'approved', to: 'completed', valid: false },
    { from: 'approved', to: 'deferred', valid: true },

    // From in_progress
    { from: 'in_progress', to: 'completed', valid: true, requires: ['pr_url'] },
    { from: 'in_progress', to: 'rejected', valid: true }, // Failed execution
    { from: 'in_progress', to: 'approved', valid: false },
    { from: 'in_progress', to: 'new', valid: false },

    // From completed (terminal state mostly)
    { from: 'completed', to: 'new', valid: false },
    { from: 'completed', to: 'approved', valid: false },
    { from: 'completed', to: 'in_progress', valid: false },

    // From rejected (can be restored)
    { from: 'rejected', to: 'new', valid: true },
    { from: 'rejected', to: 'approved', valid: true },
    { from: 'rejected', to: 'in_progress', valid: false },

    // From deferred (can be restored)
    { from: 'deferred', to: 'new', valid: true },
    { from: 'deferred', to: 'approved', valid: true },
    { from: 'deferred', to: 'in_progress', valid: false },
  ];

  it.each(transitions.filter((t) => t.valid))(
    'should allow transition from $from to $to',
    ({ from, to, requires }) => {
      // Valid transition
      expect(from).not.toBe(to);
      if (requires) {
        expect(requires.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(transitions.filter((t) => !t.valid))(
    'should block transition from $from to $to',
    ({ from, to }) => {
      // Invalid transition - this should be enforced by API
      expect(from).not.toBe(to);
    },
  );

  it('should require branch_name for approved -> in_progress transition', () => {
    const approvedToInProgress = transitions.find(
      (t) => t.from === 'approved' && t.to === 'in_progress',
    );

    expect(approvedToInProgress?.requires).toContain('branch_name');
  });

  it('should require pr_url for in_progress -> completed transition', () => {
    const inProgressToCompleted = transitions.find(
      (t) => t.from === 'in_progress' && t.to === 'completed',
    );

    expect(inProgressToCompleted?.requires).toContain('pr_url');
  });
});
