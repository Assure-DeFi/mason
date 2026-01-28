# PM Domain Knowledge

This skill provides domain-specific context for the Product Manager agent when analyzing this codebase.

## How to Customize

Edit this file to provide context specific to your project. The PM agent will use this information when:

- Prioritizing improvements
- Understanding business constraints
- Aligning suggestions with project goals

---

## Project Overview

<!-- Describe your project in 2-3 sentences -->

[PROJECT_NAME] is a [type of application] that helps [target users] to [main value proposition].

## Business Goals

<!-- What are the current business priorities? -->

1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

## User Personas

<!-- Who uses this application? -->

### Primary User

- **Role**: [e.g., Developer, Admin, End User]
- **Goals**: [What they want to achieve]
- **Pain Points**: [Current frustrations]

### Secondary User

- **Role**: [e.g., Manager, Viewer]
- **Goals**: [What they want to achieve]

## Technical Constraints

<!-- What technical limitations should the PM consider? -->

- [Constraint 1, e.g., "Must support IE11"]
- [Constraint 2, e.g., "Backend is read-only in production"]
- [Constraint 3, e.g., "Cannot add new dependencies without approval"]

## Known Technical Debt

<!-- What tech debt should be prioritized? -->

1. [Debt item 1]
2. [Debt item 2]

## Domain Priorities

<!-- Adjust weights for different domains -->

| Domain       | Priority | Notes                         |
| ------------ | -------- | ----------------------------- |
| frontend-ux  | High     | User experience is critical   |
| api-backend  | Medium   | Stable but needs optimization |
| reliability  | High     | Uptime is business-critical   |
| security     | Critical | Handles sensitive data        |
| code-quality | Medium   | Tech debt manageable          |

## Off-Limits Areas

<!-- What should NOT be suggested for changes? -->

- [Area 1, e.g., "Legacy auth system - pending migration"]
- [Area 2, e.g., "Third-party integrations - vendor managed"]

## Improvement Guidelines

<!-- What makes a good improvement for this project? -->

### Prefer

- Improvements that reduce user friction
- Security hardening
- Performance optimizations for critical paths
- Accessibility improvements

### Avoid

- Major architectural changes without discussion
- Adding new dependencies for minor gains
- Cosmetic changes without functional benefit
- Breaking changes to public APIs

## Success Metrics

<!-- How do we measure improvement success? -->

- User satisfaction (NPS, support tickets)
- Performance (load time, API latency)
- Reliability (uptime, error rates)
- Developer experience (build time, test coverage)

---

## Notes for PM Agent

When analyzing this codebase:

1. **Context matters**: Consider the business goals when prioritizing
2. **User-first**: Prioritize improvements that benefit end users
3. **Pragmatic**: Suggest improvements that are achievable with current resources
4. **Specific**: Reference actual files and code when possible
5. **Incremental**: Prefer small, safe changes over big-bang refactors

Remember: The best improvement is one that ships and provides value.
