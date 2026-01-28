---
name: pr-review
description: Review a pull request for code quality, security, and adherence to team standards. Can review local changes or GitHub PRs.
---

# Pull Request Review Command

Comprehensive code review following team standards.

## Usage

- `/pr-review` - Review changes on current branch vs main
- `/pr-review 123` - Review GitHub PR #123
- `/pr-review branch-name` - Review specific branch vs main

## Process

### 1. Get Changes

```bash
# Determine base branch
BASE_BRANCH=$(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)

# For local branch comparison
git diff $BASE_BRANCH...HEAD --stat
git diff $BASE_BRANCH...HEAD
```

Or for GitHub PR:

```bash
gh pr view $ARGUMENTS --json files,additions,deletions,commits
gh pr diff $ARGUMENTS
```

### 2. Review Categories

Organize findings by priority:

**Critical (Must fix before merge)**

- Security vulnerabilities (SQL injection, XSS, exposed secrets)
- Breaking changes without migration
- Data loss risks
- Type safety violations (`any` types, unsafe assertions)

**Warning (Should fix)**

- Performance issues (N+1 queries, unnecessary re-renders)
- Missing error handling
- Convention violations
- Code duplication

**Suggestion (Nice to have)**

- Naming improvements
- Documentation gaps
- Minor optimizations
- Style consistency

### 3. Review Checklist

#### TypeScript Standards

- [ ] No `any` types (use `unknown` if type is truly unknown)
- [ ] Interfaces preferred over types (except for unions)
- [ ] Type assertions documented with comments
- [ ] Proper null/undefined handling

#### Naming Conventions

- [ ] PascalCase for components and types
- [ ] camelCase for functions and variables
- [ ] SCREAMING_SNAKE_CASE for constants
- [ ] Boolean variables prefixed: `is`, `has`, `should`, `can`

#### Error Handling

- [ ] try/catch around async operations
- [ ] Errors logged with context
- [ ] User-friendly error messages
- [ ] Proper HTTP status codes in API routes

#### Component Patterns

- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Props typed with interfaces

#### API Route Patterns

- [ ] Authentication checked first
- [ ] Input validation present
- [ ] Proper response format
- [ ] Error responses consistent

#### Security

- [ ] No secrets in code
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] Auth checks before data access

#### Performance

- [ ] No unnecessary re-renders
- [ ] Large lists virtualized or paginated
- [ ] Async operations properly handled

#### Brand Compliance (if UI changes)

- [ ] Only brand colors used
- [ ] No pill-shaped buttons
- [ ] No gradients
- [ ] No emojis in UI
- [ ] Dark-mode first

### 4. Output Format

```markdown
# Code Review: [Brief Description]

## Summary

[1-2 sentence overview of changes]

## Files Changed

- `path/to/file.ts` (+10/-5)
- `path/to/other.tsx` (+25/-0)

## Critical Issues

- **File**: path/to/file.ts:42
  - Issue: [Description]
  - Fix: [How to fix]

## Warnings

- **File**: path/to/file.ts:15
  - Issue: [Description]
  - Suggestion: [How to improve]

## Suggestions

- **File**: path/to/file.ts:8
  - [Improvement idea]

## Approved

- [List of things done well]

## Verdict

- [ ] Approved
- [ ] Approved with suggestions
- [ ] Changes requested
- [ ] Blocked (critical issues)
```

### 5. Post Review (GitHub PRs)

If reviewing a GitHub PR and changes are requested:

```bash
gh pr review $ARGUMENTS --request-changes --body "Review comments..."
```

If approved:

```bash
gh pr review $ARGUMENTS --approve --body "LGTM! [comments]"
```

## Common Issues to Watch For

### API Routes

```typescript
// Bad: No auth check
export async function GET() {
  return NextResponse.json(await getData());
}

// Good: Auth check first
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getData());
}
```

### Components

```typescript
// Bad: No loading state
const data = useSWR('/api/data');
return <List items={data} />;

// Good: Handle all states
if (error) return <Error />;
if (isLoading) return <Loading />;
if (!data?.length) return <Empty />;
return <List items={data} />;
```

### TypeScript

```typescript
// Bad: Using any
function process(data: any) { ... }

// Good: Proper typing
function process(data: ProcessInput): ProcessOutput { ... }
```
