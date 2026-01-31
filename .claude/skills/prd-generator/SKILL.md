## <!-- INITIALIZED: true -->

name: prd-generator
description: Standardized PRD generation skill for PM review agents. Generates consistent, wave-based PRDs with proper subagent assignments and quality criteria.

---

# PRD Generator Skill

This skill provides standardized PRD (Product Requirements Document) generation for all PM review items. Every improvement submitted to the backlog MUST have a complete PRD.

## PRD Structure

```markdown
# PRD: [Title]

## Problem Statement

[Expanded from item.problem with user impact and business context]

## Proposed Solution

[Expanded from item.solution with specific implementation approach]

## Success Criteria

- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]
- [ ] [Measurable criterion 3]

## Technical Approach

### Wave 1: Foundation (Explore)

| #   | Subagent | Task                    |
| --- | -------- | ----------------------- |
| 1.1 | Explore  | [Research task]         |
| 1.2 | Explore  | [Identify dependencies] |

### Wave 2: Implementation (general-purpose)

| #   | Subagent        | Task                  |
| --- | --------------- | --------------------- |
| 2.1 | general-purpose | [Core implementation] |
| 2.2 | general-purpose | [Tests]               |

### Wave 3: Validation (code-reviewer)

| #   | Subagent      | Task             |
| --- | ------------- | ---------------- |
| 3.1 | code-reviewer | [Review changes] |

## Risks & Mitigations

| Risk                       | Mitigation |
| -------------------------- | ---------- |
| [Risk based on complexity] | [Strategy] |

## Out of Scope

- [Explicit exclusions]
```

---

## Wave Structure Guidelines

### Wave 1: Foundation (Always Required)

**Purpose:** Understand the codebase before making changes

**Subagent:** `Explore`

**Tasks:**

- Research existing patterns and implementations
- Identify affected files and dependencies
- Check for related existing code
- Understand data flow

**Example tasks:**

```
1.1 | Explore | Find existing auth patterns in src/lib/auth/
1.2 | Explore | Identify all components using the affected API
1.3 | Explore | Check test coverage for affected files
```

### Wave 2: Implementation (Core Work)

**Purpose:** Make the actual changes

**Subagent:** `general-purpose`

**Tasks:**

- Implement core functionality
- Write tests
- Update documentation if needed

**Example tasks:**

```
2.1 | general-purpose | Implement auth check in route handler
2.2 | general-purpose | Add unit tests for new auth logic
2.3 | general-purpose | Update error messages for auth failures
```

### Wave 3: Validation (Quality Gate)

**Purpose:** Verify changes meet standards

**Subagent:** `code-reviewer`

**Tasks:**

- Review all changes for quality
- Check for security issues
- Verify test coverage
- Ensure consistency with patterns

**Example tasks:**

```
3.1 | code-reviewer | Review all changes against project standards
```

---

## Complexity-Based Wave Scaling

Scale the PRD complexity based on the item's `complexity` score (1-5):

| Complexity    | Waves | Tasks per Wave | Risk Section |
| ------------- | ----- | -------------- | ------------ |
| 1 (Trivial)   | 2     | 1-2            | Optional     |
| 2 (Low)       | 2     | 2-3            | 1 risk       |
| 3 (Medium)    | 3     | 2-3            | 2 risks      |
| 4 (High)      | 3     | 3-4            | 3 risks      |
| 5 (Very High) | 4     | 3-5            | 4+ risks     |

### Complexity 1-2: Simple Changes

```markdown
### Wave 1: Implementation (general-purpose)

| #   | Subagent        | Task         |
| --- | --------------- | ------------ |
| 1.1 | general-purpose | [Simple fix] |
| 1.2 | general-purpose | [Add test]   |

### Wave 2: Validation (code-reviewer)

| #   | Subagent      | Task         |
| --- | ------------- | ------------ |
| 2.1 | code-reviewer | Quick review |
```

### Complexity 3: Medium Changes

```markdown
### Wave 1: Foundation (Explore)

| #   | Subagent | Task                         |
| --- | -------- | ---------------------------- |
| 1.1 | Explore  | Research existing patterns   |
| 1.2 | Explore  | Identify affected components |

### Wave 2: Implementation (general-purpose)

| #   | Subagent        | Task                    |
| --- | --------------- | ----------------------- |
| 2.1 | general-purpose | Implement core change   |
| 2.2 | general-purpose | Write tests             |
| 2.3 | general-purpose | Update affected callers |

### Wave 3: Validation (code-reviewer)

| #   | Subagent      | Task                       |
| --- | ------------- | -------------------------- |
| 3.1 | code-reviewer | Full review of all changes |
```

### Complexity 4-5: Major Changes

Add additional waves for:

- **Database changes**: Add migration wave before implementation
- **API changes**: Add contract verification wave
- **UI changes**: Add design review wave
- **Security changes**: Add security audit wave

```markdown
### Wave 1: Foundation (Explore)

...

### Wave 2: Migration (general-purpose)

| #   | Subagent        | Task                    |
| --- | --------------- | ----------------------- |
| 2.1 | general-purpose | Create migration file   |
| 2.2 | general-purpose | Test migration rollback |

### Wave 3: Implementation (general-purpose)

...

### Wave 4: Validation (code-reviewer)

...
```

---

## Success Criteria Guidelines

**MUST be measurable and verifiable:**

### Good Success Criteria:

```markdown
- [ ] API endpoint returns 403 for unauthorized users
- [ ] Unit tests pass with 100% coverage of new code
- [ ] Page load time under 200ms on cached requests
- [ ] No TypeScript errors or warnings
```

### Bad Success Criteria (too vague):

```markdown
- [ ] Code works correctly (HOW do we verify?)
- [ ] Performance is improved (BY HOW MUCH?)
- [ ] Users are happy (NOT MEASURABLE)
```

---

## Risk Assessment Guidelines

### Risk Categories:

| Category          | Example Risks                              |
| ----------------- | ------------------------------------------ |
| **Data**          | Data loss, corruption, migration failure   |
| **Performance**   | Degraded response time, increased load     |
| **Security**      | New attack surface, auth bypass            |
| **Compatibility** | Breaking changes, API contract changes     |
| **Dependencies**  | External service outage, version conflicts |

### Mitigation Strategies:

| Risk Type     | Common Mitigations                          |
| ------------- | ------------------------------------------- |
| Data loss     | Backup before migration, rollback plan      |
| Performance   | Load testing, feature flag, gradual rollout |
| Security      | Security review, penetration testing        |
| Compatibility | API versioning, deprecation period          |
| Dependencies  | Fallback service, circuit breaker           |

---

## Out of Scope Guidelines

**Always include explicit exclusions to prevent scope creep:**

### What to Exclude:

1. **Related but separate features** - "This PRD does not cover user notifications"
2. **Performance optimizations** - "Database indexing is separate work"
3. **Design changes** - "Visual redesign is out of scope"
4. **Documentation** - "API docs update is tracked separately"

### Example:

```markdown
## Out of Scope

- User notification system (tracked in separate PRD)
- Mobile responsive design for this component
- Integration with third-party analytics
- Internationalization of error messages
```

---

## Category-Specific PRD Templates

### Security PRD

Add after Success Criteria:

```markdown
## Security Considerations

- **Threat model:** [What attacks does this prevent?]
- **Attack surface:** [Does this expand or reduce attack surface?]
- **Auth impact:** [How does this affect authentication/authorization?]
```

### Performance PRD

Add after Success Criteria:

```markdown
## Performance Targets

- **Baseline:** [Current metric]
- **Target:** [Expected improvement]
- **Measurement:** [How to verify]
```

### Data PRD

Add after Success Criteria:

```markdown
## Data Migration Plan

- **Backup:** [Backup strategy before migration]
- **Rollback:** [How to revert if needed]
- **Validation:** [How to verify data integrity]
```

---

## PRD Generation Process

1. **Parse item fields**: title, problem, solution, complexity, type
2. **Determine wave count**: Based on complexity score
3. **Generate Problem Statement**: Expand item.problem with context
4. **Generate Solution**: Expand item.solution with implementation details
5. **Create Success Criteria**: 3-5 measurable criteria
6. **Build Wave Structure**: Using complexity scaling rules
7. **Add Risks**: Based on complexity and type
8. **Define Out of Scope**: Explicit exclusions
9. **Apply Category Template**: If security/performance/data

---

## Output Format

Return PRD as markdown string in `prd_content` field:

```json
{
  "prd_content": "# PRD: [Title]\n\n## Problem Statement\n...",
  "prd_generated_at": "2026-01-31T12:00:00Z",
  "prd_version": "1.0",
  "complexity_used": 3,
  "waves_generated": 3
}
```
