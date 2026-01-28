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

- **Priority Score**: Calculated as `(Impact x 2) - Effort`
  - Higher = better priority

- **Complexity (1-5)**: Technical complexity rating
  - 1: Trivial - simple change, single file
  - 2: Low - straightforward, few files
  - 3: Medium - requires understanding of multiple components
  - 4: High - significant architectural consideration
  - 5: Very High - major system changes, high risk

### Step 4: Classify Each Improvement

For each improvement, assign these classifications:

**Type** (matches UI badge):

- `dashboard` - Dashboard/UI improvements (Gold badge)
- `discovery` - Discovery engine improvements (Purple badge)
- `auth` - Authentication/authorization (Cyan badge)
- `backend` - Backend/API improvements (Green badge)

**Area**:

- `frontend` - Frontend code changes
- `backend` - Backend code changes

### Step 5: Generate Benefits

For EVERY improvement, populate ALL 5 benefit categories. Each benefit should be specific to the improvement:

```json
{
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "Specific benefit for end users..."
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "Specific benefit for sales/business..."
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "Specific benefit for ops/support..."
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "Technical performance impact..."
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "System reliability impact..."
    }
  ]
}
```

### Step 6: Submit Results to Mason API

Read the API configuration from `mason.config.json`:

```json
{
  "version": "2.0",
  "apiKey": "mason_xxxxx",
  "apiUrl": "https://mason.assuredefi.com/api/v1"
}
```

Submit all improvements to the Mason API:

```bash
curl -X POST "${apiUrl}/analysis" \
  -H "Authorization: Bearer ${apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full",
    "items": [
      {
        "title": "Add data freshness timestamps to Executive Snapshot",
        "problem": "Executives cannot tell when snapshot data was last updated...",
        "solution": "Add visible timestamps showing when each section was last refreshed...",
        "type": "dashboard",
        "area": "frontend",
        "impact_score": 9,
        "effort_score": 2,
        "complexity": 2,
        "benefits": [...]
      }
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "analysis_run_id": "uuid",
  "items_created": 15,
  "dashboard_url": "https://mason.assuredefi.com/admin/backlog"
}
```

### Step 7: Generate PRDs (Full Mode Only)

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

| #   | Title | Type      | Impact | Effort | Priority |
| --- | ----- | --------- | ------ | ------ | -------- |
| 1   | ...   | dashboard | 9      | 2      | 16       |
| 2   | ...   | discovery | 8      | 3      | 13       |

### Quick Wins (Low Effort, High Impact)

1. [Title] - Impact: 8, Effort: 2
2. [Title] - Impact: 7, Effort: 2

### Next Steps

1. View all items in Dashboard: [dashboard_url from API response]
2. Review and approve items for execution
3. Click "Execute All" on Approved tab to copy command
4. Paste command into Claude Code to implement
```

## API Connection

Read API credentials from `mason.config.json`:

```json
{
  "version": "2.0",
  "apiKey": "mason_xxxxx",
  "apiUrl": "https://mason.assuredefi.com/api/v1"
}
```

### Connection Error Handling

If you encounter API connection errors:

1. **Missing API key**: Prompt user to add API key to `mason.config.json`
2. **Invalid API key**: Suggest generating a new key at the dashboard
3. **Network error**: Retry up to 3 times with exponential backoff
4. **Server error**: Report the error and suggest trying again later

Example error response:

```
Error: Unable to submit analysis to Mason API.

Please verify:
1. mason.config.json exists and contains a valid apiKey
2. Your API key is active (generate at https://mason.assuredefi.com/settings/api-keys)
3. The Mason service is accessible

If the problem persists, check your network connection or try again later.
```

## Complete Improvement JSON Schema

Each improvement MUST include ALL of these fields:

```json
{
  "title": "Add data freshness timestamps to Executive Snapshot",
  "problem": "Executives cannot tell when snapshot data was last updated. No visible 'as of' timestamps or data freshness indicators. This creates uncertainty about whether viewing current or stale information.",
  "solution": "Add visible timestamps showing when each section was last refreshed. Include 'Last updated: X minutes ago' badges on KPI cards, funnel summary, and revenue chart. Add global 'Data as of [timestamp]' indicator in page header.",
  "type": "dashboard",
  "area": "frontend",
  "impact_score": 9,
  "effort_score": 2,
  "complexity": 2,
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "Clear visibility into data freshness increases trust"
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "Executives gain confidence in data currency for decision-making"
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "Reduces support questions about data staleness"
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "No performance impact - timestamps already in data"
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "Helps users identify when refresh needed"
    }
  ]
}
```

## Important Notes

1. **Be thorough but realistic** - Only suggest improvements that provide clear value
2. **Consider existing patterns** - Align suggestions with codebase conventions
3. **Prioritize ruthlessly** - Focus on high-impact, low-effort items first
4. **Be specific** - Vague suggestions are not actionable
5. **Include evidence** - Reference specific files/lines when possible
6. **All 5 benefits required** - Every improvement must have all 5 benefit categories populated
7. **Use new type values** - dashboard, discovery, auth, backend (not feature, fix, refactor)
8. **Use new area values** - frontend, backend (not frontend-ux, api-backend, etc.)
9. **Complexity is numeric** - Use 1-5 integer, not text
