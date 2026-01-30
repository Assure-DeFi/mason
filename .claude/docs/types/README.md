# Types Overview

## Quick Reference

Core TypeScript types are in `packages/mason-dashboard/src/types/`.

## Type Files

| File           | Contents                                              |
| -------------- | ----------------------------------------------------- |
| `backlog.ts`   | BacklogItem, BacklogStatus, FilteredItem, AnalysisRun |
| `execution.ts` | ExecutionRun, ExecutionTask, ExecutionProgress        |

## Key Types

### Backlog System

- `BacklogItem` - Main backlog item with PRD
- `BacklogStatus` - 'new' | 'approved' | 'in_progress' | 'completed' | 'deferred' | 'rejected'
- `BacklogArea` - 'frontend' | 'backend'
- `BacklogType` - 'dashboard' | 'discovery' | 'auth' | 'backend'
- `FilteredItem` - Items filtered during validation
- `AnalysisRun` - PM review run tracking

### Execution System

- `ExecutionRun` - Batch execution tracking
- `ExecutionTask` - Individual task within a run
- `ExecutionProgress` - Real-time progress data

## Import Patterns

```typescript
// From types folder
import type { BacklogItem, BacklogStatus } from '@/types/backlog';

// From constants
import { TABLES } from '@/lib/constants';
import type { TableName } from '@/lib/constants';
```

## Related

- [Backlog Types](backlog.md) - Detailed BacklogItem documentation
- [Database Tables](../database/tables.md) - Corresponding database schema
