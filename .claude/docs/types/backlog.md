# Backlog Types Reference

## Quick Reference

Core types for the PM backlog system. Import from `@/types/backlog`.

```typescript
import type { BacklogItem, BacklogStatus, FilteredItem } from '@/types/backlog';
```

---

## BacklogItem

Main backlog item interface.

```typescript
interface BacklogItem {
  // Identity
  id: string;
  created_at: string;
  updated_at: string;

  // Core fields
  title: string;
  problem: string;
  solution: string;

  // Classification
  area: BacklogArea; // 'frontend' | 'backend'
  type: BacklogType; // 'dashboard' | 'discovery' | 'auth' | 'backend'
  complexity: BacklogComplexity | number; // 1-5 scale

  // Scoring
  impact_score: number; // 1-10
  effort_score: number; // 1-10
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

  // References
  analysis_run_id: string | null;
  repository_id: string | null;
}
```

---

## BacklogStatus

Status workflow for backlog items.

```typescript
type BacklogStatus =
  | 'new' // Just discovered
  | 'approved' // Ready for execution
  | 'in_progress' // Currently being implemented
  | 'completed' // Implementation done
  | 'deferred' // Postponed
  | 'rejected'; // Won't implement
```

### Status Flow

```
new -> approved -> in_progress -> completed
         |
      deferred/rejected
```

---

## BacklogArea

Area classification.

```typescript
type BacklogArea = 'frontend' | 'backend';
```

---

## BacklogType

Type classification within an area.

```typescript
type BacklogType = 'dashboard' | 'discovery' | 'auth' | 'backend';
```

---

## BacklogComplexity

Complexity levels (text or numeric).

```typescript
type BacklogComplexity = 'low' | 'medium' | 'high' | 'very_high';

// Convert to numeric (1-4 scale)
function getComplexityValue(complexity: string | number): number;
```

Note: Database stores as INTEGER (1-5), but older items may have text values.

---

## Benefit

Structured benefit for an item.

```typescript
interface Benefit {
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
```

---

## FilteredItem

Items filtered out during PM validation.

```typescript
interface FilteredItem {
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
  filter_reason: string; // Why it was filtered
  filter_tier: FilterTier; // 'tier1' | 'tier2' | 'tier3'
  filter_confidence: number; // 0.00 - 1.00
  evidence: string | null;

  // Context
  analysis_run_id: string | null;

  // User override
  override_status: FilterOverrideStatus; // 'filtered' | 'restored'
}
```

---

## AnalysisRun

PM review analysis run tracking.

```typescript
interface AnalysisRun {
  id: string;
  created_at: string;
  mode: string;
  items_found: number;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
  items_validated: number;
  items_filtered: number;
}
```

---

## Filter Types

```typescript
type FilterTier = 'tier1' | 'tier2' | 'tier3';
type FilterOverrideStatus = 'filtered' | 'restored';
```

---

## Response Types

```typescript
interface BacklogListResponse {
  items: BacklogItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface BacklogUpdateRequest {
  status?: BacklogStatus;
  prd_content?: string;
}

interface StatusCounts {
  total: number;
  new: number;
  approved: number;
  in_progress: number;
  completed: number;
  deferred: number;
  rejected: number;
}
```

---

## Related

- [Database Tables](../database/tables.md) - `mason_pm_backlog_items` schema
- [Query Patterns](../database/queries.md) - Backlog query examples
