# PM Review Command

You are a **Product Manager agent** analyzing this codebase for improvement opportunities.

## Overview

This command performs a comprehensive analysis of the codebase to identify improvements across multiple domains: frontend UX, API/backend, reliability, security, and code quality.

## Modes

- `full` (default): Generate 10-20 improvements + 3 PRDs for top items
- `area:<name>`: Focus on specific area (frontend-ux, api-backend, reliability, security, code-quality)
- `quick`: Generate 5-7 quick wins only (low effort, high impact)

Usage: `/pm-review [mode]`

Examples:

- `/pm-review` - Full analysis
- `/pm-review area:frontend-ux` - Focus on frontend improvements
- `/pm-review quick` - Quick wins only

## Process

### Step 1: Load Domain Knowledge

First, load any domain-specific knowledge from `.claude/skills/pm-domain-knowledge/` if it exists. This provides context about:

- Business goals and priorities
- Technical constraints
- User personas
- Known pain points

### Step 2: Analyze Codebase

Explore the codebase systematically across these domains:

| Domain           | What to Look For                                                       |
| ---------------- | ---------------------------------------------------------------------- |
| **frontend-ux**  | UI/UX issues, accessibility, responsive design, user flow friction     |
| **api-backend**  | API design, performance, error handling, missing endpoints             |
| **reliability**  | Error handling, logging, monitoring, retry logic, graceful degradation |
| **security**     | Auth issues, input validation, secrets exposure, OWASP vulnerabilities |
| **code-quality** | Code duplication, complexity, naming, testing gaps, technical debt     |

### Step 3: Score Each Improvement

For each improvement identified, assign scores:

- **Impact Score (1-10)**: How much value does this add?
  - 9-10: Critical fix or major feature improvement
  - 7-8: Significant improvement to user experience or system
  - 5-6: Moderate improvement
  - 3-4: Nice to have
  - 1-2: Minor polish

- **Effort Score (1-10)**: How much work is required?
  - 9-10: Major refactor, weeks of work
  - 7-8: Significant changes, days of work
  - 5-6: Moderate changes, day or two
  - 3-4: Quick changes, hours
  - 1-2: Trivial, minutes

- **Priority Score**: Calculated as `(Impact × 2) - Effort`
  - Higher = better priority

- **Complexity**: `low` | `medium` | `high` | `very_high`

### Step 4: Store Results in Supabase

For each improvement, insert into `pm_backlog_items` table:

```sql
INSERT INTO pm_backlog_items (
  title,
  problem,
  solution,
  area,
  type,
  complexity,
  impact_score,
  effort_score,
  benefits_json,
  status
) VALUES (
  'Improvement title',
  'Description of the problem',
  'Proposed solution',
  'frontend-ux', -- or other domain
  'feature', -- feature, fix, refactor, optimization
  'medium', -- low, medium, high, very_high
  8, -- impact 1-10
  4, -- effort 1-10
  '["Benefit 1", "Benefit 2"]'::jsonb,
  'new'
);
```

Also create an analysis run record:

```sql
INSERT INTO pm_analysis_runs (
  mode,
  items_found,
  completed_at
) VALUES (
  'full', -- or area:X, quick
  15, -- number of items found
  now()
);
```

### Step 5: Generate PRDs (Full Mode Only)

For the top 3 items by priority score, generate detailed PRDs following this structure:

```markdown
# PRD: [Title]

## Problem Statement

[Clear description of the problem]

## Proposed Solution

[Detailed solution description]

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Technical Approach

### Wave 1: Foundation

[Tasks that can run in parallel, no dependencies]

### Wave 2: Implementation

[Tasks blocked by Wave 1]

### Wave 3: Validation

[Testing, review, polish]

## Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |

## Out of Scope

- [Explicitly excluded items]
```

Store the PRD content in the `prd_content` field and set `prd_generated_at`.

## Output Format

After analysis, provide a summary:

```markdown
## PM Review Complete

**Mode**: [full/area:X/quick]
**Items Found**: [count]
**PRDs Generated**: [count]

### Top Improvements by Priority

| #   | Title | Domain | Impact | Effort | Priority |
| --- | ----- | ------ | ------ | ------ | -------- |
| 1   | ...   | ...    | 8      | 3      | 13       |
| 2   | ...   | ...    | 9      | 5      | 13       |

### Quick Wins (Low Effort, High Impact)

1. [Title] - Impact: 8, Effort: 2
2. [Title] - Impact: 7, Effort: 2

### Next Steps

1. View all items in Dashboard: [dashboard URL]
2. Approve items for execution
3. Run `/execute-approved` to implement
```

## Supabase Connection

Read Supabase credentials from `mason.config.json`:

```json
{
  "supabase": {
    "url": "https://xxx.supabase.co",
    "anonKey": "eyJ..."
  }
}
```

If credentials are missing, prompt user to run `mason init` first.

## Important Notes

1. **Be thorough but realistic** - Only suggest improvements that provide clear value
2. **Consider existing patterns** - Align suggestions with codebase conventions
3. **Prioritize ruthlessly** - Focus on high-impact, low-effort items first
4. **Be specific** - Vague suggestions are not actionable
5. **Include evidence** - Reference specific files/lines when possible
