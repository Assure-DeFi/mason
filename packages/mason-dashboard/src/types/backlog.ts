/**
 * Mason PM System - Backlog Types
 */

export type BacklogArea =
  | 'frontend-ux'
  | 'api-backend'
  | 'reliability'
  | 'security'
  | 'code-quality';

export type BacklogType = 'feature' | 'fix' | 'refactor' | 'optimization';

export type BacklogComplexity = 'low' | 'medium' | 'high' | 'very_high';

export type BacklogStatus =
  | 'new'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

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
  complexity: BacklogComplexity;

  // Scoring
  impact_score: number;
  effort_score: number;
  priority_score: number; // Computed: (impact * 2) - effort

  // Benefits
  benefits_json: string[];

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
  complexity?: BacklogComplexity[];
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
