## <!-- INITIALIZED: true -->

name: shared-validation
description: Shared validation skill for PM review agents. Provides false-positive filtering, confidence scoring, and evidence verification based on Anthropic's official security review patterns.

---

# Shared Validation Skill

This skill provides standardized validation patterns for all PM review agents. Based on Anthropic's official Claude Code security review methodology.

## Confidence Scoring

All findings must include a confidence score (0.0 - 1.0):

| Score Range | Meaning                                              | Action                      |
| ----------- | ---------------------------------------------------- | --------------------------- |
| 0.9 - 1.0   | **Certain** - Clear, unambiguous evidence            | Report with high priority   |
| 0.8 - 0.9   | **Likely** - Strong pattern match, minor uncertainty | Report with medium priority |
| 0.7 - 0.8   | **Possible** - Suspicious but needs context          | Report with caveat          |
| < 0.7       | **Uncertain** - Too much ambiguity                   | **DO NOT REPORT**           |

**CRITICAL: Never report findings with confidence below 0.7.**

---

## False Positive Hard Exclusions

**AUTOMATICALLY EXCLUDE findings matching these patterns:**

### 1. Test & Mock Files

- Files with prefixes: `test_`, `mock_`, `fixture_`, `spec_`
- Directories: `__tests__/`, `__mocks__/`, `fixtures/`, `test/`, `tests/`
- File extensions: `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`

### 2. Example & Documentation

- Files: `*.example`, `*.sample`, `README*`, `EXAMPLE*`
- Directories: `examples/`, `docs/`, `documentation/`
- Patterns: Values like `your-api-key`, `xxx`, `placeholder`, `CHANGEME`, `TODO`

### 3. Generated & Config Files

- Generated: `*.generated.ts`, `@generated`, `auto-generated`
- Config: `tsconfig.json`, `tailwind.config.*`, `jest.config.*`, `vite.config.*`
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

### 4. Environment Files (Context-Dependent)

- `.env.example` with placeholder values → **NOT a vulnerability**
- `.env.local` that is gitignored → **NOT a vulnerability**
- `NEXT_PUBLIC_*` variables → **Intentionally public, NOT secrets**

### 5. Storybook & Demo Files

- Patterns: `*.stories.tsx`, `*.stories.ts`, `Storybook*`
- Directories: `storybook/`, `.storybook/`

### 6. Development-Only Patterns

- Console statements in non-production code
- Debug flags in development config
- Hot reload / HMR code

### 7. Architectural Decisions (Check Before Flagging)

These patterns may be INTENTIONAL - verify before flagging:

- Missing rate limiting (may be handled by infrastructure)
- Lack of audit logs (may be external logging service)
- Direct database access (may be intentional BYOD architecture)
- Missing input sanitization (may be handled by framework)

---

## Git Tracking Verification

**MANDATORY for security-related findings:**

```bash
# Step 1: Check if file is tracked
git ls-files <file>
# If empty → NOT tracked → NOT a vulnerability

# Step 2: Check if gitignored
git check-ignore -q <file>
# If success (exit 0) → File is excluded → NOT a vulnerability

# Step 3: Only flag if BOTH checks pass (file IS tracked AND NOT ignored)
```

---

## Pattern-Based Auto-Rejection (Tier 1)

Quick patterns that can be rejected without deep analysis:

```javascript
const TIER1_REJECTION_PATTERNS = [
  // Placeholder values
  /your[-_]?api[-_]?key/i,
  /xxx+/,
  /placeholder/i,
  /CHANGEME/i,
  /TODO/i,
  /example\.com/i,

  // Test credentials
  /test[-_]?api[-_]?key/i,
  /mock[-_]?secret/i,
  /fake[-_]?token/i,

  // Example UUIDs
  /00000000-0000-0000-0000-000000000000/,
  /xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/i,

  // Next.js public vars (intentionally public)
  /NEXT_PUBLIC_/,

  // Common example domains
  /@example\.(com|org|net)/,
  /localhost/,
  /127\.0\.0\.1/,
];
```

---

## Contextual Verification (Tier 2)

For findings that pass Tier 1, verify context:

### Check for Intentional Design

```bash
# Search for intentional design comments
grep -r "// intentional\|// by design\|// NOTE:\|// BYOD" <file>

# Check architectural docs
cat .claude/rules/*.md | grep -i "<relevant-keyword>"
```

### Check for Existing Mitigations

```bash
# Error handling
grep -r "try.*catch\|\.catch\|ErrorBoundary" <affected-files>

# Input validation
grep -r "zod\|yup\|joi\|validate\|sanitize" <affected-files>

# Auth checks
grep -r "getServerSession\|requireAuth\|middleware" <affected-files>
```

### Check Off-Limits Areas

```bash
# Read domain knowledge for excluded areas
cat .claude/skills/pm-domain-knowledge/SKILL.md | grep -A10 "Off-Limits"
```

---

## Impact Verification (Tier 3)

Verify solutions are actionable:

### Solution Specificity Score

| Score            | Criteria                   | Example                     |
| ---------------- | -------------------------- | --------------------------- |
| High (0.9+)      | References exact file:line | "Fix in src/api/auth.ts:45" |
| Medium (0.7-0.9) | References specific files  | "Update auth middleware"    |
| Low (<0.7)       | Generic description        | "Improve error handling"    |

**Reject findings with specificity score < 0.7**

### File Existence Validation

```bash
# Verify referenced files exist
for file in <files-from-solution>; do
  if [ ! -f "$file" ]; then
    echo "REJECT: Referenced file does not exist: $file"
  fi
done
```

---

## Evidence Collection Template

All validated findings must include:

```json
{
  "evidence": {
    "confidence_score": 0.85,
    "verification_tier": "tier2",
    "git_verified": true,
    "files_checked": ["src/api/route.ts", "src/lib/auth.ts"],
    "pattern_matches": [
      {
        "file": "src/api/route.ts",
        "line": 45,
        "match": "const userId = req.body.userId",
        "issue": "User ID from request body without session verification"
      }
    ],
    "mitigations_checked": {
      "auth_middleware": false,
      "input_validation": false,
      "error_handling": true
    }
  }
}
```

---

## Category-Specific Validation

### Security Findings

- MUST have git_verified: true
- MUST have confidence >= 0.8 for vulnerabilities
- MUST include OWASP category mapping
- MUST describe attack vector

### Performance Findings

- MUST include baseline measurement method
- MUST reference specific code pattern
- SHOULD include estimated improvement percentage

### UX Findings

- MUST trace actual user journey
- MUST identify specific friction point
- SHOULD include friction score (1-10)

### Code Quality Findings

- MUST verify pattern is actually problematic
- MUST check for existing refactor plans
- SHOULD include complexity metrics

---

## Validation Summary Output

After validation, return:

```json
{
  "validation_summary": {
    "total_candidates": 15,
    "tier1_rejected": 3,
    "tier2_rejected": 2,
    "tier3_rejected": 1,
    "validated": 9,
    "rejection_reasons": [
      { "title": "...", "reason": "Test file pattern", "tier": 1 },
      {
        "title": "...",
        "reason": "Intentional design comment found",
        "tier": 2
      },
      {
        "title": "...",
        "reason": "Solution too vague, no file references",
        "tier": 3
      }
    ]
  }
}
```

---

## Usage by Agents

All PM agents should invoke this skill before submitting findings:

```python
# In each PM agent
for candidate in discovered_items:
    validation = validate_with_shared_skill(candidate)

    if validation.rejected:
        log_to_filtered_items(candidate, validation.reason, validation.tier)
        continue

    candidate.evidence = validation.evidence
    candidate.confidence_score = validation.confidence_score
    validated_items.append(candidate)
```
