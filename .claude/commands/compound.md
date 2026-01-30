---
name: compound
description: Extract and persist learnings from the current session to improve future work. Use at the end of significant sessions.
---

# Compound Learning Skill

Extracts and persists learnings from the current session to improve future work.

## Usage

Invoke with `/compound` at the end of any significant session.

## When to Use

- After 20+ minutes of work
- After multiple commits
- After complex problem-solving
- After encountering and resolving issues
- Before ending for the day

## Procedure

### Step 1: Review Session Context

Analyze what happened in this session:

- What tasks were completed?
- What problems were encountered?
- What solutions worked (or didn't)?
- What retries or corrections were needed?

### Step 2: Extract Learnings

Identify patterns worth persisting:

**User Patterns** (cross-repo, personal preferences):

- Communication preferences discovered
- Workflow preferences
- Tool/library preferences
- Review/commit style preferences

Location: `~/.claude/rules/user-patterns.md` (if exists)

**Repo Patterns** (codebase-specific):

- API gotchas or edge cases
- Naming conventions not documented elsewhere
- Architecture decisions and their rationale
- Testing patterns specific to this codebase
- Common mistakes to avoid in this codebase

Location: `.claude/rules/learned-patterns.md`

### Step 3: Persist Learnings

For each learning, add an entry using this format:

```markdown
## [Category]: [Brief Title]

**Discovered**: [YYYY-MM-DD]
**Context**: [What task triggered this learning]
**Pattern**: [What to do or avoid]
**Why**: [Explanation of why this matters]
```

### Step 4: Commit

If learnings were added:

```bash
git add .claude/rules/learned-patterns.md
git commit -m "chore: compound learnings from session

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 5: Report

Summarize what was learned:

- Number of patterns added/updated
- Categories affected
- Key insights from this session

## Quality Guidelines

- Don't add trivial or one-off learnings
- Don't duplicate existing patterns
- Keep patterns actionable and specific
- Include the "why" - context makes patterns useful
- Prefer updating existing patterns over creating similar new ones
- Patterns should help future sessions, not just document history

## Example Session End

```
User: I'm done for today
Claude: Let me compound the learnings from this session.

[Reviews session]
[Identifies 2 patterns worth persisting]
[Updates learned-patterns.md]
[Commits changes]

Added 2 patterns to learned-patterns.md:
1. API Gotcha: Supabase RLS requires explicit policy creation
2. Testing: Mock the auth context before testing protected routes

These will help future sessions avoid the same issues.
```
