# PM Review Command

You are a **Product Manager agent** analyzing this codebase for improvement opportunities.

## Overview

This command performs a comprehensive analysis of the codebase to identify improvements across multiple domains: frontend UX, API/backend, reliability, security, and code quality.

## Modes

- `full` (default): Discover ALL improvements, validate each, generate PRD for EVERY validated item
- `area:<name>`: Focus on specific area (frontend-ux, api-backend, reliability, security, code-quality)
- `quick`: Focus on quick wins only (low effort, high impact) - still requires PRD for each

**CRITICAL: Every item that enters the database MUST have a PRD. No exceptions.**

Usage: `/pm-review [mode]`

Examples:

- `/pm-review` - Full analysis
- `/pm-review area:frontend-ux` - Focus on frontend improvements
- `/pm-review quick` - Quick wins only

## Context Instructions

The command may include additional context after the mode parameter. This context tells the agent WHERE to focus the analysis within the codebase.

**Format:**

```
/pm-review [mode]

Focus on: <context>
```

**Examples:**

```
/pm-review area:frontend-ux

Focus on: Authentication flow, specifically the login page and session management
```

```
/pm-review quick

Focus on: Dashboard components in src/components/dashboard/
```

**How to Use Focus Context:**

1. **Parse the context**: Extract the text after "Focus on:"
2. **Narrow file exploration**: Prioritize files/directories mentioned in the context
3. **Filter suggestions**: Only generate improvements relevant to the focused area
4. **Interpret intent**: Understand semantic descriptions like "authentication flow" and map to relevant files (auth/, login, session, etc.)

**Context Interpretation Rules:**

| Context Pattern                   | Files/Dirs to Prioritize                     |
| --------------------------------- | -------------------------------------------- |
| "authentication", "auth", "login" | `**/auth/**`, `**/login/**`, `**/session/**` |
| "dashboard", "admin panel"        | `**/dashboard/**`, `**/admin/**`             |
| "API", "endpoints", "routes"      | `**/api/**`, `**/routes/**`                  |
| "database", "queries", "supabase" | `**/lib/supabase/**`, `**/db/**`, `**/*.sql` |
| "components", "UI"                | `**/components/**`                           |
| Specific path mentioned           | That exact path and subdirectories           |

**Important:** When focus context is provided:

- Reduce total suggestions (5-10 instead of 10-20) but make them highly targeted
- Every suggestion MUST relate to the focused area
- Include file paths in suggestions that match the focus

## Process

> **IMPORTANT**: Domain knowledge questions are asked ONCE per repository during first run.
> On subsequent runs, SKIP Step 0 entirely and go directly to Step 1.
> The file `.claude/skills/pm-domain-knowledge/SKILL.md` persists your preferences.

### Step 0: Initialize Domain Knowledge (ONE-TIME ONLY)

**CRITICAL: This step runs ONCE per repository. If already done, SKIP TO STEP 1.**

Before anything else, check if domain knowledge exists:

```bash
# Check if file exists and is populated
if [ -f ".claude/skills/pm-domain-knowledge/SKILL.md" ]; then
  # Check for template placeholders that indicate uninitialized file
  if ! grep -q '\[PROJECT_NAME\]\|\[Goal 1\]\|\[type of application\]' ".claude/skills/pm-domain-knowledge/SKILL.md" 2>/dev/null; then
    echo "Domain knowledge already initialized - skipping questions"
    # SKIP TO STEP 1 - DO NOT ASK QUESTIONS
  fi
fi
```

**Decision logic:**

- File exists AND has NO template placeholders → **SKIP TO STEP 1** (do NOT ask questions)
- File missing OR has template placeholders → Initialize below (one-time setup)

**If AND ONLY IF initialization is needed (first run only):**

#### A. Ask 3 Quick Questions

Use the AskUserQuestion tool with these 3 questions in a single call:

```json
{
  "questions": [
    {
      "question": "What matters most to your team right now?",
      "header": "Priorities",
      "multiSelect": true,
      "options": [
        {
          "label": "Ship features quickly",
          "description": "Focus on delivering new functionality fast"
        },
        {
          "label": "Stability/reliability",
          "description": "Reduce bugs, improve uptime"
        },
        {
          "label": "User experience",
          "description": "Polish UI, reduce friction"
        },
        {
          "label": "Security",
          "description": "Harden auth, fix vulnerabilities"
        }
      ]
    },
    {
      "question": "Who primarily uses this application?",
      "header": "Users",
      "multiSelect": false,
      "options": [
        {
          "label": "Developers/technical",
          "description": "CLI users, API consumers, technical staff"
        },
        {
          "label": "Business/non-technical",
          "description": "End users who need intuitive UI"
        },
        {
          "label": "Mixed audience",
          "description": "Both technical and non-technical users"
        }
      ]
    },
    {
      "question": "Any areas that should NOT receive improvement suggestions?",
      "header": "Off-limits",
      "multiSelect": false,
      "options": [
        {
          "label": "No off-limits areas",
          "description": "Analyze the entire codebase"
        },
        {
          "label": "Yes, exclude some areas",
          "description": "Use 'Other' to specify areas to skip"
        }
      ]
    }
  ]
}
```

#### B. Auto-Detect from Repository

Gather project information automatically:

| Field           | Detection Strategy                                          |
| --------------- | ----------------------------------------------------------- |
| Project Name    | `package.json` name field, or directory name as fallback    |
| Description     | `package.json` description, or first paragraph of README.md |
| Tech Stack      | Parse dependencies (react, next, express, supabase, etc.)   |
| Tech Debt Count | Count of TODO, FIXME, @todo, HACK comments in codebase      |

**Detection commands:**

```bash
# Project name and description
jq -r '.name // empty' package.json 2>/dev/null
jq -r '.description // empty' package.json 2>/dev/null

# Tech stack from dependencies
jq -r '.dependencies // {} | keys[]' package.json 2>/dev/null | head -20

# Tech debt count
grep -r -E '(TODO|FIXME|@todo|HACK):?' --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | wc -l
```

#### C. Map User Answers to Domain Knowledge

**Priority Mapping:**

| User Selection        | Domain Priority Weights                                         |
| --------------------- | --------------------------------------------------------------- |
| Ship features quickly | frontend-ux: High, api-backend: High, code-quality: Low         |
| Stability/reliability | reliability: Critical, code-quality: High, frontend-ux: Medium  |
| User experience       | frontend-ux: Critical, api-backend: Medium, reliability: Medium |
| Security              | security: Critical, reliability: High, code-quality: Medium     |

**User Persona Mapping:**

| User Selection         | Generated Persona                                                       |
| ---------------------- | ----------------------------------------------------------------------- |
| Developers/technical   | Technical users comfortable with CLI/APIs, value efficiency over polish |
| Business/non-technical | Non-technical users who need intuitive UI and clear messaging           |
| Mixed audience         | Both technical and non-technical users with varying skill sets          |

**Off-Limits Mapping:**

| User Selection          | Off-Limits Section                              |
| ----------------------- | ----------------------------------------------- |
| No off-limits areas     | Leave section empty with "None specified"       |
| Yes, exclude some areas | Parse the "Other" text input into bullet points |

#### D. Generate Domain Knowledge File

Write the populated domain knowledge to `.claude/skills/pm-domain-knowledge/SKILL.md` using the Write tool. Include:

1. Auto-generated header comment: `<!-- Auto-generated by /pm-review. Edit to customize. -->`
2. Project overview from auto-detection
3. User personas from user answer
4. Domain priorities from user answer
5. Off-limits areas from user answer
6. Sensible defaults for other sections

#### E. Show Summary and Continue

Display a brief summary:

```
Domain knowledge initialized for [Project Name]
  Priorities: [user selections]
  Users: [user selection]
  Saved to: .claude/skills/pm-domain-knowledge/SKILL.md

This is a ONE-TIME setup. Future /pm-review runs will use these saved preferences.

Continuing with PM review...
```

Then proceed to Step 1.

**END OF ONE-TIME INITIALIZATION** - Future runs skip directly to Step 1.

---

### Step 1: Load Domain Knowledge

Load the domain-specific knowledge from `.claude/skills/pm-domain-knowledge/SKILL.md`. This provides context about:

- Business goals and priorities
- Technical constraints
- User personas
- Known pain points

### Step 2: Analyze Codebase

**If focus context is provided:** Before exploring all domains, first identify the relevant files/directories based on the "Focus on:" context. Limit your initial exploration to these areas. Only generate improvements that directly relate to the focused area.

Explore the codebase systematically across these domains:

| Domain           | What to Look For                                                       |
| ---------------- | ---------------------------------------------------------------------- |
| **frontend-ux**  | UI/UX issues, accessibility, responsive design, user flow friction     |
| **api-backend**  | API design, performance, error handling, missing endpoints             |
| **reliability**  | Error handling, logging, monitoring, retry logic, graceful degradation |
| **security**     | Auth issues, input validation, secrets exposure, OWASP vulnerabilities |
| **code-quality** | Code duplication, complexity, naming, testing gaps, technical debt     |
| **new-features** | New capabilities, integrations, automation opportunities, user-value ideas |

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



### Step 5.2: Feature Discovery (new-features domain)

In addition to improvements, discover **new feature opportunities** that don't exist yet. This shifts the mindset from "what's wrong?" to "what could be amazing?"

**Feature Discovery Mindset:**
- Think like a product manager building a v2.0 roadmap
- Focus on user value, not technical improvements
- Ask: "What would make users say 'wow, I wish it did THAT'?"

**Questions to Guide Feature Discovery:**
1. What is this application's core purpose?
2. Who are the primary users and what do they care about?
3. What adjacent problems could this app solve with the right features?
4. What integrations would make this 10x more useful?
5. What automation opportunities exist for repetitive tasks?

**Feature Categories to Consider:**
| Category | Examples |
|----------|----------|
| **Automation** | Repetitive tasks that could be automated |
| **Intelligence** | Places where AI/ML could add value |
| **Insights** | Data that exists but is not being surfaced |
| **Collaboration** | Multi-user or team features |
| **Integrations** | External services that complement the app |
| **Accessibility** | Making the app usable by more people |
| **Mobile/Offline** | Capabilities for different contexts |

**Feature Quality Bar:**
- Must be a NET NEW capability, not an improvement to existing
- Must provide clear user value (not just "would be cool")
- Must be technically feasible with existing architecture
- Should align with the application core purpose

**Examples of GOOD Features (is_new_feature: true):**
- "Add export to PDF for reports"
- "Implement webhook notifications for events"
- "Add team collaboration with shared workspaces"
- "Add AI-powered suggestions based on user history"

**Examples of NOT Features (is_new_feature: false, these are improvements):**
- "Make the loading faster" (performance improvement)
- "Fix the broken validation" (bug fix)
- "Add error handling to API" (reliability improvement)
- "Refactor the component structure" (code quality)

**Feature Fields in Submission:**
```json
{
  "title": "Add real-time collaboration",
  "problem": "Users cannot work together on the same content simultaneously...",
  "solution": "Implement WebSocket-based real-time sync...",
  "is_new_feature": true,
  "is_banger_idea": false
}
```

### Step 5.3: Banger Idea Generation (ONE per analysis)

Every PM review MUST generate exactly ONE "Banger Idea" - a transformative feature that would dramatically increase the app value.

**Banger Idea Characteristics:**
- **Ambitious scope** - Not a quick fix, this is a multi-week project
- **Transformative value** - Would make users say "holy shit, this is next level"
- **Feature-focused** - Not cosmetic, not reliability, not security - pure functionality
- **Vision-aligned** - Amplifies what the app is already trying to do
- **Technically feasible** - Could actually be built with the existing stack

**Banger Idea Quality Criteria:**
- Must be technically feasible with current stack
- Must align with the app core purpose
- Must serve the primary user persona
- Must be a FEATURE (not performance, security, or cosmetic)
- Should require 2+ weeks of development (substantial, not trivial)

**Banger Idea Prompt:**
Think: What feature would make users tell their friends about this app? What capability would justify a premium tier? What would make this app stand out from competitors?

**Banger Idea Fields:**
```json
{
  "title": "Real-Time Collaborative Editing",
  "problem": "Users work in isolation, unable to collaborate in real-time...",
  "solution": "Transform the app from single-user to multiplayer with real-time cursors, instant sync, and presence indicators...",
  "is_new_feature": true,
  "is_banger_idea": true
}
```

**IMPORTANT:** Only ONE item per analysis can have `is_banger_idea: true`. This is the flagship transformative feature. All other items (including other features) should have `is_banger_idea: false`.

### Step 5.4: Deduplication Check

Before validation, check for duplicates against existing backlog:

```bash
# Query existing items in backlog (non-completed, non-rejected)
EXISTING_ITEMS=$(curl -s "${supabaseUrl}/rest/v1/mason_pm_backlog_items?select=id,title,solution,status&status=neq.completed&status=neq.rejected" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}")
```

**Deduplication criteria:**

1. **Title Similarity**: Compare each suggestion title against existing items
   - Extract key words (nouns, verbs) from both titles
   - If >80% word overlap: mark as duplicate

2. **Solution Overlap**: Check if same file/area already has an open item
   - If existing item targets same primary file: mark as duplicate

3. **Cross-Run Duplicates**: Within this analysis run
   - Compare each suggestion against others in the same batch
   - If duplicate found, keep the higher-priority one (higher impact, lower effort)

**Action for duplicates:**

- Log to `mason_pm_filtered_items` with tier="tier2", reason="Duplicate of existing item: <title>"
- Do NOT submit to backlog

### Step 5.5: Validate Suggestions (Parallel)

Before submission, validate each suggestion to filter false positives. This step runs in parallel for efficiency.

#### Validation Process

Invoke the pm-validator agent to check all suggestions:

1. **Tier 1 (Pattern-Based)**: Auto-reject obvious false positives
   - `.env.example` placeholder values
   - Test fixtures (`test_api_key`, `mock_secret`)
   - `NEXT_PUBLIC_*` environment variables
   - Example/sample data in documentation
   - Test files (`__tests__/`, `*.test.*`, `*.spec.*`)
   - Generated code (`.generated.ts`, `@generated`)
   - Config files (`tsconfig.json`, `tailwind.config.*`)
   - Demo/Story files (`*.stories.*`, `examples/`)

2. **Tier 2 (Contextual)**: Investigate the codebase
   - Check for `// why`, `// NOTE`, `// intentional` comments
   - Look for existing error handling/mitigations
   - Check `.claude/skills/pm-domain-knowledge/` Off-Limits
   - Check for in-progress items in same area
   - Check for items completed within last 7 days

3. **Tier 3 (Impact)**: Verify actionable solutions
   - Solution references specific files/patterns
   - Fix improves system without side effects
   - Solution specificity score (must have file paths or function names)
   - File existence validation (referenced files must exist)

#### Log Filtered Items

Insert filtered items to `mason_pm_filtered_items` (include repository_id if available):

```bash
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_filtered_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '[{
    "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
    "repository_id": '$([ -n "$REPOSITORY_ID" ] && echo "\"$REPOSITORY_ID\"" || echo "null")',
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

**Submission Process (3 Steps):**

#### Step 6a: Validate API Key and Get Repositories (Central Server)

First, validate the API key and retrieve connected repositories:

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
# Get connected repositories for matching
REPOSITORIES=$(echo "$VALIDATION" | jq -r '.repositories')
```

#### Step 6b: Match Current Repository

Get the current git remote and match it to find the repository_id:

```bash
# Get the current git remote URL
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

# Extract owner/repo from git remote URL (handles both HTTPS and SSH)
# Examples:
#   https://github.com/owner/repo.git -> owner/repo
#   git@github.com:owner/repo.git -> owner/repo
REPO_FULL_NAME=$(echo "$GIT_REMOTE" | sed -E 's/.*github\.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/')

# Find matching repository_id from the validation response
REPOSITORY_ID=$(echo "$REPOSITORIES" | jq -r --arg name "$REPO_FULL_NAME" '.[] | select(.github_full_name == $name) | .id // empty')

if [ -z "$REPOSITORY_ID" ]; then
  echo "Warning: Repository '$REPO_FULL_NAME' not connected in Mason dashboard."
  echo "Items will be created without repository association."
  echo "To enable multi-repo filtering, connect this repository at: ${DASHBOARD_URL}/settings/github"
fi
```

#### Step 6c: Write Data Directly to User's Supabase

Then, write the improvements directly to the user's own Supabase using the REST API:

```bash
# Generate a UUID for the analysis run
ANALYSIS_RUN_ID=$(uuidgen)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 1: Create analysis run record (include repository_id if available)
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
    "status": "completed",
    "repository_id": '$([ -n "$REPOSITORY_ID" ] && echo "\"$REPOSITORY_ID\"" || echo "null")'
  }'

# Step 2: Insert backlog items with repository_id for multi-repo support
# CRITICAL: EVERY item MUST include is_new_feature and is_banger_idea fields!
# - Regular improvements: is_new_feature: false, is_banger_idea: false
# - New features: is_new_feature: true, is_banger_idea: false
# - The ONE banger idea: is_new_feature: true, is_banger_idea: true
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_backlog_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '[
    {
      "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
      "repository_id": '$([ -n "$REPOSITORY_ID" ] && echo "\"$REPOSITORY_ID\"" || echo "null")',
      "title": "Add data freshness timestamps",
      "problem": "Executives cannot tell when data was updated...",
      "solution": "Add visible timestamps...",
      "type": "dashboard",
      "area": "frontend",
      "impact_score": 9,
      "effort_score": 2,
      "complexity": 2,
      "benefits": [...],
      "is_new_feature": false,
      "is_banger_idea": false,
      "status": "new"
    },
    {
      "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
      "repository_id": '$([ -n "$REPOSITORY_ID" ] && echo "\"$REPOSITORY_ID\"" || echo "null")',
      "title": "Real-Time Collaborative Editing",
      "problem": "Users work in isolation...",
      "solution": "Transform the app to multiplayer with real-time sync...",
      "type": "backend",
      "area": "backend",
      "impact_score": 10,
      "effort_score": 8,
      "complexity": 4,
      "benefits": [...],
      "is_new_feature": true,
      "is_banger_idea": true,
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

### Step 7: Generate PRDs (MANDATORY - ALL Items)

**BLOCKING REQUIREMENT: You MUST generate a PRD for EVERY validated item before submission.**

This is NOT optional. The process is:

1. Discover improvements (as many as are real problems)
2. Validate each improvement (filter false positives)
3. Generate a PRD for EACH validated item (no limit on count)
4. Submit ALL items with their PRDs to the database

**If you have 15 validated improvements, you generate 15 PRDs. If you have 25, you generate 25. There is NO cap.**

An item without a PRD is incomplete and MUST NOT be submitted to the database.

**PRD Structure:**

```markdown
# PRD: [Title]

## Problem Statement

[From item.problem - expanded with context]

## Proposed Solution

[From item.solution - expanded with implementation details]

## Success Criteria

- [ ] [Measurable criterion based on the problem being solved]
- [ ] [User-observable improvement or metric]
- [ ] [Technical validation criterion]

## Technical Approach

### Wave 1: Foundation (Explore subagent)

| #   | Subagent | Task                                        |
| --- | -------- | ------------------------------------------- |
| 1.1 | Explore  | Research existing patterns and dependencies |
| 1.2 | Explore  | Identify affected components and files      |

### Wave 2: Implementation (general-purpose subagent)

| #   | Subagent        | Task                            |
| --- | --------------- | ------------------------------- |
| 2.1 | general-purpose | Implement core changes          |
| 2.2 | general-purpose | Add tests for new functionality |

### Wave 3: Validation (code-reviewer subagent)

| #   | Subagent      | Task                                         |
| --- | ------------- | -------------------------------------------- |
| 3.1 | code-reviewer | Review all changes for quality and standards |

## Risks & Mitigations

| Risk                        | Mitigation                     |
| --------------------------- | ------------------------------ |
| [Based on complexity score] | [Specific mitigation strategy] |

## Out of Scope

- [Explicitly excluded items to prevent scope creep]
```

**Include PRD in submission payload:**

When submitting backlog items in Step 6c, include the PRD content:

```json
{
  "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
  "repository_id": "${REPOSITORY_ID}",
  "title": "...",
  "problem": "...",
  "solution": "...",
  "type": "...",
  "area": "...",
  "impact_score": 8,
  "effort_score": 3,
  "complexity": 2,
  "benefits": [...],
  "status": "new",
  "prd_content": "# PRD: [Title]\n\n## Problem Statement\n...",
  "prd_generated_at": "'${TIMESTAMP}'"
}
```

**PRD Quality Guidelines:**

1. **Problem Statement**: Expand on `item.problem` with user impact and business context
2. **Proposed Solution**: Expand on `item.solution` with specific implementation approach
3. **Success Criteria**: 3-5 measurable criteria that indicate the problem is solved
4. **Technical Approach**: Use wave-based parallel execution (per parallel-task-execution.md rules)
5. **Risks**: Scale complexity based on item's `complexity` score (1-5)
6. **Out of Scope**: Prevent scope creep by explicitly listing what won't be addressed

## Output Format

After analysis, provide a summary:

```markdown
## PM Review Complete

**Mode**: [full/area:X/quick]
**Items Discovered**: [count]
**Items Validated**: [count] (after filtering false positives)
**PRDs Generated**: [count] (MUST equal validated items count)

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
  "repository_id": "${REPOSITORY_ID}",
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
  ],
  "is_new_feature": false,
  "is_banger_idea": false
}
```

**Feature Classification Rules:**
- `is_new_feature: false` + `is_banger_idea: false` = Regular improvement (bug fix, performance, refactor)
- `is_new_feature: true` + `is_banger_idea: false` = New feature capability
- `is_new_feature: true` + `is_banger_idea: true` = The ONE banger idea per analysis

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

1. **MANDATORY: PRD for every item** - No item enters the database without a complete PRD. Period.
2. **No artificial limits** - If you find 20 valid improvements, generate 20 PRDs. If 30, generate 30.
3. **Be thorough but realistic** - Only suggest improvements that provide clear value
4. **Consider existing patterns** - Align suggestions with codebase conventions
5. **Prioritize ruthlessly** - Focus on high-impact, low-effort items first
6. **Be specific** - Vague suggestions are not actionable
7. **Include evidence** - Reference specific files/lines when possible
8. **All 5 benefits required** - Every improvement must have all 5 benefit categories populated
9. **Use new type values** - dashboard, discovery, auth, backend (not feature, fix, refactor)
10. **Use new area values** - frontend, backend (not frontend-ux, api-backend, etc.)
11. **Complexity is numeric** - Use 1-5 integer, not text
12. **Avoid false positives** - Verify issues are real before flagging (see False Positive Prevention above)
