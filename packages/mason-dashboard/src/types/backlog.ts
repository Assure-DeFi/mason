/**
 * Mason PM System - Backlog Types
 */

export type BacklogComplexity = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Convert text complexity to numeric value (1-4 scale)
 * Database stores complexity as text, UI expects numeric for display
 */
export function getComplexityValue(complexity: string | number): number {
  if (typeof complexity === 'number') return complexity;
  const mapping: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    very_high: 4,
  };
  return mapping[complexity] ?? 2;
}

export type BacklogArea = 'frontend' | 'backend';

export type BacklogType = 'dashboard' | 'discovery' | 'auth' | 'backend';

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

  // Benefits (structured array)
  benefits: Benefit[];

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
}

export interface BacklogFilters {
  status?: BacklogStatus[];
  area?: BacklogArea[];
  type?: BacklogType[];
  complexity?: number[];
  search?: string;
}

export interface BacklogSort {
  field:
    | 'priority_score'
    | 'created_at'
    | 'updated_at'
    | 'impact_score'
    | 'effort_score';
  direction: 'asc' | 'desc';
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
