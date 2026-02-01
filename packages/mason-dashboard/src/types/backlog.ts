/**
 * Mason PM System - Backlog Types
 */

export type BacklogComplexity = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Convert text complexity to numeric value (1-4 scale)
 * Database stores complexity as text, UI expects numeric for display
 */
export function getComplexityValue(complexity: string | number): number {
  if (typeof complexity === 'number') {
    return complexity;
  }
  const mapping: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    very_high: 4,
  };
  return mapping[complexity] ?? 2;
}

export type BacklogArea = 'frontend' | 'backend';

/**
 * NEW: Category-based classification system (v2.0)
 * Replaces the old BacklogType for clearer domain-specific categorization.
 */
export type BacklogCategory =
  | 'feature' // Net-new functionality (Purple + Star)
  | 'ui' // Visual changes, components, styling (Gold)
  | 'ux' // User flows, journey optimization (Cyan)
  | 'api' // Endpoints, backend services (Green)
  | 'data' // Database schema, queries (Blue)
  | 'security' // Vulnerabilities, hardening (Red)
  | 'performance' // Speed, optimization (Orange)
  | 'code-quality'; // Refactors, cleanup (Gray)

/**
 * @deprecated Use BacklogCategory instead. Kept for backwards compatibility.
 * Maps to new categories: dashboard->ui, discovery->code-quality, auth->security, backend->api
 */
export type BacklogType =
  | 'feature'
  | 'ui'
  | 'ux'
  | 'api'
  | 'data'
  | 'security'
  | 'performance'
  | 'code-quality'
  // Legacy values (mapped for backwards compatibility)
  | 'dashboard'
  | 'discovery'
  | 'auth'
  | 'backend';

/**
 * Maps legacy type values to new categories for backwards compatibility
 */
export function mapLegacyTypeToCategory(type: BacklogType): BacklogCategory {
  switch (type) {
    case 'dashboard':
      return 'ui';
    case 'discovery':
      return 'code-quality';
    case 'auth':
      return 'security';
    case 'backend':
      return 'api';
    default:
      return type as BacklogCategory;
  }
}

export type BacklogStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'deferred'
  | 'rejected';

export interface Benefit {
  category:
    | 'user_experience'
    | 'sales_team'
    | 'operations'
    | 'performance'
    | 'reliability';
  icon: string;
  title: string;
  description: string;
}

export interface BacklogItem {
  id: string;
  created_at: string;
  updated_at: string;

  // Core fields
  title: string;
  problem: string;
  solution: string;

  // Classification
  area: BacklogArea;
  type: BacklogType;
  complexity: BacklogComplexity | number;

  // Scoring
  impact_score: number;
  effort_score: number;
  priority_score: number; // Computed: (impact * 2) - effort

  // Benefits (structured array) - optional as it may be excluded from list queries for performance
  benefits?: Benefit[];

  // Status
  status: BacklogStatus;

  // Git integration
  branch_name: string | null;
  pr_url: string | null;

  // PRD
  prd_content: string | null;
  prd_generated_at: string | null;

  // Analysis run reference
  analysis_run_id: string | null;

  // Repository association (for multi-repo support)
  repository_id: string | null;

  // Risk analysis summary fields (quick access)
  risk_score: number | null;
  risk_analyzed_at: string | null;
  files_affected_count: number | null;
  has_breaking_changes: boolean | null;
  test_coverage_gaps: number | null;

  // Feature classification
  is_new_feature: boolean;
  is_banger_idea: boolean;

  // Tags for categorization (e.g., "banger" for rotated banger ideas)
  tags?: string[];

  // Source tracking for autopilot visibility
  source?: 'manual' | 'autopilot';
  autopilot_run_id?: string | null;
}

export interface AnalysisRun {
  id: string;
  created_at: string;
  mode: string;
  items_found: number;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
  // Validation tracking
  items_validated: number;
  items_filtered: number;
}

/**
 * Filter tier indicating which validation check caught the false positive
 */
export type FilterTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Override status for filtered items
 */
export type FilterOverrideStatus = 'filtered' | 'restored';

/**
 * Represents a suggestion that was filtered out during validation
 */
export interface FilteredItem {
  id: string;
  created_at: string;

  // Original suggestion fields
  title: string;
  problem: string;
  solution: string;
  type: BacklogType;
  area: BacklogArea;
  impact_score: number;
  effort_score: number;
  complexity: number;
  benefits: Benefit[];

  // Validation result
  filter_reason: string;
  filter_tier: FilterTier;
  filter_confidence: number;
  evidence: string | null;

  // Context
  analysis_run_id: string | null;

  // User override capability
  override_status: FilterOverrideStatus;
}

export interface BacklogFilters {
  status?: BacklogStatus[];
  type?: BacklogType[];
  complexity?: number[];
  search?: string;
}

export type SortField =
  | 'title'
  | 'type'
  | 'priority_score'
  | 'complexity'
  | 'status'
  | 'updated_at'
  | 'impact_score'
  | 'effort_score'
  | 'created_at';

export type SortDirection = 'asc' | 'desc';

export interface BacklogSort {
  field: SortField;
  direction: SortDirection;
}

// API response types
export interface BacklogListResponse {
  items: BacklogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BacklogUpdateRequest {
  status?: BacklogStatus;
  prd_content?: string;
}

// Status counts for stats bar
export interface StatusCounts {
  total: number;
  new: number;
  approved: number;
  in_progress: number;
  completed: number;
  deferred: number;
  rejected: number;
}

/**
 * Breaking change detected during dependency analysis
 */
export interface BreakingChange {
  file: string;
  type:
    | 'export_removed'
    | 'signature_changed'
    | 'type_changed'
    | 'api_endpoint_changed';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Detailed dependency analysis for a backlog item
 */
export interface DependencyAnalysis {
  id: string;
  created_at: string;
  updated_at: string;
  item_id: string;

  // Files identified in solution
  target_files: string[];
  // Files that import target files (cascade risk)
  affected_files: string[];
  // Files that target files import (upstream dependencies)
  upstream_dependencies: string[];

  // Risk score breakdown (1-10 each)
  file_count_score: number;
  dependency_depth_score: number;
  test_coverage_score: number;
  cascade_potential_score: number;
  api_surface_score: number;

  // Computed overall risk score
  overall_risk_score: number;

  // Breaking changes detection
  breaking_changes: BreakingChange[];
  has_breaking_changes: boolean;

  // Test coverage gaps
  files_without_tests: string[];

  // Database/external API impact
  migration_needed: boolean;
  api_changes_detected: boolean;
}

/**
 * Risk level categories based on score
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Get risk level from numeric score
 */
export function getRiskLevel(score: number | null): RiskLevel {
  if (score === null) {
    return 'low';
  }
  if (score <= 3) {
    return 'low';
  }
  if (score <= 5) {
    return 'medium';
  }
  if (score <= 7) {
    return 'high';
  }
  return 'critical';
}

/**
 * Get display color for risk level
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'high':
      return 'text-orange-400';
    case 'critical':
      return 'text-red-400';
  }
}

/**
 * Get background color for risk level
 */
export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-400/10 border-green-400/30';
    case 'medium':
      return 'bg-yellow-400/10 border-yellow-400/30';
    case 'high':
      return 'bg-orange-400/10 border-orange-400/30';
    case 'critical':
      return 'bg-red-400/10 border-red-400/30';
  }
}
