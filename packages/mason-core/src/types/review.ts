/**
 * Review checkpoint for crash recovery
 */
export interface ReviewCheckpoint {
  /** Unique identifier */
  id: string;

  /** When the review started */
  startedAt: Date;

  /** Configuration used for this review */
  configHash: string;

  /** Domains that have completed analysis */
  completedDomains: string[];

  /** Domains still pending */
  pendingDomains: string[];

  /** Partial results gathered so far */
  partialResults: ReviewDomainResult[];

  /** Tokens used so far */
  tokensUsed: number;

  /** Cost accumulated so far */
  costSoFar: number;

  /** File hashes at time of review */
  fileHashes: Record<string, string>;
}

/**
 * Result from analyzing a single domain
 */
export interface ReviewDomainResult {
  /** Domain name */
  domain: string;

  /** Improvements found */
  improvements: ReviewImprovement[];

  /** Tokens used for this domain */
  tokensUsed: number;

  /** Files analyzed */
  filesAnalyzed: string[];

  /** Files skipped (with reason) */
  filesSkipped: Array<{ path: string; reason: string }>;
}

/**
 * A single improvement found during review
 */
export interface ReviewImprovement {
  /** Suggested title */
  title: string;

  /** Problem description */
  problem: string;

  /** Proposed solution */
  solution: string;

  /** Estimated impact (1-10) */
  impactScore: number;

  /** Estimated effort (1-10) */
  effortScore: number;

  /** Complexity assessment */
  complexity: 'low' | 'medium' | 'high' | 'very_high';

  /** Affected files */
  affectedFiles: string[];

  /** Additional context or reasoning */
  reasoning?: string;
}

/**
 * Review cache entry
 */
export interface ReviewCache {
  /** Cache key (hash of inputs) */
  key: string;

  /** When cache was created */
  createdAt: Date;

  /** When cache expires */
  expiresAt: Date;

  /** File content hashes at time of review */
  fileHashes: Record<string, string>;

  /** Cached results */
  results: ReviewDomainResult[];

  /** Total tokens used */
  tokensUsed: number;

  /** Total cost */
  cost: number;
}

/**
 * Context budget for LLM calls
 */
export interface ContextBudget {
  /** Maximum total tokens for the review */
  maxTotalTokens: number;

  /** Maximum tokens per individual file */
  maxTokensPerFile: number;

  /** Maximum files per domain */
  maxFilesPerDomain: number;

  /** File patterns to always include */
  priorityFiles: string[];
}

/**
 * Review summary for display
 */
export interface ReviewSummary {
  /** Total files analyzed */
  filesAnalyzed: number;

  /** Total files in repo */
  totalFiles: number;

  /** Total improvements found */
  improvementsFound: number;

  /** Improvements by domain */
  byDomain: Record<string, number>;

  /** Improvements by priority tier */
  byPriority: {
    high: number; // priority >= 7
    medium: number; // priority 4-6
    low: number; // priority <= 3
  };

  /** Tokens used */
  tokensUsed: number;

  /** Estimated cost */
  estimatedCost: number;

  /** Whether results came from cache */
  fromCache: boolean;

  /** Whether review was resumed from checkpoint */
  resumed: boolean;
}
