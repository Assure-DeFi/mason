---
name: pm-autopilot
version: 1.2.0
description: Autopilot daily review - generates exactly N actionable items
---

# PM Autopilot Command

Generates exactly **N** actionable improvement items for automated execution. Used by the autopilot daemon.

**Arguments:** `--limit N` (default: 5, range: 1-40)

---

## STEP 1: Version Check (BLOCKING)

```bash
COMMAND_NAME="pm-autopilot"
LOCAL_VERSION=$(grep -m1 "^version:" ".claude/commands/${COMMAND_NAME}.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
REMOTE=$(curl -fsSL --connect-timeout 3 "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/versions.json" 2>/dev/null)
REQUIRED_MIN=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".required_minimum // \"\"" 2>/dev/null)
BREAKING_REASON=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".breaking_reason // \"\"" 2>/dev/null)

echo "=== VERSION CHECK ==="
echo "Local: v${LOCAL_VERSION}"
echo "Required minimum: v${REQUIRED_MIN}"

if [ -n "$REQUIRED_MIN" ] && [ -n "$LOCAL_VERSION" ]; then
  if [ "$(printf '%s\n' "$REQUIRED_MIN" "$LOCAL_VERSION" | sort -V | head -n1)" = "$LOCAL_VERSION" ] && \
     [ "$LOCAL_VERSION" != "$REQUIRED_MIN" ]; then
    echo "STATUS: OUTDATED - AUTO-UPDATING..."
    echo "Reason: $BREAKING_REASON"
  else
    echo "STATUS: OK"
  fi
fi
echo "===================="
```

**IF OUTDATED:** Invoke `/mason-update`, wait, re-read this file, restart.

---

## STEP 2: Parse Arguments

```bash
# Default limit
ITEM_LIMIT=5

# Parse --limit N from arguments
if echo "$*" | grep -q "\-\-limit"; then
  ITEM_LIMIT=$(echo "$*" | sed -n 's/.*--limit[= ]\?\([0-9]\+\).*/\1/p')
fi

# Clamp to valid range
[ "$ITEM_LIMIT" -lt 1 ] && ITEM_LIMIT=1
[ "$ITEM_LIMIT" -gt 40 ] && ITEM_LIMIT=40

echo "=== AUTOPILOT CONFIGURATION ==="
echo "ITEM_LIMIT: ${ITEM_LIMIT}"
echo "================================"
```

---

## STEP 3: Repository Validation (BLOCKING)

```bash
apiKey=$(jq -r '.apiKey' mason.config.json)
supabaseUrl=$(jq -r '.supabaseUrl' mason.config.json)
supabaseAnonKey=$(jq -r '.supabaseAnonKey' mason.config.json)
dashboardUrl=$(jq -r '.dashboardUrl // "https://mason.assuredefi.com"' mason.config.json)

# Validate API key directly against user's Supabase (privacy: keys stay in user's DB)
if command -v sha256sum &>/dev/null; then
  KEY_HASH=$(echo -n "$apiKey" | sha256sum | cut -d' ' -f1)
elif command -v shasum &>/dev/null; then
  KEY_HASH=$(echo -n "$apiKey" | shasum -a 256 | cut -d' ' -f1)
else
  echo "ERROR: sha256sum or shasum required"; exit 1
fi

KEY_DATA=$(curl -s "${supabaseUrl}/rest/v1/mason_api_keys?key_hash=eq.${KEY_HASH}&select=user_id" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}")
USER_ID=$(echo "$KEY_DATA" | jq -r '.[0].user_id // empty')

if [ -z "$USER_ID" ]; then
  echo "ERROR: Invalid API key. Check mason.config.json apiKey value."
  exit 1
fi

# Get connected repositories from user's Supabase
REPOSITORIES=$(curl -s "${supabaseUrl}/rest/v1/mason_github_repositories?user_id=eq.${USER_ID}&is_active=eq.true&select=id,github_full_name,github_clone_url,github_html_url" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}")

GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
REPO_FULL_NAME=$(echo "$GIT_REMOTE" | sed -E 's/\.git$//' | sed -E 's|.*github\.com[:/]||')
REPOSITORY_ID=$(echo "$REPOSITORIES" | jq -r --arg name "$REPO_FULL_NAME" '.[] | select((.github_full_name | ascii_downcase) == ($name | ascii_downcase)) | .id // empty')

echo "=== REPOSITORY VALIDATION ==="
echo "Git remote: $GIT_REMOTE"
echo "Repo name: $REPO_FULL_NAME"
echo "Repository ID: $REPOSITORY_ID"
echo "============================="
```

### HARD STOP - Repository ID Required

```bash
if [ -z "$REPOSITORY_ID" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════════════╗"
  echo "║                    HARD STOP: REPOSITORY NOT CONNECTED                   ║"
  echo "║                                                                          ║"
  echo "║  This repository is not connected to Mason.                              ║"
  echo "║  Items created without repository_id will NOT appear in dashboard.       ║"
  echo "║                                                                          ║"
  echo "║  TO FIX: Connect this repository at:                                     ║"
  echo "║    ${dashboardUrl}/settings/github                                       ║"
  echo "║                                                                          ║"
  echo "║  Then re-run /pm-autopilot                                               ║"
  echo "╚══════════════════════════════════════════════════════════════════════════╝"
  exit 1
fi
```

---

## STEP 4: Calculate Category Distribution

Categories in priority order:

1. Feature
2. Security
3. Performance
4. API
5. UX
6. UI
7. Data
8. Code Quality

**Distribution rules:**

- `N <= 8`: Pick top N categories by priority, 1 item each
- `N > 8`: All 8 categories. Distribute extras to highest-priority categories first (round-robin from top)

```
Example: --limit 5  → Feature(1), Security(1), Performance(1), API(1), UX(1)
Example: --limit 10 → Feature(2), Security(2), Performance(1), API(1), UX(1), UI(1), Data(1), Code Quality(1)
Example: --limit 20 → Feature(3), Security(3), Performance(3), API(3), UX(3), UI(2), Data(2), Code Quality(1)
```

---

## STEP 5: Launch Category Agents (Parallel)

Launch agents for each active category. Each agent gets its assigned ITEM_COUNT.

**Agent Prompt Template:**

```
You are a PM agent specializing in [CATEGORY].

Analyze this codebase and find the [ITEM_COUNT] MOST IMPORTANT improvement opportunities in your domain.

Return exactly [ITEM_COUNT] items, each with:
- title: string
- problem: string
- solution: string
- type: "[category]"
- area: string (affected codebase area)
- impact_score: 1-10
- effort_score: 1-10
- complexity: 1-5
- is_new_feature: boolean
- is_banger_idea: false

IMPORTANT: Return actionable, implementable improvements. No aspirational or vague suggestions.
Each item must be independently executable as a single PR.
```

---

## STEP 6: Aggregate Results

Wait for all agents. Combine results.

**Total must equal ITEM_LIMIT exactly.**

Check duplicates against existing backlog:

```bash
EXISTING=$(curl -s "${supabaseUrl}/rest/v1/mason_pm_backlog_items?select=id,title&or=(status.eq.new,status.eq.approved)&repository_id=eq.${REPOSITORY_ID}" \
  -H "apikey: ${supabaseAnonKey}")
```

- title_similarity >= 70% → DUPLICATE (remove and regenerate from same category)

---

## STEP 7: Generate PRD for EACH Item

For each item, generate:

```markdown
# PRD: [Title]

## Problem Statement

[Expanded from item.problem]

## Proposed Solution

[Expanded from item.solution]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Technical Approach

### Wave 1: Exploration

| #   | Subagent | Task              |
| --- | -------- | ----------------- |
| 1.1 | Explore  | Research patterns |

### Wave 2: Implementation

| #   | Subagent        | Task      |
| --- | --------------- | --------- |
| 2.1 | general-purpose | Implement |

## Risks & Mitigations

| Risk   | Mitigation   |
| ------ | ------------ |
| [Risk] | [Mitigation] |

## Out of Scope

- [Excluded items]
```

Store: `item.prd_content = prd`

---

## STEP 8: Generate 5 Benefits for EACH Item

For each item:

```json
{
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "[Specific]"
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "[Specific]"
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "[Specific]"
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "[Specific]"
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "[Specific]"
    }
  ]
}
```

---

## STEP 9: Risk Analysis for EACH Item

Calculate `risk_score` (1-10) based on:

- Files affected
- Breaking changes potential
- Test coverage gaps
- Integration complexity

---

## STEP 10: Evidence Validation

For each item:

- `verified`: Problem exists → keep
- `refuted`: Problem doesn't exist → REMOVE and regenerate
- `inconclusive`: Uncertain → flag

---

## STEP 11: Validation Gate (BLOCKING)

```bash
echo "=== VALIDATION GATE (Autopilot Mode) ==="

TOTAL=<count>
PRD_COUNT=<items with prd_content count>
BENEFITS_COUNT=<items with 5 benefits count>
RISK_COUNT=<items with risk_score count>

[ "$TOTAL" -ne "$ITEM_LIMIT" ] && echo "BLOCKED: Expected $ITEM_LIMIT items (got $TOTAL)" && exit 1
[ "$PRD_COUNT" -ne "$TOTAL" ] && echo "BLOCKED: Missing PRDs ($PRD_COUNT/$TOTAL)" && exit 1
[ "$BENEFITS_COUNT" -ne "$TOTAL" ] && echo "BLOCKED: Missing benefits ($BENEFITS_COUNT/$TOTAL)" && exit 1
[ "$RISK_COUNT" -ne "$TOTAL" ] && echo "BLOCKED: Missing risk scores ($RISK_COUNT/$TOTAL)" && exit 1

echo "PASSED: All validations complete ($TOTAL items)"
echo "==========================================="
```

---

## STEP 12: Submit

### Create Analysis Run

```bash
ANALYSIS_RUN_ID=$(uuidgen)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_analysis_runs" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'${ANALYSIS_RUN_ID}'",
    "mode": "autopilot",
    "items_found": '${TOTAL}',
    "status": "completed",
    "repository_id": "'${REPOSITORY_ID}'"
  }'
```

### Insert Items

```bash
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_backlog_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
      "repository_id": "'${REPOSITORY_ID}'",
      "user_id": "'${USER_ID}'",
      "title": "...",
      "problem": "...",
      "solution": "...",
      "type": "...",
      "area": "...",
      "impact_score": X,
      "effort_score": X,
      "complexity": X,
      "benefits": [...5 objects...],
      "is_new_feature": true/false,
      "is_banger_idea": false,
      "status": "new",
      "source": "autopilot",
      "prd_content": "# PRD: ...",
      "prd_generated_at": "'${TIMESTAMP}'",
      "risk_score": X,
      "evidence_status": "verified"
    }
  ]'
```

---

## STEP 13: Output

```markdown
## Autopilot Review Complete

**Mode**: autopilot
**Items**: ${TOTAL} / ${ITEM_LIMIT}
**PRDs**: 100%

### Validation

| Check    | Status          |
| -------- | --------------- |
| Count    | PASS (${TOTAL}) |
| PRDs     | PASS (${TOTAL}) |
| Benefits | PASS            |
| Risk     | PASS            |

### Items

| #   | Title   | Type    | Impact | Effort | Priority |
| --- | ------- | ------- | ------ | ------ | -------- |
| 1   | [Title] | feature | 9      | 2      | 16       |

### Summary

All ${TOTAL} items submitted with status: new
Ready for auto-approval and execution.
```

---

## Scoring Reference

| Score | Impact (1-10)  | Effort (1-10) |
| ----- | -------------- | ------------- |
| 9-10  | Critical/major | Weeks         |
| 7-8   | Significant    | Days          |
| 5-6   | Moderate       | Day or two    |
| 3-4   | Nice to have   | Hours         |
| 1-2   | Minor          | Minutes       |

**Priority:** `(Impact × 2) - Effort`

---

## Category Reference

| Category     | Type Badge  |
| ------------ | ----------- |
| feature      | Purple+Star |
| ui           | Gold        |
| ux           | Cyan        |
| api          | Green       |
| data         | Blue        |
| security     | Red         |
| performance  | Orange      |
| code-quality | Gray        |
