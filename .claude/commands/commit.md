---
name: commit
description: Create a well-structured git commit with conventional format. Analyzes staged changes and generates appropriate commit message.
---

# Git Commit Command

Create a commit following team conventions.

## Process

### 1. Check Current State

```bash
# Check we're not on main/master
git branch --show-current

# Check for staged and unstaged changes
git status

# See what's staged
git diff --cached --stat
```

### 2. Analyze Changes

Review the staged changes to understand:

- What type of change is this? (feat, fix, refactor, docs, test, chore)
- What is the scope? (component, api, db, etc.)
- What is the actual behavior change?

```bash
# Detailed diff of staged changes
git diff --cached
```

### 3. Generate Commit Message

Follow this format:

```
<type>(<scope>): <short description>

<detailed description if needed>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring (no behavior change)
- `docs` - Documentation only
- `test` - Adding/updating tests
- `chore` - Maintenance tasks
- `style` - Formatting only

**Guidelines:**

- Short description: imperative mood, lowercase, no period
- Keep under 72 characters for the subject line
- Body explains "what" and "why", not "how"

### 4. Create Commit

If `$ARGUMENTS` is provided, use it as the commit message:

```bash
git commit -m "$ARGUMENTS

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Otherwise, generate based on the diff analysis.

### 5. Verify

```bash
# Show the created commit
git log -1 --stat
```

## Examples

**Feature:**

```
feat(dashboard): add user activity chart

Adds a new chart component showing user activity over time.
Uses recharts for visualization.

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Fix:**

```
fix(api): handle null user in session check

Previously the API would crash if session.user was null.
Now returns 401 with proper error message.

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Refactor:**

```
refactor(utils): simplify date formatting logic

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Safety Rules

- Never commit if on main/master branch (create a branch first)
- Never commit files that look like secrets (.env, credentials, keys)
- Always include Co-Authored-By for AI collaboration
- If nothing is staged, stage relevant changes first or ask user
