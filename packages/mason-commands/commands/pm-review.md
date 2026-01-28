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

### Step 6: Submit Results to User's Supabase

Read the configuration from `mason.config.json`:

```json
{
  "version": "2.0",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ...",
  "apiKey": "mason_xxxxx"
}
```

**Privacy Note:** Mason stores all data in YOUR Supabase database. Assure DeFi has zero access to your data.

#### Step 6a: Validate API Key and Get User ID

First, validate the API key and get the user ID:

```bash
# Hash the API key using SHA-256
API_KEY_HASH=$(echo -n "${apiKey}" | sha256sum | cut -d' ' -f1)

# Look up the user by API key hash
curl -X GET "${supabaseUrl}/rest/v1/api_keys?key_hash=eq.${API_KEY_HASH}&select=user_id" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}"
```

If no matching key is found, show an error and suggest generating a new key.

#### Step 6b: Create Analysis Run

Create a new analysis run record:

```bash
curl -X POST "${supabaseUrl}/rest/v1/pm_analysis_runs" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "${user_id}",
    "mode": "full",
    "items_found": 15,
    "status": "completed",
    "completed_at": "2024-01-01T00:00:00Z"
  }'
```

#### Step 6c: Insert Backlog Items

For each improvement, insert into the user's database:

```bash
curl -X POST "${supabaseUrl}/rest/v1/pm_backlog_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "${user_id}",
    "analysis_run_id": "${analysis_run_id}",
    "title": "Add data freshness timestamps to Executive Snapshot",
    "problem": "Executives cannot tell when snapshot data was last updated...",
    "solution": "Add visible timestamps showing when each section was last refreshed...",
    "type": "dashboard",
    "area": "frontend",
    "impact_score": 9,
    "effort_score": 2,
    "complexity": 2,
    "benefits": [...],
    "status": "new"
  }'
```

#### Step 6d: Update API Key Last Used

Update the API key's last_used_at timestamp:

```bash
curl -X PATCH "${supabaseUrl}/rest/v1/api_keys?key_hash=eq.${API_KEY_HASH}" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '{"last_used_at": "2024-01-01T00:00:00Z"}'
```

**Success Response:**

After submitting all items, show:

```
Analysis submitted to YOUR Supabase database!
Items created: 15
Dashboard URL: https://mason.assuredefi.com/admin/backlog
```

````

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
````

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

## Database Connection

Read credentials from `mason.config.json`:

```json
{
  "version": "2.0",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ...",
  "apiKey": "mason_xxxxx"
}
```

**Privacy Model:** All data is stored in YOUR Supabase database. Assure DeFi has zero access to your repositories, improvements, or any other data.

### Connection Error Handling

If you encounter connection errors:

1. **Missing credentials**: Prompt user to add `supabaseUrl` and `supabaseAnonKey` to `mason.config.json`
2. **Invalid API key**: Suggest generating a new key at https://mason.assuredefi.com/setup
3. **Network error**: Retry up to 3 times with exponential backoff
4. **Database error**: Report the error and suggest checking Supabase dashboard

Example error response:

```
Error: Unable to submit analysis to your Supabase database.

Please verify:
1. mason.config.json exists and contains valid credentials
2. Your Supabase URL and Anon Key are correct
3. Your API key is active (generate at https://mason.assuredefi.com/setup)
4. Tables exist in your database (run setup wizard if needed)

If the problem persists, check your Supabase dashboard or try again later.
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
