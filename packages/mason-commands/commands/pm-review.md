---
name: pm-review
version: 2.6.1
description: PM Review Command - Agent Swarm with iterative validation loop
---

# PM Review Command

You are a **Product Manager agent** analyzing this codebase for improvement opportunities using a **swarm of 8 specialized category agents**.

## Overview

This command performs a comprehensive analysis of the codebase using 8 specialized agents that run **in parallel**, each focused on a specific category:

| Category         | Badge Color   | Agent Focus                                          |
| ---------------- | ------------- | ---------------------------------------------------- |
| **Feature**      | Purple + Star | Net-new functionality opportunities                  |
| **UI**           | Gold          | Visual changes, components, styling, layout          |
| **UX**           | Cyan          | User flows, journey optimization, friction reduction |
| **API**          | Green         | Endpoints, backend services, contracts               |
| **Data**         | Blue          | Database schema, queries, data modeling              |
| **Security**     | Red           | Vulnerabilities, hardening, input validation, auth   |
| **Performance**  | Orange        | Speed, optimization, caching, load times             |
| **Code Quality** | Gray          | Refactors, cleanup, tech debt, documentation         |

## Item Limits by Mode

| Mode               | Agents           | Items per Agent | Banger  | Total Items |
| ------------------ | ---------------- | --------------- | ------- | ----------- |
| **Full**           | 8 (all parallel) | 3               | Yes (1) | **25**      |
| **Quick**          | 8 (all parallel) | 1               | Yes (1) | **9**       |
| **Focus (area:X)** | 1 (single agent) | 5               | No      | **5**       |
| **Banger**         | All (deep dive)  | N/A             | Yes (1) | **1**       |

**CRITICAL: These limits are enforced. Do NOT exceed them.**

## Banger Idea (Full, Quick & Banger modes)

The banger idea is a transformative feature that would dramatically increase app value:

- **Always a Feature** - Net-new functionality, not improvements
- **Ambitious** - Multi-week scope, not a quick fix
- **Separate from counts** - The +1 banger is in addition to per-agent items (except in Banger mode)

| Mode   | Regular Items     | Banger                    |
| ------ | ----------------- | ------------------------- |
| Full   | 24 (3 × 8 agents) | +1 = **25 total**         |
| Quick  | 8 (1 × 8 agents)  | +1 = **9 total**          |
| Focus  | 5 (from 1 agent)  | None = **5 total**        |
| Banger | None              | **1 total** (banger only) |

## Modes

- `full` (default): All 8 agents run in parallel, 3 items each + 1 banger = **25 items**
- `quick`: All 8 agents run in parallel, 1 item each + 1 banger = **9 items**
- `area:<category>`: Single agent runs, **5 items**, no banger
- `banger`: Deep dive to find ONE game-changing banger idea = **1 item**

**Available focus areas (maps to single agent):**

| Area Command        | Agent                 | Badge  |
| ------------------- | --------------------- | ------ |
| `area:feature`      | pm-feature-agent      | Purple |
| `area:ui`           | pm-ui-agent           | Gold   |
| `area:ux`           | pm-ux-agent           | Cyan   |
| `area:api`          | pm-api-agent          | Green  |
| `area:data`         | pm-data-agent         | Blue   |
| `area:security`     | pm-security-agent     | Red    |
| `area:performance`  | pm-performance-agent  | Orange |
| `area:code-quality` | pm-code-quality-agent | Gray   |

**CRITICAL: Every item that enters the database MUST have a PRD. No exceptions.**

## Flags

- `--auto`: Run in non-interactive/headless mode for autopilot execution. Skips user prompts and uses defaults.

Usage: `/pm-review [mode] [flags]`

Examples:

- `/pm-review` - Full analysis (25 items)
- `/pm-review quick` - Quick wins (9 items)
- `/pm-review area:security` - Security focus only (5 items)
- `/pm-review area:ui` - UI focus only (5 items)
- `/pm-review banger` - Find ONE game-changing banger idea (1 item)
- `/pm-review --auto` - Full analysis in headless mode
- `/pm-review quick --auto` - Quick wins in headless mode

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

### Pre-Check: Version Enforcement (AUTO-UPDATE)

Run this version check **FIRST** before any other operation:

```bash
# === VERSION ENFORCEMENT (AUTO-UPDATE) ===
COMMAND_NAME="pm-review"
LOCAL_VERSION=$(grep -m1 "^version:" ".claude/commands/${COMMAND_NAME}.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
REMOTE=$(curl -fsSL --connect-timeout 3 "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/versions.json" 2>/dev/null)
REMOTE_VERSION=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".version // \"\"" 2>/dev/null)
REQUIRED_MIN=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".required_minimum // \"\"" 2>/dev/null)
BREAKING_REASON=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".breaking_reason // \"\"" 2>/dev/null)

# Check if below required minimum
VERSION_OUTDATED=false
if [ -n "$REQUIRED_MIN" ] && [ -n "$LOCAL_VERSION" ]; then
  if [ "$(printf '%s\n' "$REQUIRED_MIN" "$LOCAL_VERSION" | sort -V | head -n1)" = "$LOCAL_VERSION" ] && \
     [ "$LOCAL_VERSION" != "$REQUIRED_MIN" ]; then
    VERSION_OUTDATED=true
    echo "⚠️  Command outdated: v${LOCAL_VERSION} → v${REQUIRED_MIN} required"
    [ -n "$BREAKING_REASON" ] && echo "   Reason: $BREAKING_REASON"
    echo "   Auto-updating..."
  fi
fi
# === END VERSION ENFORCEMENT ===
```

**CRITICAL: If `VERSION_OUTDATED=true`, you MUST:**

1. **Immediately invoke `/mason-update`** using the Skill tool
2. **Wait for update to complete**
3. **Re-read this command file** (it will have new content)
4. **Continue execution** with the updated command

Do NOT ask the user - just auto-update and continue.

---

## Auto Mode Detection

**Check if `--auto` flag is present in the command arguments.**

```bash
# Parse arguments for --auto flag
AUTO_MODE=false
if echo "$*" | grep -q '\-\-auto'; then
  AUTO_MODE=true
  echo "Running in AUTO mode (headless/non-interactive)"
fi
```

**When AUTO_MODE is true:**

- Skip ALL user prompts (AskUserQuestion calls)
- Use sensible defaults for all decisions
- If domain knowledge file doesn't exist, create it with defaults
- Continue execution without waiting for user input

---

## ⚠️ MANDATORY PRE-CHECK: READ THIS FIRST ⚠️

**BEFORE DOING ANYTHING ELSE, you MUST check for VALID initialization.**

**Step A: Get current repository name:**

```bash
CURRENT_REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" || basename "$(pwd)")
```

**Step B: Read the domain knowledge file:**

```bash
cat .claude/skills/pm-domain-knowledge/SKILL.md 2>/dev/null | head -20
```

**Step C: Validate the domain knowledge is for THIS repository:**

Check BOTH conditions:

1. First line is `<!-- INITIALIZED: true -->`
2. The file mentions the CURRENT repository name (not a different project)

If the SKILL.md mentions a DIFFERENT project name (e.g., "Mason" when you're in "my-app"), it's from a symlinked .claude directory and must be regenerated for THIS repo.

**Decision:**

- If INITIALIZED marker exists AND project name matches → **SKIP DIRECTLY TO STEP 1**
- If file is missing, not initialized, OR project name MISMATCHES → Continue to Step 0 (regenerate)
- **If AUTO_MODE is true AND needs regeneration** → Create defaults and skip to Step 1

**THIS IS A HARD STOP.** If domain knowledge is valid for THIS repo, you MUST NOT:

- Ask the 3 priority questions
- Ask about user types
- Ask about off-limits areas
- Use the AskUserQuestion tool for domain knowledge

**Instead, jump directly to "### Step 1: Load Domain Knowledge" below.**

---

### Step 0: Initialize Domain Knowledge (ONE-TIME ONLY)

**This step ONLY runs if the file is missing OR does not have `<!-- INITIALIZED: true -->` on line 1.**

**If you already confirmed `<!-- INITIALIZED: true -->` exists, SKIP THIS ENTIRE SECTION and go to Step 1.**

**If AND ONLY IF initialization is needed (first run only):**

#### AUTO MODE: Create Defaults and Skip Questions

**If AUTO_MODE is true and domain knowledge doesn't exist:**

```bash
# Create domain knowledge directory
mkdir -p .claude/skills/pm-domain-knowledge

# Auto-detect project info
PROJECT_NAME=$(jq -r '.name // "Unknown Project"' package.json 2>/dev/null || echo "Unknown Project")
PROJECT_DESC=$(jq -r '.description // "No description"' package.json 2>/dev/null || echo "No description")
```

Create the domain knowledge file with sensible defaults:

```markdown
<!-- INITIALIZED: true -->
<!-- Auto-generated by /pm-review --auto. Edit to customize. -->

# PM Domain Knowledge

## Project Overview

- **Name**: ${PROJECT_NAME}
- **Description**: ${PROJECT_DESC}

## Domain Priorities (Auto-Generated Defaults)

| Domain       | Priority |
| ------------ | -------- |
| frontend-ux  | High     |
| api-backend  | High     |
| reliability  | Medium   |
| security     | Medium   |
| code-quality | Medium   |

## User Personas (Default)

Mixed audience - both technical and non-technical users with varying skill sets.

## Off-Limits Areas

None specified - full codebase analysis enabled.
```

**Then SKIP to Step 1. Do NOT ask questions in auto mode.**

---

#### A. Ask 3 Quick Questions (SKIP IN AUTO MODE)

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

1. **CRITICAL: First line MUST be exactly:** `<!-- INITIALIZED: true -->`
2. Auto-generated header comment: `<!-- Auto-generated by /pm-review. Edit to customize. -->`
3. Project overview from auto-detection
4. User personas from user answer
5. Domain priorities from user answer
6. Off-limits areas from user answer
7. Sensible defaults for other sections

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

### Step 2: Launch Agent Swarm (MODE-BASED EXECUTION)

**The swarm launch depends on the mode:**

| Mode               | Agents to Launch    | Items per Agent | Banger  | Total |
| ------------------ | ------------------- | --------------- | ------- | ----- |
| **Full** (default) | All 8 in parallel   | 3               | Yes     | 25    |
| **Quick**          | All 8 in parallel   | 1               | Yes     | 9     |
| **Focus (area:X)** | Single agent only   | 5               | No      | 5     |
| **Banger**         | Deep dive (special) | N/A             | Yes (1) | 1     |

---

#### Mode A: Full Review (8 agents × 3 items + 1 banger = 25 total)

**Launch all 8 category agents IN PARALLEL using a single message with 8 Task tool calls.**

```
Use the Task tool 8 times in a SINGLE message with these agents:

1. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-feature-agent.md, ITEM_LIMIT=3
2. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-ui-agent.md, ITEM_LIMIT=3
3. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-ux-agent.md, ITEM_LIMIT=3
4. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-api-agent.md, ITEM_LIMIT=3
5. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-data-agent.md, ITEM_LIMIT=3
6. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-security-agent.md, ITEM_LIMIT=3
7. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-performance-agent.md, ITEM_LIMIT=3
8. Task tool: subagent_type="general-purpose", prompt includes .claude/agents/pm-code-quality-agent.md, ITEM_LIMIT=3
```

**Feature agent ALSO generates the 1 banger idea (separate from the 3 regular items).**

---

#### Mode B: Quick Review (8 agents × 1 item + 1 banger = 9 total)

**Launch all 8 category agents IN PARALLEL with ITEM_LIMIT=1:**

```
Use the Task tool 8 times in a SINGLE message with these agents:

1-8. Same as Full mode, but each prompt includes ITEM_LIMIT=1
```

**Feature agent ALSO generates the 1 banger idea (separate from the 1 regular item).**

---

#### Mode C: Focus Area (1 agent × 5 items, NO banger)

**Launch ONLY the specified agent with ITEM_LIMIT=5.**

Map the area command to the correct agent:

| Area Command        | Agent File                                |
| ------------------- | ----------------------------------------- |
| `area:feature`      | `.claude/agents/pm-feature-agent.md`      |
| `area:ui`           | `.claude/agents/pm-ui-agent.md`           |
| `area:ux`           | `.claude/agents/pm-ux-agent.md`           |
| `area:api`          | `.claude/agents/pm-api-agent.md`          |
| `area:data`         | `.claude/agents/pm-data-agent.md`         |
| `area:security`     | `.claude/agents/pm-security-agent.md`     |
| `area:performance`  | `.claude/agents/pm-performance-agent.md`  |
| `area:code-quality` | `.claude/agents/pm-code-quality-agent.md` |

```
Use the Task tool ONCE with:
  subagent_type="general-purpose"
  prompt includes .claude/agents/pm-{category}-agent.md
  ITEM_LIMIT=5
  INCLUDE_BANGER=false
```

**IMPORTANT: Focus mode does NOT include a banger idea.**

---

#### Mode D: Banger Mode (Deep dive → 1 game-changing idea)

**Banger mode is a special deep-dive mode that finds ONE transformative feature idea.**

This mode is for when you want ONLY a banger - no regular improvements, no incremental fixes. Just the biggest, boldest idea that would blow users away.

**Process:**

1. **Deep Codebase Understanding** (3 parallel subagents):

```
Use Task tool 3 times in parallel with:
  1. subagent_type="Explore" - Analyze architecture, understand system design, identify core value proposition
  2. subagent_type="Explore" - Study user flows, understand who uses this app and what they care about
  3. subagent_type="Explore" - Review existing features, find gaps and opportunities
```

2. **Generate 10 Big Ideas** (1 subagent):

```
Use Task tool with:
  subagent_type="feature-ideation"
  prompt: |
    Based on the codebase analysis, generate 10 BIG IDEAS for this application.

    These are NOT:
    - Bug fixes
    - Performance improvements
    - UI tweaks
    - Security hardening
    - Code quality improvements

    These ARE:
    - Game-changing new features
    - "Holy shit, I didn't even think of that" innovations
    - Features that would make users tell their friends
    - Capabilities that would justify a premium tier
    - Ideas the builder may not have even considered

    Each idea MUST have:
    - WOW factor - Users would absolutely notice this
    - Real value - Solves a problem or creates new capability
    - Innovation - Not just "add a button" but truly transformative
    - Feasibility - Can be built with the existing stack (multi-week scope is fine)

    Return the 10 ideas as JSON array with:
    - title: Catchy, descriptive name
    - vision: 2-3 sentence description of what this enables
    - wow_factor: Why this would blow users away
    - user_value: What problem it solves or capability it creates
    - complexity_estimate: "weeks" or "months"
```

3. **Select THE Banger** (1 subagent):

```
Use Task tool with:
  subagent_type="general-purpose"
  prompt: |
    You have 10 big ideas. Pick THE ONE that is:
    - The BEST idea out of the 10
    - The BRIGHTEST - most innovative and creative
    - The BIGGEST impact - would transform the app
    - Technically feasible within the existing architecture

    This is THE BANGER. Only one gets delivered.

    Return your selection with full justification.
```

4. **Validate & Generate Full PRD** (follow standard Step 6 process for the selected banger)

**Output:** Exactly 1 item with `is_banger_idea: true`, `is_new_feature: true`

---

#### Agent Prompt Template (All Modes)

**Each agent prompt should include:**

1. Read the agent definition file: `.claude/agents/pm-{category}-agent.md`
2. The repository_id and supabase credentials (for dedup checks)
3. **ITEM_TARGET** - Target number of VALIDATED items to return (not a max - this is a TARGET)
4. **INCLUDE_BANGER** - Whether to generate a banger idea (true for Feature agent in full/quick, false otherwise)
5. Any focus context from the user

**Example agent invocation:**

```
subagent_type: "general-purpose"
prompt: |
  You are the **{CATEGORY} Agent** for PM review. Read your full instructions from:
  .claude/agents/pm-{category}-agent.md

  Context:
  - Repository ID: ${REPOSITORY_ID}
  - Supabase URL: ${supabaseUrl}
  - Focus (if any): ${focus_context}

  ## Domain Knowledge (from Step 1)
  Use this context to prioritize and tailor your suggestions:
  - **User Priorities**: ${DOMAIN_PRIORITIES}  # What matters most to the user (from SKILL.md)
  - **Off-Limits Areas**: ${OFF_LIMITS}  # Areas to SKIP (from SKILL.md)
  - **User Persona**: ${USER_PERSONA}  # Who uses this app (from SKILL.md)

  Apply domain knowledge when generating suggestions:
  - Prioritize issues in high-priority domains
  - Skip suggestions in off-limits areas entirely
  - Frame benefits to match the user persona

  **TARGET (MUST DELIVER EXACTLY THIS MANY VALIDATED ITEMS):**
  - ITEM_TARGET: ${ITEM_LIMIT}  # You MUST return exactly this many VALIDATED items
  - INCLUDE_BANGER: ${INCLUDE_BANGER}  # true = also generate 1 banger idea (Feature agent only)

  ## CRITICAL: Iterative Validation Loop

  You MUST deliver exactly ${ITEM_LIMIT} fully validated recommendations. If some don't pass validation,
  you MUST generate more and iterate until you have the target number.

  **Validation Loop Process:**

```

validated_items = []
filtered_items = []
max_iterations = 5 # Safety limit

while len(validated_items) < ${ITEM_LIMIT} and iteration < max_iterations: # 1. Generate candidates (aim for 2x target to allow for filtering)
candidates = generate_improvement_candidates(target = ${ITEM_LIMIT} \* 2)

    # 2. Validate each candidate
    for candidate in candidates:
      validation_result = validate_candidate(candidate)

      if validation_result.passed:
        validated_items.append(candidate)
        if len(validated_items) >= ${ITEM_LIMIT}:
          break  # Target reached
      else:
        filtered_items.append({
          ...candidate,
          filter_reason: validation_result.reason,
          filter_tier: validation_result.tier
        })

    iteration++

# 3. Return exactly ${ITEM_LIMIT} validated items (or fewer if codebase exhausted)

```

**Validation Criteria (items MUST pass ALL):**
1. Problem actually exists in codebase (verified with grep/read)
2. Not a duplicate of existing backlog item (checked against DB)
3. Solution references specific files that exist
4. Not a false positive (test files, placeholders, intentional design)
5. Has all 5 benefits with specific descriptions

**If validation fails:** Log to filtered_items with reason, then generate NEW candidates to backfill.
**Do NOT return items that failed validation.** Only return fully validated items.

Your job:
1. Explore the codebase for issues in YOUR domain only
2. Generate candidate recommendations (overshoot to allow for filtering)
3. Validate EACH recommendation (verify problem exists, not a false positive)
4. If any fail validation, generate MORE candidates and repeat
5. Continue until you have EXACTLY ${ITEM_LIMIT} validated items
6. Check for duplicates against existing backlog items of type "{category}"
7. Return JSON with your findings

Return format:
{
  "category": "{category}",
  "recommendations": [
    // EXACTLY ${ITEM_LIMIT} VALIDATED items here (no more, no less)
    {
      "title": "...",
      "problem": "...",
      "solution": "...",
      "type": "{category}",
      "area": "frontend|backend",
      "impact_score": 1-10,
      "effort_score": 1-10,
      "complexity": 1-5,
      "is_new_feature": true|false,
      "is_banger_idea": false,
      "benefits": [...5 required...],
      "evidence": {
        "validation_passed": true,
        "problem_verified": true,
        "files_checked": [...],
        "confidence_score": 0.85
      }
    }
  ],
  "filtered_items": [
    // Items that didn't pass validation (for transparency)
    {
      "title": "...",
      "filter_reason": "Duplicate of existing backlog item #123",
      "filter_tier": "tier2-dedup"
    }
  ],
  "validation_summary": {
    "candidates_generated": 8,
    "candidates_validated": 3,
    "candidates_filtered": 5,
    "iterations_required": 2,
    "target_met": true
  }
}
```

**IMPORTANT (Feature Agent Only in Full/Quick Mode):**

When INCLUDE_BANGER=true, the Feature agent MUST generate:

- ${ITEM_LIMIT} regular feature ideas with `is_new_feature: true`, `is_banger_idea: false`
- PLUS exactly 1 "Banger Idea" with `is_new_feature: true`, `is_banger_idea: true`
- The banger idea is SEPARATE from the ${ITEM_LIMIT} count

All other agents set both `is_new_feature` and `is_banger_idea` to `false`.

### Step 2.5: Aggregate Agent Results

**Wait for all 8 agents to complete, then aggregate their results.**

The swarm execution will return results from each agent. Combine them:

```bash
# Collect results from all 8 agents
ALL_RECOMMENDATIONS = []
ALL_DUPLICATES_FILTERED = []

for agent_result in [feature, ui, ux, api, data, security, performance, code_quality]:
  ALL_RECOMMENDATIONS.extend(agent_result.recommendations)
  ALL_DUPLICATES_FILTERED.extend(agent_result.duplicates_filtered)
```

**Verify Feature Agent Output:**

The Feature agent MUST have produced:

- At least 3-5 items with `is_new_feature: true`
- Exactly 1 item with `is_banger_idea: true`

If not, the Pre-Submission Validation will BLOCK you later.

**Cross-Agent Deduplication:**

After aggregation, check for duplicates ACROSS categories:

```bash
# For each recommendation, check against others in the aggregate
for rec in ALL_RECOMMENDATIONS:
  for other in ALL_RECOMMENDATIONS:
    if rec.id != other.id:
      similarity = calculate_title_similarity(rec.title, other.title)
      if similarity >= 70%:
        # Keep the one with higher priority score, filter the other
        if rec.priority_score <= other.priority_score:
          filter_as_cross_category_duplicate(rec)
```

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

Each agent assigns the correct category based on their domain. The categories are:

**Category** (matches UI badge colors):

| Category       | Badge Color   | When to Use                                          |
| -------------- | ------------- | ---------------------------------------------------- |
| `feature`      | Purple + Star | Net-new functionality, user capabilities             |
| `ui`           | Gold          | Visual changes, components, styling, layout          |
| `ux`           | Cyan          | User flows, journey optimization, friction reduction |
| `api`          | Green         | Endpoints, backend services, API contracts           |
| `data`         | Blue          | Database schema, queries, data modeling              |
| `security`     | Red           | Vulnerabilities, hardening, input validation         |
| `performance`  | Orange        | Speed, optimization, caching, load times             |
| `code-quality` | Gray          | Refactors, cleanup, tech debt, documentation         |

**Area** (kept for backwards compatibility):

- `frontend` - Frontend code changes
- `backend` - Backend code changes

**NOTE:** Legacy type values (`dashboard`, `discovery`, `auth`, `backend`) are still accepted for backwards compatibility. The dashboard will map them to new categories:

- `dashboard` → `ui`
- `discovery` → `code-quality`
- `auth` → `security`
- `backend` → `api`

### Step 5: Generate Benefits (MANDATORY - NO EXCEPTIONS)

## ⚠️ HARD REQUIREMENT: EVERY ITEM MUST HAVE ALL 5 BENEFITS ⚠️

**For EVERY improvement, you MUST populate ALL 5 benefit categories.** This is NOT optional.

Items without complete benefits will be **BLOCKED** at the Pre-Submission Validation step.

**WHY BENEFITS ARE MANDATORY:**

- Users need to understand WHY they should approve an item
- Benefits explain the value to different stakeholders
- Without benefits, items appear as just "problems" with no clear ROI
- The dashboard displays benefits prominently - empty benefits = poor UX

**EACH benefit description MUST be:**

1. **Specific to this improvement** - not generic placeholder text
2. **Actionable/measurable** - describes a concrete outcome
3. **Role-appropriate** - speaks to that stakeholder's concerns

**BANNED DESCRIPTIONS (these will fail validation):**

- "Specific benefit for end users..." (template text)
- "No impact" or "N/A" (lazy - find a real benefit)
- Generic single-word answers
- Copy-pasted identical descriptions across items

**REQUIRED: All 5 categories with meaningful descriptions:**

```json
{
  "benefits": [
    {
      "category": "user_experience",
      "icon": "user",
      "title": "USER EXPERIENCE",
      "description": "[SPECIFIC: How end users benefit from this change - e.g., 'Reduces page load time from 3s to 1s, improving perceived responsiveness']"
    },
    {
      "category": "sales_team",
      "icon": "users",
      "title": "SALES TEAM",
      "description": "[SPECIFIC: How sales/business teams benefit - e.g., 'Enables demo of real-time features to prospects, improving close rates']"
    },
    {
      "category": "operations",
      "icon": "settings",
      "title": "OPERATIONS",
      "description": "[SPECIFIC: How ops/support teams benefit - e.g., 'Reduces support tickets about data staleness by providing clear timestamps']"
    },
    {
      "category": "performance",
      "icon": "chart",
      "title": "PERFORMANCE",
      "description": "[SPECIFIC: Technical performance impact - e.g., 'Eliminates N+1 query pattern, reducing API response time by 60%']"
    },
    {
      "category": "reliability",
      "icon": "wrench",
      "title": "RELIABILITY",
      "description": "[SPECIFIC: System reliability impact - e.g., 'Adds retry logic preventing silent failures during network instability']"
    }
  ]
}
```

**EVERY category must have a thoughtful, specific description.** Even for technical improvements, find the human impact for each role.

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

### Step 5.4: Deduplication Check & Banger Rotation (MANDATORY - HARD STOP)

## ⚠️ HARD REQUIREMENT: THIS CHECK CANNOT BE SKIPPED ⚠️

**Before generating any suggestions, you MUST query existing backlog items and filter duplicates.**

This is NOT optional. Submitting duplicate ideas wastes user time and pollutes the backlog.

**WHY DEDUPLICATION IS MANDATORY:**

- Users don't want to review the same idea twice
- Duplicate suggestions make the backlog harder to manage
- The agent should come up with FRESH suggestions each run
- Completed items don't need checking (if fixed, the problem won't show up)

---

#### Step A: Query Existing Backlog Items

**THIS QUERY MUST RUN BEFORE generating suggestions.**

```bash
# Query existing items with status NEW or APPROVED (not completed/rejected)
EXISTING_ITEMS=$(curl -s "${supabaseUrl}/rest/v1/mason_pm_backlog_items?select=id,title,problem,solution,status,type&or=(status.eq.new,status.eq.approved)&repository_id=eq.${REPOSITORY_ID}" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}")

EXISTING_COUNT=$(echo "$EXISTING_ITEMS" | jq 'length')
echo "Found $EXISTING_COUNT existing items to check for duplicates"
```

**IMPORTANT:** Only check against `new` and `approved` items. Completed items don't matter - if the problem was fixed, it won't show up as a problem anymore.

---

#### Step B: Similarity Detection Algorithm

For EACH candidate suggestion, compare against existing items:

**B.1: Extract Key Terms from Title**

Stop words to remove:

```
the, a, an, to, for, in, on, at, of, and, or, is, are, be, with, this, that,
add, update, fix, improve, implement, create, make, use, using, when, if
```

Example:

- Title: "Add loading states to dashboard cards"
- Key terms: ["loading", "states", "dashboard", "cards"]

**B.2: Extract Primary File from Solution**

```bash
# Find file paths in solution text
PRIMARY_FILE=$(echo "$SOLUTION" | grep -oE '(src|packages|lib|app)/[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx)' | head -1)
```

**B.3: Calculate Similarity Score**

```bash
# Extract key terms from candidate title
CANDIDATE_TERMS=$(extract_key_terms "$CANDIDATE_TITLE")

# For each existing item, calculate similarity
for EXISTING in $EXISTING_ITEMS; do
  EXISTING_TITLE=$(echo "$EXISTING" | jq -r '.title')
  EXISTING_TERMS=$(extract_key_terms "$EXISTING_TITLE")
  EXISTING_SOLUTION=$(echo "$EXISTING" | jq -r '.solution')
  EXISTING_TYPE=$(echo "$EXISTING" | jq -r '.type')

  # Calculate title word overlap
  MATCHING_WORDS=$(count_matching_words "$CANDIDATE_TERMS" "$EXISTING_TERMS")
  TOTAL_WORDS=$(count_words "$CANDIDATE_TERMS")
  TITLE_SIMILARITY=$((MATCHING_WORDS * 100 / TOTAL_WORDS))

  # Check if same primary file
  EXISTING_PRIMARY_FILE=$(echo "$EXISTING_SOLUTION" | grep -oE '(src|packages|lib|app)/[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx)' | head -1)
  SAME_FILE=false
  if [ "$PRIMARY_FILE" = "$EXISTING_PRIMARY_FILE" ] && [ -n "$PRIMARY_FILE" ]; then
    SAME_FILE=true
  fi

  # Check if same type/domain
  SAME_TYPE=false
  if [ "$CANDIDATE_TYPE" = "$EXISTING_TYPE" ]; then
    SAME_TYPE=true
  fi
done
```

---

#### Step C: Duplicate Thresholds (Fully Automated - No Manual Review)

| Condition                                    | Action                  | Confidence |
| -------------------------------------------- | ----------------------- | ---------- |
| title_similarity >= 70%                      | DUPLICATE - auto-filter | 0.90       |
| Same primary target file in solution         | DUPLICATE - auto-filter | 0.95       |
| title_similarity >= 50% AND same type/domain | DUPLICATE - auto-filter | 0.85       |

**All duplicates are automatically filtered. No manual review required.**

**Examples:**

| Candidate                          | Existing                               | Similarity      | Result    |
| ---------------------------------- | -------------------------------------- | --------------- | --------- |
| "Add loading states to dashboard"  | "Add loading indicators for KPI cards" | 60% + same type | DUPLICATE |
| "Fix error handling in API routes" | "Improve error handling in backend"    | 55% + same type | DUPLICATE |
| "Add real-time notifications"      | "Implement webhook notifications"      | 40%             | UNIQUE    |
| "Update KPICard.tsx loading state" | "Add skeleton loader to KPICard.tsx"   | Same file       | DUPLICATE |

---

#### Step D: Log Duplicates to Filtered Items

Duplicates MUST be logged to `mason_pm_filtered_items` for transparency:

```bash
if [ "$IS_DUPLICATE" = true ]; then
  curl -s -X POST "${supabaseUrl}/rest/v1/mason_pm_filtered_items" \
    -H "apikey: ${supabaseAnonKey}" \
    -H "Authorization: Bearer ${supabaseAnonKey}" \
    -H "Content-Type: application/json" \
    -d '{
      "repository_id": "'${REPOSITORY_ID}'",
      "user_id": "'${USER_ID}'",
      "title": "'${CANDIDATE_TITLE}'",
      "problem": "'${CANDIDATE_PROBLEM}'",
      "solution": "'${CANDIDATE_SOLUTION}'",
      "type": "'${CANDIDATE_TYPE}'",
      "area": "'${CANDIDATE_AREA}'",
      "filter_reason": "Duplicate of existing item: '"${EXISTING_TITLE}"' (similarity: '"${TITLE_SIMILARITY}"'%)",
      "filter_tier": "tier2-dedup",
      "filter_confidence": 0.90
    }'

  echo "Filtered duplicate: ${CANDIDATE_TITLE} (similar to: ${EXISTING_TITLE})"
fi
```

---

#### Step E: Cross-Run Deduplication

Also check for duplicates WITHIN the same analysis run:

```bash
# Before adding a suggestion to FINAL_SUGGESTIONS, check against others in this run
for OTHER in $FINAL_SUGGESTIONS; do
  OTHER_TITLE=$(echo "$OTHER" | jq -r '.title')
  OTHER_TERMS=$(extract_key_terms "$OTHER_TITLE")

  MATCHING=$(count_matching_words "$CANDIDATE_TERMS" "$OTHER_TERMS")
  SIMILARITY=$((MATCHING * 100 / TOTAL_WORDS))

  if [ "$SIMILARITY" -ge 70 ]; then
    # Keep the higher-priority one (higher impact, lower effort)
    CANDIDATE_PRIORITY=$(( CANDIDATE_IMPACT * 2 - CANDIDATE_EFFORT ))
    OTHER_PRIORITY=$(echo "$OTHER" | jq -r '(.impact_score * 2) - .effort_score')

    if [ "$CANDIDATE_PRIORITY" -le "$OTHER_PRIORITY" ]; then
      IS_DUPLICATE=true
      echo "Cross-run duplicate: ${CANDIDATE_TITLE} (duplicate of: ${OTHER_TITLE}, keeping higher priority)"
    fi
  fi
done
```

---

#### Step F: Display Deduplication Summary

```
## Deduplication Check Complete
- Candidates generated: 25
- Existing backlog items checked: 12
- Duplicates found: 4
  - "Add loading states" → similar to existing "Loading indicators for dashboard"
  - "Fix API error handling" → same file as existing "Error handling improvements"
  - "Update validation" → 72% title match with "Input validation for forms"
  - "Dashboard performance" → same type + 55% match with "Optimize dashboard queries"
- Unique suggestions: 21

Duplicates logged to Filtered tab in dashboard.
Proceeding with 21 unique suggestions...
```

---

#### Banger Rotation Logic

**IMPORTANT:** Only ONE active banger should exist in the Banger box at a time.

When submitting a new banger idea, first check if an active banger already exists:

```bash
# Check for existing active banger idea for this repo
EXISTING_BANGER=$(curl -s "${supabaseUrl}/rest/v1/mason_pm_backlog_items?select=id,title&is_banger_idea=eq.true&status=neq.rejected&status=neq.completed&repository_id=eq.${REPOSITORY_ID}" \
  -H "apikey: ${supabaseAnonKey}" \
  -H "Authorization: Bearer ${supabaseAnonKey}")

EXISTING_BANGER_ID=$(echo "$EXISTING_BANGER" | jq -r '.[0].id // empty')

# If exists, move to feature list with BANGER tag
if [ -n "$EXISTING_BANGER_ID" ]; then
  echo "Moving existing banger to feature list with BANGER tag..."
  curl -s -X PATCH "${supabaseUrl}/rest/v1/mason_pm_backlog_items?id=eq.${EXISTING_BANGER_ID}" \
    -H "apikey: ${supabaseAnonKey}" \
    -H "Authorization: Bearer ${supabaseAnonKey}" \
    -H "Content-Type: application/json" \
    -d '{"is_banger_idea": false, "tags": ["banger"]}'
  echo "Previous banger '$(echo "$EXISTING_BANGER" | jq -r '.[0].title')' moved to features with BANGER badge."
fi
```

**Result:** The old banger appears in the feature list with a highlighted "BANGER" badge, while the new banger is the ONLY item in the Banger box.

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
    "user_id": "'${USER_ID}'",
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

Continue to Step 5.6 with validated items only.

### Step 5.6: Prioritization & Cap by Mode (MANDATORY)

**Item limits are MODE-SPECIFIC. Do NOT exceed these limits:**

| Mode               | Max Items | Breakdown                        |
| ------------------ | --------- | -------------------------------- |
| **Full**           | **25**    | 24 (3 × 8 agents) + 1 banger     |
| **Quick**          | **9**     | 8 (1 × 8 agents) + 1 banger      |
| **Focus (area:X)** | **5**     | 5 (from single agent), no banger |

After validation, prioritize and cap the items based on the current mode:

#### Prioritization Logic

1. **Calculate priority_score** for each item: `(impact_score * 2) - effort_score`
2. **Sort all validated items** by priority_score (highest first)
3. **Reserve slots** for banger (Full/Quick modes only)
4. **Fill remaining slots** with top improvements by category

#### Mode-Specific Capping

**Full Mode (25 items):**

```bash
# Limits for Full mode
MAX_ITEMS=25
ITEMS_PER_AGENT=3
INCLUDE_BANGER=true

# Reserve: 1 banger + 24 regular (3 per agent)
FINAL_ITEMS=[]
FINAL_ITEMS.push(BANGER_ITEM)  # 1 banger
# Each agent contributes up to 3 items (24 total regular)
```

**Quick Mode (9 items):**

```bash
# Limits for Quick mode
MAX_ITEMS=9
ITEMS_PER_AGENT=1
INCLUDE_BANGER=true

# Reserve: 1 banger + 8 regular (1 per agent)
FINAL_ITEMS=[]
FINAL_ITEMS.push(BANGER_ITEM)  # 1 banger
# Each agent contributes 1 item (8 total regular)
```

**Focus Mode (5 items):**

```bash
# Limits for Focus mode
MAX_ITEMS=5
ITEMS_PER_AGENT=5
INCLUDE_BANGER=false

# Single agent contributes 5 items, no banger
FINAL_ITEMS=[]
# Only items from the focused agent (5 total)
```

#### Display Cap Summary

```
## Prioritization Complete (${MODE} mode)
- Mode: ${MODE}
- Max allowed: ${MAX_ITEMS}
- Items collected: ${TOTAL_ITEMS}
- Banger included: ${INCLUDE_BANGER}

### Final ${MAX_ITEMS} Items Breakdown:
${MODE === 'full' ? '- Banger Idea: 1' : ''}
${MODE === 'quick' ? '- Banger Idea: 1' : ''}
- Regular Improvements: ${REGULAR_COUNT}

${DROPPED_COUNT > 0 ? 'Dropped items can be rediscovered in future runs.' : 'All items included.'}
```

**IMPORTANT:** Items dropped due to the cap are NOT logged as filtered. They are simply not included in this run. Future `/pm-review` runs may rediscover and prioritize them.

Continue to Pre-Submission Validation with the mode-specific items.

### Pre-Submission Validation (ENFORCED)

**THIS IS A HARD STOP. Execute the following validation before proceeding:**

Before submitting items, validate ALL requirements based on the current MODE:

```bash
# Determine mode-specific limits
case "$MODE" in
  "full")
    MAX_ITEMS=25
    REQUIRE_BANGER=true
    ;;
  "quick")
    MAX_ITEMS=9
    REQUIRE_BANGER=true
    ;;
  "focus"|area:*)
    MAX_ITEMS=5
    REQUIRE_BANGER=false
    ;;
  "banger")
    MAX_ITEMS=1
    REQUIRE_BANGER=true
    ;;
esac

# Count items
BANGER_COUNT=<count items where is_banger_idea=true>
TOTAL_ITEMS=<count all items>

# Count items with complete benefits (exactly 5 benefit objects with non-empty descriptions)
ITEMS_WITH_COMPLETE_BENEFITS=<count items where benefits array has exactly 5 objects AND all descriptions are non-empty and not template text>
ITEMS_MISSING_BENEFITS=$((TOTAL_ITEMS - ITEMS_WITH_COMPLETE_BENEFITS))

echo "Pre-Submission Validation (${MODE} mode):"
echo "  Total items: $TOTAL_ITEMS (max: $MAX_ITEMS)"
echo "  Banger idea (is_banger_idea=true): $BANGER_COUNT (required: ${REQUIRE_BANGER ? '1' : 'none'})"
echo "  Items with complete benefits (5 categories): $ITEMS_WITH_COMPLETE_BENEFITS / $TOTAL_ITEMS"

# BLOCKING CHECK 0: Maximum items cap (MODE-SPECIFIC)
if [ "$TOTAL_ITEMS" -gt "$MAX_ITEMS" ]; then
  echo "BLOCKED: Too many items ($TOTAL_ITEMS). Maximum for ${MODE} mode is $MAX_ITEMS."
  echo "Go back to Step 5.6 (Prioritization & Cap) and reduce items."
  # DO NOT PROCEED - cap items first
fi

# BLOCKING CHECK 1: Banger idea (Full/Quick modes ONLY)
if [ "$REQUIRE_BANGER" = true ]; then
  if [ "$BANGER_COUNT" -ne 1 ]; then
    echo "BLOCKED: Missing or multiple banger ideas."
    echo "Full/Quick modes MUST have exactly 1 banger idea."
    # DO NOT PROCEED - fix banger first
  fi
else
  # Focus mode - should have NO banger
  if [ "$BANGER_COUNT" -gt 0 ]; then
    echo "WARNING: Focus mode should not include a banger idea. Removing banger flag."
    # Remove is_banger_idea=true from any items
  fi
fi

# BLOCKING CHECK 2: Benefits (MANDATORY for all modes)
if [ "$ITEMS_MISSING_BENEFITS" -gt 0 ]; then
  echo "BLOCKED: $ITEMS_MISSING_BENEFITS items are missing complete benefits."
  echo "EVERY item MUST have exactly 5 benefits with specific descriptions."
  echo "Go back and add benefits for ALL items before proceeding."
  echo ""
  echo "Required benefit categories (ALL 5 REQUIRED):"
  echo "  1. user_experience - How end users benefit"
  echo "  2. sales_team - How sales/business benefits"
  echo "  3. operations - How ops/support benefits"
  echo "  4. performance - Technical performance impact"
  echo "  5. reliability - System reliability impact"
  echo ""
  echo "Each description must be SPECIFIC to the improvement, NOT template text."
  # DO NOT PROCEED - fix benefits first
fi

echo "PASSED: All validations passed for ${MODE} mode. Proceeding to submission."
```

**If ANY check fails, you MUST fix the issue before proceeding. DO NOT skip this.**

**Mode-Specific Required Counts:**

| Mode  | Max Items | Banger Required | Regular Items               |
| ----- | --------- | --------------- | --------------------------- |
| Full  | **25**    | **Yes (1)**     | 24 (3 per agent × 8 agents) |
| Quick | **9**     | **Yes (1)**     | 8 (1 per agent × 8 agents)  |
| Focus | **5**     | **No**          | 5 (from single agent)       |

**Benefits requirement (ALL items in ALL modes):**

| Field    | Requirement                                               |
| -------- | --------------------------------------------------------- |
| benefits | Array of **exactly 5** benefit objects                    |
| Each     | Must have category, icon, title, AND specific description |
| Quality  | Descriptions must be improvement-specific, not templates  |

### Step 6: Generate PRDs, Risk Analysis & Evidence (MANDATORY - BEFORE Submission)

## ⚠️ HARD STOP: NO SUBMISSION WITHOUT PRDS ⚠️

**This step MUST be completed BEFORE any items are submitted to the database.**

Items without PRDs are INCOMPLETE and BLOCKED from submission. The execution order is:

1. Steps 1-5.6: Discovery, validation, scoring, benefits
2. **Step 6: Generate PRDs, risk analysis, evidence** ← YOU ARE HERE
3. Step 7: Submit to Supabase (ONLY items with complete PRDs)

---

#### Step 6a: Generate PRD for EACH Validated Item

**BLOCKING REQUIREMENT: You MUST generate a PRD for EVERY validated item.**

This is NOT optional. For each of your validated items, generate a complete PRD:

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

**PRD Quality Guidelines:**

1. **Problem Statement**: Expand on `item.problem` with user impact and business context
2. **Proposed Solution**: Expand on `item.solution` with specific implementation approach
3. **Success Criteria**: 3-5 measurable criteria that indicate the problem is solved
4. **Technical Approach**: Use wave-based parallel execution (per parallel-task-execution.md rules)
5. **Risks**: Scale complexity based on item's `complexity` score (1-5)
6. **Out of Scope**: Prevent scope creep by explicitly listing what won't be addressed

**Store the PRD content with each item:**

```javascript
// For each validated item, add PRD fields
item.prd_content = generatedPrdMarkdown;
item.prd_generated_at = new Date().toISOString();
```

---

#### Step 6b: Risk Analysis (For Each Item)

**After PRD generation, analyze risk for EVERY validated item.**

For each item, invoke the risk-analyzer agent:

```
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    Analyze risk for this improvement following .claude/agents/risk-analyzer.md:

    Title: ${item.title}
    Solution: ${item.solution}

    1. Extract target files from solution text
    2. Build import graph (upstream/downstream dependencies)
    3. Check test coverage for each file
    4. Detect breaking changes
    5. Calculate 5 weighted scores → overall risk score

    Return JSON:
    {
      "overall_risk_score": <1-10>,
      "files_affected_count": <number>,
      "has_breaking_changes": <boolean>,
      "test_coverage_gaps": <number>
    }
```

**Store risk data with each item:**

```javascript
item.risk_score = riskResult.overall_risk_score;
item.risk_analyzed_at = new Date().toISOString();
item.files_affected_count = riskResult.files_affected_count;
item.has_breaking_changes = riskResult.has_breaking_changes;
item.test_coverage_gaps = riskResult.test_coverage_gaps;
```

---

#### Step 6c: Evidence Validation (For Each Item)

**Validate PRD claims against actual codebase evidence.**

For each item with a generated PRD:

**Tiered Evidence Search:**

| Tier                      | Scope                 | When to Use                        |
| ------------------------- | --------------------- | ---------------------------------- |
| **Tier A (Quick grep)**   | Fast pattern matching | All items                          |
| **Tier B (Deep Explore)** | Subagent exploration  | High-impact OR Tier A inconclusive |

**Assign Evidence Status:**

| Status         | Meaning                              | Action                                      |
| -------------- | ------------------------------------ | ------------------------------------------- |
| `verified`     | Evidence confirms problem exists     | Keep item, submit normally                  |
| `refuted`      | Evidence shows problem doesn't exist | **REMOVE item, do NOT submit**              |
| `inconclusive` | Cannot determine definitively        | Flag with `evidence_status: 'inconclusive'` |

**Store evidence data with each item:**

```javascript
item.evidence_status = 'verified'; // or 'refuted' or 'inconclusive'
item.evidence_summary = 'Confirmed: No existing implementation found...';
item.evidence_checked_at = new Date().toISOString();
```

**Filter REFUTED Items:**

```javascript
// Remove refuted items BEFORE submission
validatedItems = validatedItems.filter(
  (item) => item.evidence_status !== 'refuted',
);
```

---

#### Step 6d: Pre-Submission Validation Gate

**BLOCKING CHECK: Verify ALL items have complete data before proceeding to submission.**

```bash
ITEMS_WITHOUT_PRD=0
ITEMS_WITHOUT_BENEFITS=0

for item in VALIDATED_ITEMS; do
  if [ -z "${item.prd_content}" ]; then
    ITEMS_WITHOUT_PRD=$((ITEMS_WITHOUT_PRD + 1))
    echo "BLOCKED: Item '${item.title}' missing PRD"
  fi

  BENEFIT_COUNT=$(echo "${item.benefits}" | jq 'length')
  if [ "$BENEFIT_COUNT" -ne 5 ]; then
    ITEMS_WITHOUT_BENEFITS=$((ITEMS_WITHOUT_BENEFITS + 1))
    echo "BLOCKED: Item '${item.title}' has ${BENEFIT_COUNT} benefits (need 5)"
  fi
done

if [ "$ITEMS_WITHOUT_PRD" -gt 0 ] || [ "$ITEMS_WITHOUT_BENEFITS" -gt 0 ]; then
  echo "HARD STOP: Cannot proceed to submission"
  echo "  - Items missing PRD: $ITEMS_WITHOUT_PRD"
  echo "  - Items missing benefits: $ITEMS_WITHOUT_BENEFITS"
  echo "Go back and complete ALL items before submission."
  # DO NOT PROCEED TO STEP 7
fi

echo "All items validated. Proceeding to submission..."
```

---

### Step 7: Submit Results to User's Supabase

**This step ONLY executes after Step 6 completes successfully with ALL items having PRDs.**

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

#### Step 7a: Validate API Key and Get Repositories (Central Server)

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

#### Step 7b: Match Current Repository

Get the current git remote and match it to find the repository_id:

```bash
# Get the current git remote URL
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

# Extract owner/repo from git remote URL (handles both HTTPS and SSH)
# Examples:
#   https://github.com/owner/repo.git -> owner/repo
#   git@github.com:owner/repo.git -> owner/repo
# Note: Strip .git suffix first, then extract - the previous regex didn't handle .git correctly
REPO_FULL_NAME=$(echo "$GIT_REMOTE" | sed -E 's/\.git$//' | sed -E 's|.*github\.com[:/]||')

# Find matching repository_id from the validation response
REPOSITORY_ID=$(echo "$REPOSITORIES" | jq -r --arg name "$REPO_FULL_NAME" '.[] | select(.github_full_name == $name) | .id // empty')

if [ -z "$REPOSITORY_ID" ]; then
  echo "Warning: Repository '$REPO_FULL_NAME' not connected in Mason dashboard."
  echo "Items will be created without repository association."
  echo "To enable multi-repo filtering, connect this repository at: ${DASHBOARD_URL}/settings/github"
fi
```

#### Step 7c: Write Data Directly to User's Supabase

Write the improvements directly to the user's own Supabase using the REST API.

**CRITICAL: Every item MUST include prd_content. This is NON-NEGOTIABLE.**

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
    "items_validated": 15,
    "started_at": "'${TIMESTAMP}'",
    "completed_at": "'${TIMESTAMP}'",
    "status": "completed",
    "repository_id": '$([ -n "$REPOSITORY_ID" ] && echo "\"$REPOSITORY_ID\"" || echo "null")'
  }'

# Step 2: Insert backlog items WITH PRDs
# CRITICAL: EVERY item MUST include:
# - prd_content (MANDATORY - NO EXCEPTIONS)
# - prd_generated_at (MANDATORY)
# - is_new_feature and is_banger_idea fields
# - benefits array with EXACTLY 5 benefit objects
# - risk_score, evidence_status fields
#
# Feature flags:
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
      "user_id": "'${USER_ID}'",
      "title": "Add data freshness timestamps",
      "problem": "Executives cannot tell when data was updated...",
      "solution": "Add visible timestamps...",
      "type": "dashboard",
      "area": "frontend",
      "impact_score": 9,
      "effort_score": 2,
      "complexity": 2,
      "benefits": [
        {"category": "user_experience", "icon": "user", "title": "USER EXPERIENCE", "description": "Clear visibility into data freshness increases trust"},
        {"category": "sales_team", "icon": "users", "title": "SALES TEAM", "description": "Executives gain confidence in data currency"},
        {"category": "operations", "icon": "settings", "title": "OPERATIONS", "description": "Reduces support tickets about data staleness"},
        {"category": "performance", "icon": "chart", "title": "PERFORMANCE", "description": "Minimal performance impact"},
        {"category": "reliability", "icon": "wrench", "title": "RELIABILITY", "description": "Helps users identify when refresh needed"}
      ],
      "is_new_feature": false,
      "is_banger_idea": false,
      "status": "new",
      "prd_content": "# PRD: Add data freshness timestamps\n\n## Problem Statement\nExecutives cannot tell when snapshot data was last updated...\n\n## Proposed Solution\nAdd visible timestamps showing when each section was last refreshed...\n\n## Success Criteria\n- [ ] All KPI cards show last updated timestamp\n- [ ] Global data freshness indicator in header\n\n## Technical Approach\n### Wave 1: Foundation\n| # | Subagent | Task |\n|---|----------|------|\n| 1.1 | Explore | Find existing timestamp patterns |\n\n### Wave 2: Implementation\n| # | Subagent | Task |\n|---|----------|------|\n| 2.1 | general-purpose | Add timestamp display components |\n\n## Risks & Mitigations\n| Risk | Mitigation |\n|------|------------|\n| Timezone confusion | Use relative time (2 min ago) |\n\n## Out of Scope\n- Auto-refresh functionality",
      "prd_generated_at": "'${TIMESTAMP}'",
      "risk_score": 3,
      "risk_analyzed_at": "'${TIMESTAMP}'",
      "files_affected_count": 4,
      "has_breaking_changes": false,
      "test_coverage_gaps": 0,
      "evidence_status": "verified",
      "evidence_summary": "Confirmed no existing timestamps in KPI components",
      "evidence_checked_at": "'${TIMESTAMP}'"
    }
  ]'
```

**Privacy Guarantee:** The central server (Assure DeFi) NEVER sees your backlog items. Data goes directly from your CLI to YOUR Supabase.

After successful submission, show:

```
Analysis submitted successfully!
Items created: 15
PRDs generated: 15 (100%)
Data stored in: YOUR Supabase (not central server)
View in Dashboard: https://mason.assuredefi.com/admin/backlog
```

## Output Format

After analysis, provide a summary (format varies by mode):

```markdown
## PM Review Complete

**Mode**: [full/quick/area:X]
**Items Discovered**: [count]
**Items Validated**: [count] (after filtering false positives)
**Items Submitted**: [count] (max varies by mode)
**PRDs Generated**: [count] (MUST equal submitted items count)

### Mode-Specific Limits

| Mode  | Max Items | Banger | Actual Submitted |
| ----- | --------- | ------ | ---------------- |
| Full  | 25        | Yes    | [N]/25           |
| Quick | 9         | Yes    | [N]/9            |
| Focus | 5         | No     | [N]/5            |

### Item Summary (Full/Quick Mode)

| Category             | Count   | Requirement | Status      |
| -------------------- | ------- | ----------- | ----------- |
| Banger Idea          | 1       | = 1         | [PASS/FAIL] |
| Regular Improvements | [N]     | <= 24 or 8  | PASS        |
| **Total**            | **[N]** | **<= 25/9** | [PASS/FAIL] |

**Banger Idea**: [title of the ONE banger idea]
**Banger Rotation**: [Previous banger moved to features with BANGER badge / No previous banger]

### Item Summary (Focus Mode - area:X)

| Category             | Count   | Requirement | Status      |
| -------------------- | ------- | ----------- | ----------- |
| Regular Improvements | [N]     | <= 5        | PASS        |
| **Total**            | **[N]** | **<= 5**    | [PASS/FAIL] |

**Note:** Focus mode does not include a banger idea.

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

**MANDATORY: Git Tracking Verification for Security Suggestions**

**BEFORE flagging any "secrets exposed in repository" issue:**

1. Run `git ls-files <file>` - if empty, file is NOT tracked (false positive!)
2. Check `.gitignore` - if file matches a pattern, it's intentionally excluded
3. Only flag if file IS tracked AND contains real credentials (not placeholders)

```bash
# MANDATORY check before flagging security file issues
FILE_PATH="<file from suggestion>"

# Step 1: Check if file is tracked in git
if ! git ls-files --error-unmatch "$FILE_PATH" 2>/dev/null; then
  # File is NOT in git - DO NOT FLAG THIS
  echo "FALSE POSITIVE: $FILE_PATH is not tracked in git"
  exit 0
fi

# Step 2: Check gitignore patterns
if git check-ignore -q "$FILE_PATH" 2>/dev/null; then
  # File is excluded by gitignore - DO NOT FLAG THIS
  echo "FALSE POSITIVE: $FILE_PATH is excluded by .gitignore"
  exit 0
fi

# Only proceed if file IS tracked
```

**Common false positives to avoid:**

- `.env.local` - Almost always gitignored (check before flagging!)
- `.env.*.local` - Development-only files
- Files in `.gitignore` that exist locally

**Common False Positives to AVOID:**
| Pattern | Why It's NOT a Vulnerability |
|---------|------------------------------|
| `.env.example` with `your-xxx` values | Standard documentation pattern |
| `.env.example` in git | Expected - shows required variables |
| `NEXT_PUBLIC_*` env vars | Intentionally public, not secrets |
| API keys in test files with `test_` prefix | Test fixtures, not real credentials |
| Placeholder UUIDs like `00000000-0000-...` | Example values, not real IDs |
| `.env.local` exists in working tree | Usually gitignored - VERIFY first |

**Real Vulnerabilities to Flag:**

- Actual API keys/tokens committed (look for real patterns: `sk-`, `ghp_`, `eyJ`)
- `.env.local` or `.env` files **tracked in git** (verified with `git ls-files`) with real values
- Hardcoded credentials in source code (not config files)
- Missing `.gitignore` patterns for secret files

### General Verification

Before creating ANY improvement:

1. **Verify the problem exists** - Don't assume based on patterns alone
2. **Check existing mitigations** - The issue may already be handled
3. **Confirm it's actionable** - Vague concerns aren't improvements

## Important Notes

1. **MANDATORY: PRD for every item** - No item enters the database without a complete PRD. Period.
2. **Maximum 20 items per run** - Prioritize and cap to top 20 items (1 banger + 3 features + 16 improvements).
3. **Banger rotation** - When a new banger is generated, move the old banger to the feature list with "banger" tag.
4. **Be thorough but realistic** - Only suggest improvements that provide clear value
5. **Consider existing patterns** - Align suggestions with codebase conventions
6. **Prioritize ruthlessly** - Focus on high-impact, low-effort items first
7. **Be specific** - Vague suggestions are not actionable
8. **Include evidence** - Reference specific files/lines when possible
9. **All 5 benefits required** - Every improvement must have all 5 benefit categories populated
10. **Use new type values** - dashboard, discovery, auth, backend (not feature, fix, refactor)
11. **Use new area values** - frontend, backend (not frontend-ux, api-backend, etc.)
12. **Complexity is numeric** - Use 1-5 integer, not text
13. **Avoid false positives** - Verify issues are real before flagging (see False Positive Prevention above)
