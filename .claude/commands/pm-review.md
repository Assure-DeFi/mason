---
name: pm-review
version: 2.14.0
description: PM Review Command - Agent Swarm with iterative validation loop
---

# PM Review Command

You are a **Product Manager agent** analyzing this codebase for improvement opportunities.

---

<!-- ANCHOR: part-1-blocking -->

# PART 1: BLOCKING REQUIREMENTS

**Complete these steps IN ORDER before any analysis.**

## Step 0: Version Check (BLOCKING)

```bash
COMMAND_NAME="pm-review"
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

## Step 1: Argument Parsing (MANDATORY)

```bash
COMMAND_ARGS="$*"

# === 1. DETECT MODE ===
MODE="full"
if echo "$COMMAND_ARGS" | grep -qi "banger"; then
  MODE="banger"
elif echo "$COMMAND_ARGS" | grep -qi "area:"; then
  MODE="area"
  AREA_TYPE=$(echo "$COMMAND_ARGS" | grep -oE "area:[a-z-]+" | cut -d: -f2)
elif echo "$COMMAND_ARGS" | grep -qi "quick"; then
  MODE="quick"
fi

# === 2. DETECT FLAGS ===
AUTO_MODE=false
if echo "$COMMAND_ARGS" | grep -q '\-\-auto'; then
  AUTO_MODE=true
fi

# === 3. DETECT FOCUS CONTEXT ===
FOCUS_CONTEXT=""
if echo "$COMMAND_ARGS" | grep -q "Focus on:"; then
  FOCUS_CONTEXT=$(echo "$COMMAND_ARGS" | sed -n 's/.*Focus on: *\(.*\)/\1/p')
fi

echo "=== PM REVIEW CONFIGURATION ==="
echo "MODE: $MODE"
echo "AUTO_MODE: $AUTO_MODE"
echo "FOCUS_CONTEXT: $FOCUS_CONTEXT"
echo "==============================="
```

---

## Step 2: Mode Routing (MANDATORY)

| MODE     | Section                              | Output             |
| -------- | ------------------------------------ | ------------------ |
| `banger` | [Mode D: Banger](#anchor-mode-d)     | 1 item only        |
| `area`   | [Mode C: Focus Area](#anchor-mode-c) | 5 items, no banger |
| `quick`  | [Mode B: Quick](#anchor-mode-b)      | 9 items (8+1)      |
| `full`   | [Mode A: Full](#anchor-mode-a)       | 25 items (24+1)    |

**Skip directly to your mode section. Do NOT read other mode sections.**

---

## Universal Requirements Table

**EVERY item MUST have ALL of these fields before submission:**

| Requirement     | Field                          | Validation                                                                |
| --------------- | ------------------------------ | ------------------------------------------------------------------------- |
| **5 Benefits**  | `benefits[]`                   | Exactly 5 objects with specific descriptions                              |
| **PRD Content** | `prd_content`                  | Full markdown PRD (NOT empty)                                             |
| **Risk Score**  | `risk_score`                   | Integer 1-10                                                              |
| **Evidence**    | `evidence_status`              | `verified` / `refuted` / `inconclusive`                                   |
| **Type**        | `type`                         | Valid category (feature/ui/ux/api/data/security/performance/code-quality) |
| **Scores**      | `impact_score`, `effort_score` | Integer 1-10 each                                                         |

**Items missing ANY field are BLOCKED from submission.**

---

## Mode Summary

| Mode   | Agents | Items/Agent | Banger | Total |
| ------ | ------ | ----------- | ------ | ----- |
| Full   | 8      | 3           | +1     | 25    |
| Quick  | 8      | 1           | +1     | 9     |
| Area   | 1      | 5           | No     | 5     |
| Banger | N/A    | N/A         | 1      | 1     |

---

# PART 2: SELF-CONTAINED MODE SECTIONS

**Execute ONLY your mode section. Each section is complete.**

---

<!-- ANCHOR: anchor-mode-a -->

## Mode A: Full Review (25 items)

**Execute ONLY if MODE == "full"**

### A.1: Load Domain Knowledge

```bash
SKILL_FILE=".claude/skills/pm-domain-knowledge/SKILL.md"
if [ -f "$SKILL_FILE" ] && head -1 "$SKILL_FILE" | grep -q "INITIALIZED: true"; then
  echo "Domain knowledge loaded"
else
  mkdir -p .claude/skills/pm-domain-knowledge
  # Create default domain knowledge
fi
```

### A.2: Launch 8 Agents (Parallel)

**Launch ALL 8 in ONE message:**

| Agent        | File                     | ITEM_LIMIT | INCLUDE_BANGER |
| ------------ | ------------------------ | ---------- | -------------- |
| Feature      | pm-feature-agent.md      | 3          | true           |
| UI           | pm-ui-agent.md           | 3          | false          |
| UX           | pm-ux-agent.md           | 3          | false          |
| API          | pm-api-agent.md          | 3          | false          |
| Data         | pm-data-agent.md         | 3          | false          |
| Security     | pm-security-agent.md     | 3          | false          |
| Performance  | pm-performance-agent.md  | 3          | false          |
| Code Quality | pm-code-quality-agent.md | 3          | false          |

Each agent returns validated items with: title, problem, solution, type, area, impact_score, effort_score, complexity, is_new_feature, is_banger_idea

### A.3: Aggregate & Deduplicate

Wait for all agents. Combine: 24 regular + 1 banger = 25 items.

Check duplicates against existing backlog:

```bash
EXISTING=$(curl -s "${supabaseUrl}/rest/v1/mason_pm_backlog_items?select=id,title&or=(status.eq.new,status.eq.approved)&repository_id=eq.${REPOSITORY_ID}" \
  -H "apikey: ${supabaseAnonKey}")
```

- title_similarity >= 70% → DUPLICATE
- Same target file → DUPLICATE

### A.4: Generate PRD for EACH Item (MANDATORY)

**Every item needs a PRD. Generate for all 25:**

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

### A.5: Generate 5 Benefits for EACH Item (MANDATORY)

```json
{
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "[SPECIFIC]"
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "[SPECIFIC]"
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "[SPECIFIC]"
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "[SPECIFIC]"
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "[SPECIFIC]"
    }
  ]
}
```

### A.6: Risk Analysis for EACH Item

Calculate `risk_score` (1-10) based on: files affected, breaking changes, test coverage gaps.

### A.7: Evidence Validation for EACH Item

- `verified`: Problem exists → keep
- `refuted`: Problem doesn't exist → REMOVE
- `inconclusive`: Uncertain → flag

### A.8: Validation Gate (BLOCKING)

```bash
echo "=== VALIDATION GATE (Full Mode) ==="
TOTAL=<count>; BANGER=<is_banger_idea count>; PRD=<prd_content count>; BENEFITS=<5 benefits count>; RISK=<risk_score count>

[ "$TOTAL" -gt 25 ] && echo "BLOCKED: Max 25 items"
[ "$BANGER" -ne 1 ] && echo "BLOCKED: Need exactly 1 banger"
[ "$PRD" -ne "$TOTAL" ] && echo "BLOCKED: Missing PRDs"
[ "$BENEFITS" -ne "$TOTAL" ] && echo "BLOCKED: Missing benefits"
[ "$RISK" -ne "$TOTAL" ] && echo "BLOCKED: Missing risk scores"
echo "===================================="
```

**If ANY fails: Fix before proceeding.**

### A.9: Submit

See [Submission Process](#anchor-submission).

---

<!-- ANCHOR: anchor-mode-b -->

## Mode B: Quick Review (9 items)

**Execute ONLY if MODE == "quick"**

### B.1: Load Domain Knowledge

Same as A.1.

### B.2: Launch 8 Agents (ITEM_LIMIT=1 each)

Same agents as Mode A, but `ITEM_LIMIT=1`. Feature agent has `INCLUDE_BANGER=true`.

### B.3: Aggregate & Deduplicate

8 regular + 1 banger = 9 items.

### B.4: Generate PRD for EACH Item

Same template as A.4. Generate for all 9.

### B.5: Generate 5 Benefits for EACH Item

Same as A.5.

### B.6: Risk Analysis for EACH Item

Same as A.6.

### B.7: Evidence Validation for EACH Item

Same as A.7.

### B.8: Validation Gate (BLOCKING)

```bash
echo "=== VALIDATION GATE (Quick Mode) ==="
[ "$TOTAL" -gt 9 ] && echo "BLOCKED: Max 9 items"
[ "$BANGER" -ne 1 ] && echo "BLOCKED: Need exactly 1 banger"
# Check PRD, benefits, risk for all
echo "====================================="
```

### B.9: Submit

See [Submission Process](#anchor-submission).

---

<!-- ANCHOR: anchor-mode-c -->

## Mode C: Focus Area (5 items)

**Execute ONLY if MODE == "area"**

### C.1: Load Domain Knowledge

Same as A.1.

### C.2: Launch SINGLE Agent

| AREA_TYPE    | Agent File               |
| ------------ | ------------------------ |
| feature      | pm-feature-agent.md      |
| ui           | pm-ui-agent.md           |
| ux           | pm-ux-agent.md           |
| api          | pm-api-agent.md          |
| data         | pm-data-agent.md         |
| security     | pm-security-agent.md     |
| performance  | pm-performance-agent.md  |
| code-quality | pm-code-quality-agent.md |

`ITEM_LIMIT=5`, `INCLUDE_BANGER=false`

### C.3: Generate PRD for EACH Item

Same template as A.4. Generate for all 5.

### C.4: Generate 5 Benefits for EACH Item

Same as A.5.

### C.5: Risk Analysis for EACH Item

Same as A.6.

### C.6: Evidence Validation for EACH Item

Same as A.7.

### C.7: Validation Gate (BLOCKING)

```bash
echo "=== VALIDATION GATE (Focus Mode) ==="
[ "$TOTAL" -gt 5 ] && echo "BLOCKED: Max 5 items"
[ "$BANGER" -gt 0 ] && echo "WARNING: Focus mode has no banger"
# Check PRD, benefits, risk for all
echo "====================================="
```

### C.8: Submit

See [Submission Process](#anchor-submission).

---

<!-- ANCHOR: anchor-mode-d -->

## Mode D: Banger Mode (1 item)

**Execute ONLY if MODE == "banger"**

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         BANGER MODE ACTIVE                               ║
║                                                                          ║
║  DO NOT launch 8 category agents                                         ║
║  DO NOT generate 8-25 items                                              ║
║                                                                          ║
║  ONLY follow phases D.1-D.10 below                                       ║
║  ONLY produce EXACTLY 1 banger item                                      ║
║  ONLY submit 1 item to the database                                      ║
║                                                                          ║
║  Expected: "All 1 items submitted successfully"                          ║
║  If you submit more than 1 item, YOU HAVE FAILED.                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### D.1: Deep Codebase Understanding (3 Parallel Agents)

Launch 3 Explore agents in ONE message:

```
Agent 1: Analyze architecture. ${FOCUS_CONTEXT ? "Focus: " + FOCUS_CONTEXT : ""}
Agent 2: Study user flows. ${FOCUS_CONTEXT ? "Focus: " + FOCUS_CONTEXT : ""}
Agent 3: Find feature gaps. ${FOCUS_CONTEXT ? "Focus: " + FOCUS_CONTEXT : ""}
```

### D.2: Generate 10 Big Ideas

```
subagent_type: "feature-ideation"
prompt: Generate 10 BIG IDEAS. ${FOCUS_CONTEXT ? "All for: " + FOCUS_CONTEXT : ""}
  NOT: Bug fixes, performance, UI tweaks
  ARE: Game-changing features, "Holy shit" innovations
  Return: title, vision, wow_factor, user_value, complexity_estimate
```

### D.3: Select THE Banger

```
subagent_type: "general-purpose"
prompt: Pick THE ONE that is BEST, BRIGHTEST, BIGGEST impact, technically feasible.
  ${FOCUS_CONTEXT ? "Most relevant to: " + FOCUS_CONTEXT : ""}
  Return selection with justification.
```

### D.4: Generate PRD for Banger (MANDATORY)

```markdown
# PRD: [Selected Banger Title]

## Problem Statement

[Why this capability doesn't exist and why users need it]

## Proposed Solution

[Detailed description]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Technical Approach

### Wave 1: Foundation

| #   | Subagent | Task                        |
| --- | -------- | --------------------------- |
| 1.1 | Explore  | Research architecture       |
| 1.2 | Explore  | Identify integration points |

### Wave 2: Implementation

| #   | Subagent        | Task           |
| --- | --------------- | -------------- |
| 2.1 | general-purpose | Build core     |
| 2.2 | general-purpose | Add components |

### Wave 3: Polish

| #   | Subagent        | Task      |
| --- | --------------- | --------- |
| 3.1 | general-purpose | Add tests |
| 3.2 | code-reviewer   | Review    |

## Risks & Mitigations

| Risk   | Mitigation   |
| ------ | ------------ |
| [Risk] | [Mitigation] |

## Out of Scope

- [Excluded]
```

Store: `item.prd_content = prd`

### D.5: Generate 5 Benefits for Banger (MANDATORY)

```json
{
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "[Transformative benefit]"
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "[Revenue impact]"
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "[Ops gain]"
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "[Capability added]"
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "[System improvement]"
    }
  ]
}
```

### D.6: Risk Analysis for Banger

Calculate `risk_score` (1-10).

### D.7: Evidence Validation for Banger

Verify feature doesn't exist:

- `verified`: New → proceed
- `refuted`: Exists → pick different idea

### D.8: Validation Gate (BLOCKING - Banger Mode)

```bash
echo "=== VALIDATION GATE (Banger Mode) ==="
TOTAL=<count>; BANGER=<is_banger_idea count>

[ "$TOTAL" -ne 1 ] && echo "BLOCKED: Must be exactly 1 item"
[ "$BANGER" -ne 1 ] && echo "BLOCKED: Must have is_banger_idea=true"
[ -z "$PRD_CONTENT" ] && echo "BLOCKED: Missing PRD"
[ "$BENEFITS_COUNT" -ne 5 ] && echo "BLOCKED: Need 5 benefits"
[ -z "$RISK_SCORE" ] && echo "BLOCKED: Missing risk score"
echo "======================================"
```

### D.9: Display Selection

```markdown
## Banger Selection Complete

### THE SELECTED BANGER

**Title:** [Title]
**Vision:** [Description]
**Why This One:** [Justification]

### Rejected Candidates (9 NOT selected)

| #   | Title   | Why Not  |
| --- | ------- | -------- |
| 1   | [Title] | [Reason] |

...

Note: Rejected shown for transparency, NOT stored.
```

### D.10: Submit

See [Submission Process](#anchor-submission). Submit exactly 1 item.

---

<!-- ANCHOR: anchor-submission -->

# PART 3: SUBMISSION & REFERENCE

## Submission Process

### Step 1: Read Config

```bash
apiKey=$(jq -r '.apiKey' mason.config.json)
supabaseUrl=$(jq -r '.supabaseUrl' mason.config.json)
supabaseAnonKey=$(jq -r '.supabaseAnonKey' mason.config.json)
dashboardUrl=$(jq -r '.dashboardUrl // "https://mason.assuredefi.com"' mason.config.json)
```

### Step 2: Validate API Key & Get Repository ID

```bash
VALIDATION=$(curl -s -X POST "${dashboardUrl}/api/v1/analysis" \
  -H "Authorization: Bearer ${apiKey}" \
  -H "Content-Type: application/json")

USER_ID=$(echo "$VALIDATION" | jq -r '.user_id')
REPOSITORIES=$(echo "$VALIDATION" | jq -r '.repositories')

GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
REPO_FULL_NAME=$(echo "$GIT_REMOTE" | sed -E 's/\.git$//' | sed -E 's|.*github\.com[:/]||')
REPOSITORY_ID=$(echo "$REPOSITORIES" | jq -r --arg name "$REPO_FULL_NAME" '.[] | select(.github_full_name == $name) | .id // empty')

echo "=== REPOSITORY MATCHING ==="
echo "Git remote: $GIT_REMOTE"
echo "Repo name: $REPO_FULL_NAME"
echo "Repository ID: $REPOSITORY_ID"
echo "==========================="
```

### Step 3: HARD STOP - Repository ID Required

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
  echo "║  Then re-run /pm-review                                                  ║"
  echo "╚══════════════════════════════════════════════════════════════════════════╝"
  exit 1
fi
```

### Step 4: Create Analysis Run

```bash
ANALYSIS_RUN_ID=$(uuidgen)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_analysis_runs" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'${ANALYSIS_RUN_ID}'",
    "mode": "'${MODE}'",
    "items_found": '${TOTAL_ITEMS}',
    "status": "completed",
    "repository_id": "'${REPOSITORY_ID}'"
  }'
```

### Step 5: Insert Items

**Every item MUST have all required fields:**

```bash
curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_backlog_items" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}" \
  -H "Content-Type: application/json" \
  -d '[{
    "analysis_run_id": "'${ANALYSIS_RUN_ID}'",
    "repository_id": "'${REPOSITORY_ID}'",
    "user_id": "'${USER_ID}'",
    "title": "...",
    "problem": "...",
    "solution": "...",
    "type": "...",
    "area": "...",
    "impact_score": 8,
    "effort_score": 3,
    "complexity": 3,
    "benefits": [...5 objects...],
    "is_new_feature": true,
    "is_banger_idea": false,
    "status": "new",
    "prd_content": "# PRD: ...",
    "prd_generated_at": "'${TIMESTAMP}'",
    "risk_score": 5,
    "evidence_status": "verified"
  }]'
```

### Step 6: Completion

```
Analysis submitted successfully!
Mode: ${MODE}
Items: ${TOTAL_ITEMS}
PRDs: 100%
Dashboard: ${dashboardUrl}/admin/backlog
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

**Complexity (1-5):** 1=trivial, 2=straightforward, 3=multiple components, 4=architectural, 5=major system

---

## Category Badges

| Category     | Color       | Use For               |
| ------------ | ----------- | --------------------- |
| feature      | Purple+Star | Net-new functionality |
| ui           | Gold        | Visual, styling       |
| ux           | Cyan        | User flows            |
| api          | Green       | Endpoints, backend    |
| data         | Blue        | Database, queries     |
| security     | Red         | Auth, vulnerabilities |
| performance  | Orange      | Speed, caching        |
| code-quality | Gray        | Refactors, debt       |

---

## False Positive Prevention

Before flagging security issues:

1. `git ls-files <file>` - tracked?
2. `.gitignore` excludes it?
3. Real secrets or placeholders?

**Avoid:** `.env.example`, `NEXT_PUBLIC_*`, test fixtures, gitignored files

---

## Output Format

```markdown
## PM Review Complete

**Mode**: ${MODE}
**Items**: ${COUNT} / ${MAX}
**PRDs**: 100%

### Validation

| Check    | Status |
| -------- | ------ |
| Count    | PASS   |
| Banger   | PASS   |
| PRDs     | PASS   |
| Benefits | PASS   |
| Risk     | PASS   |

### Items

| #   | Title | Type | Impact | Effort | Priority |
| --- | ----- | ---- | ------ | ------ | -------- |
| 1   | ...   | ...  | 9      | 2      | 16       |

### Next Steps

1. View: ${dashboardUrl}/admin/backlog
2. Approve items
3. Run /execute-approved
```
