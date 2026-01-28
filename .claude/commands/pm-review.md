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

### Step 5.5: Validate Suggestions (Parallel)

Before submission, validate each suggestion to filter false positives. This step runs in parallel for efficiency.

#### Validation Process

Invoke the pm-validator agent to check all suggestions:

1. **Tier 1 (Pattern-Based)**: Auto-reject obvious false positives
   - `.env.example` placeholder values
   - Test fixtures (`test_api_key`, `mock_secret`)
   - `NEXT_PUBLIC_*` environment variables
   - Example/sample data in documentation

2. **Tier 2 (Contextual)**: Investigate the codebase
   - Check for `// why`, `// NOTE`, `// intentional` comments
   - Look for existing error handling/mitigations
   - Check `.claude/skills/pm-domain-knowledge/` Off-Limits

3. **Tier 3 (Impact)**: Verify actionable solutions
   - Solution references specific files/patterns
   - Fix improves system without side effects

#### Log Filtered Items

Insert filtered items to `mason_pm_filtered_items`:

```bash
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_filtered_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '[{
    "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
    "title": "...",
    "problem": "...",
    "solution": "...",
    "type": "...",
    "area": "...",
    "impact_score": 8,
    "effort_score": 2,
    "filter_reason": "Pattern matches .env.example placeholder values",
    "filter_tier": "tier1",
    "filter_confidence": 0.95
  }]'
```

#### Display Validation Summary

```
## Validation Complete
- Suggestions Generated: 15
- Validated (will submit): 12
- Filtered (false positives): 3

Filtered items logged to dashboard → Filtered tab for review.
```

Continue to Step 6 with validated items only.

### Step 6: Submit Results Directly to User's Supabase

**Privacy Architecture:** Data is written DIRECTLY to the user's own Supabase database, never to the central server. The central server only validates the API key for identity.

Read the configuration from `mason.config.json`:

```json
{
  "version": "2.0",
  "apiKey": "mason_xxxxx",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

**Required fields:**

- `apiKey`: Your Mason API key (for identity validation)
- `supabaseUrl`: Your Supabase project URL
- `supabaseAnonKey`: Your Supabase anon (public) key

**Optional fields:**

- `dashboardUrl`: Dashboard URL (defaults to `https://mason.assuredefi.com`)

**Submission Process (2 Steps):**

#### Step 6a: Validate API Key (Central Server)

First, validate the API key to confirm identity:

```bash
DASHBOARD_URL="${dashboardUrl:-https://mason.assuredefi.com}"

VALIDATION=$(curl -s -X POST "${DASHBOARD_URL}/api/v1/analysis" \
  -H "Authorization: Bearer ${apiKey}" \
  -H "Content-Type: application/json")

# Check if valid
if [ "$(echo "$VALIDATION" | jq -r '.valid')" != "true" ]; then
  echo "Error: Invalid API key"
  exit 1
fi

USER_ID=$(echo "$VALIDATION" | jq -r '.user_id')
DASHBOARD_BACKLOG_URL=$(echo "$VALIDATION" | jq -r '.dashboard_url')
```

#### Step 6b: Write Data Directly to User's Supabase

Then, write the improvements directly to the user's own Supabase using the REST API:

```bash
# Generate a UUID for the analysis run
ANALYSIS_RUN_ID=$(uuidgen)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 1: Create analysis run record
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_analysis_runs" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "id": "'${ANALYSIS_RUN_ID}'",
    "mode": "full",
    "items_found": 15,
    "started_at": "'${TIMESTAMP}'",
    "completed_at": "'${TIMESTAMP}'",
    "status": "completed"
  }'

# Step 2: Insert backlog items
# Note: No user_id needed - privacy is enforced via separate databases per user
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_backlog_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '[
    {
      "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
      "title": "Add data freshness timestamps",
      "problem": "Executives cannot tell when data was updated...",
      "solution": "Add visible timestamps...",
      "type": "dashboard",
      "area": "frontend",
      "impact_score": 9,
      "effort_score": 2,
      "complexity": 2,
      "benefits": [...],
      "status": "new"
    }
  ]'
```

**Privacy Guarantee:** The central server (Assure DeFi) NEVER sees your backlog items. Data goes directly from your CLI to YOUR Supabase.

After successful submission, show:

```
Analysis submitted successfully!
Items created: 15
Data stored in: YOUR Supabase (not central server)
View in Dashboard: https://mason.assuredefi.com/admin/backlog
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

## API Configuration

Read credentials from `mason.config.json`:

```json
{
  "version": "2.0",
  "apiKey": "mason_xxxxx",
  "dashboardUrl": "https://mason.assuredefi.com",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

**Required fields:**

- `apiKey`: Your Mason API key (generate at https://mason.assuredefi.com/setup)
- `supabaseUrl`: Your Supabase project URL (found in Supabase Dashboard > Settings > API)
- `supabaseAnonKey`: Your Supabase anon key (found in same location)

**Optional fields:**

- `dashboardUrl`: Dashboard URL (defaults to `https://mason.assuredefi.com`)

### Error Handling

If you encounter API errors:

1. **401 Unauthorized (API Key validation)**: Invalid or expired API key - regenerate at https://mason.assuredefi.com/setup
2. **Supabase 401**: Invalid Supabase credentials - verify supabaseUrl and supabaseAnonKey in mason.config.json
3. **Network error**: Retry up to 3 times with exponential backoff
4. **500 Server Error**: Report the error and suggest trying again later

Example error response:

```
Error: Unable to submit analysis.

Please verify:
1. mason.config.json exists and contains all required fields
2. Your API key starts with "mason_" (not "mason__")
3. Your Supabase URL is correct (https://xxx.supabase.co)
4. Your Supabase anon key is valid

If the problem persists, try again later or contact support.
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

## False Positive Prevention

Before flagging security or quality issues, verify they are real problems:

### Security Analysis Rules

**Environment Files:**

- `.env.example` files with placeholder values (e.g., `your-api-key`, `xxx`) are **standard practice**, NOT vulnerabilities
- Before flagging secrets exposure, check:
  1. Is the file tracked in git? (`git ls-files | grep -E '\.env'`)
  2. Does `.gitignore` exclude `.env`, `.env.local`, etc.?
  3. Are the values actual secrets or placeholder text?
- Only flag if: actual secrets are committed AND .gitignore doesn't exclude them

**Common False Positives to AVOID:**
| Pattern | Why It's NOT a Vulnerability |
|---------|------------------------------|
| `.env.example` with `your-xxx` values | Standard documentation pattern |
| `.env.example` in git | Expected - shows required variables |
| `NEXT_PUBLIC_*` env vars | Intentionally public, not secrets |
| API keys in test files with `test_` prefix | Test fixtures, not real credentials |
| Placeholder UUIDs like `00000000-0000-...` | Example values, not real IDs |

**Real Vulnerabilities to Flag:**

- Actual API keys/tokens committed (look for real patterns: `sk-`, `ghp_`, `eyJ`)
- `.env.local` or `.env` files tracked in git with real values
- Hardcoded credentials in source code (not config files)
- Missing `.gitignore` patterns for secret files

### General Verification

Before creating ANY improvement:

1. **Verify the problem exists** - Don't assume based on patterns alone
2. **Check existing mitigations** - The issue may already be handled
3. **Confirm it's actionable** - Vague concerns aren't improvements

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
10. **Avoid false positives** - Verify issues are real before flagging (see False Positive Prevention above)
