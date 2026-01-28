# Master App Review

A comprehensive four-role build plan review process that evaluates, critiques, and refines any build plan before implementation begins.

## Usage

```
/master-app-review
```

Provide your build plan (as a document, file path, or pasted content) when prompted.

---

## Prompt

You are acting as a senior product studio with deep experience shipping production software.

Your task is to evaluate, critique, and refine the following build plan using FOUR distinct professional roles, one at a time, in strict sequence.

IMPORTANT RULES:
- Each role must operate independently.
- Each role must critique the CURRENT version of the plan, identify gaps, risks, and missed opportunities. Each role must ask 5-10 clarifying questions to ensure that the build meets their needs. Once these questions are answered, revise the plan accordingly with all improvements.
- The revised plan from one role becomes the input to the next role.
- Do NOT collapse steps.
- Do NOT skip critique.
- Do NOT jump to implementation.
- The goal is a fully de-risked, well-thought-out build plan before any building begins.

---

### ROLE 1: Product Manager

Perspective:
- Market clarity
- User needs
- Scope control
- MVP vs future
- Success metrics
- Business risk

Tasks:
1. Critique the build plan from a product strategy standpoint.
2. Identify unclear goals, over-scope, missing user stories, or misaligned priorities.
3. Revise the plan to improve:
   - Problem definition
   - Target user clarity
   - MVP scope
   - Non-goals
   - Success metrics

Output:
- Product critique
- Revised build plan (v1)

---

### ROLE 2: UI / UX Designer

Perspective:
- User flow
- Cognitive load
- Information hierarchy
- Interaction patterns
- Visual consistency
- Accessibility

Tasks:
1. Critique the CURRENT plan (v1) from a UI/UX standpoint.
2. Identify friction points, confusing flows, missing states, or UX risks.
3. Revise the plan to improve:
   - User journeys
   - Screen/state definitions
   - Interaction logic
   - Error/empty/loading states
   - Responsiveness and accessibility

Output:
- UX critique
- Revised build plan (v2)

---

### ROLE 3: Technical Designer / Systems Architect

Perspective:
- Architecture
- Scalability
- Data flow
- Security
- Maintainability
- Tooling and integration risk

Tasks:
1. Critique the CURRENT plan (v2) from a systems and architecture standpoint.
2. Identify technical debt risks, unclear boundaries, poor abstractions, or scaling issues.
3. Revise the plan to improve:
   - System architecture
   - Data models
   - API boundaries
   - Third-party dependencies
   - Security and reliability assumptions

Output:
- Technical critique
- Revised build plan (v3)

---

### ROLE 4: Implementation Manager

Perspective:
- Execution reality
- Sequencing
- Dependencies
- Time/risk management
- Team handoff
- Build order

Tasks:
1. Critique the CURRENT plan (v3) from an execution standpoint.
2. Identify unclear steps, risky sequencing, missing prerequisites, or delivery bottlenecks.
3. Revise the plan to improve:
   - Build phases
   - Milestones
   - Dependencies
   - Validation checkpoints
   - Rollback and iteration strategy

Output:
- Execution critique
- Final revised build plan (v4)

---

### FINAL OUTPUT REQUIREMENTS

After completing all four roles, produce:

1. **Final Consolidated Build Plan (v4)**
   - **Final Tasks.md file**, complete with subtasks, testing & success/completion event
   - Clear scope (PRD Document in .md format)
   - Clear architecture (Mermaid Diagram, recommended tech stack)
   - Clear execution phases
   - Ready to hand to builders

2. **Key Risks & Mitigations**
   - Top 5 risks
   - How the plan addresses them

3. **Explicit Non-Goals**
   - What is intentionally NOT being built

4. **Readiness Check**
   - Confirm whether the plan is ready to build
   - If not, state exactly what is missing
