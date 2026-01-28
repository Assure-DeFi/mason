/**
 * Backlog item status
 */
export type BacklogItemStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'failed';

/**
 * Complexity levels for backlog items
 */
export type Complexity = 'low' | 'medium' | 'high' | 'very_high';

/**
 * A single improvement item in the backlog
 */
export interface BacklogItem {
  /** Unique identifier (UUID) */
  id: string;

  /** Short, descriptive title */
  title: string;

  /** Description of the problem being addressed */
  problem: string;

  /** Proposed solution */
  solution: string;

  /** Impact score (1-10) - how much value does this provide */
  impactScore: number;

  /** Effort score (1-10) - how much work is required */
  effortScore: number;

  /** Calculated priority: (impact × 2) - effort */
  priorityScore: number;

  /** Domain this improvement belongs to */
  domain: string;

  /** Estimated complexity */
  complexity: Complexity;

  /** Current status */
  status: BacklogItemStatus;

  /** Git branch name (set when execution starts) */
  branchName: string | null;

  /** Generated PRD content (set after approval) */
  prdContent: string | null;

  /** File hashes at time of review (for staleness detection) */
  fileHashes: Record<string, string> | null;

  /** Flexible metadata storage */
  metadata: Record<string, unknown>;

  /** Timestamp when created */
  createdAt: Date;

  /** Timestamp when last updated */
  updatedAt: Date;
}

/**
 * Input for creating a new backlog item
 */
export interface CreateBacklogItemInput {
  title: string;
  problem: string;
  solution: string;
  impactScore: number;
  effortScore: number;
  domain: string;
  complexity: Complexity;
  fileHashes?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a backlog item
 */
export interface UpdateBacklogItemInput {
  title?: string;
  problem?: string;
  solution?: string;
  impactScore?: number;
  effortScore?: number;
  domain?: string;
  complexity?: Complexity;
  status?: BacklogItemStatus;
  branchName?: string | null;
  prdContent?: string | null;
  fileHashes?: Record<string, string> | null;
  metadata?: Record<string, unknown>;
}
