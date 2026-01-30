# Risk Analyzer Agent

Analyzes code dependencies and calculates risk scores for backlog items during /pm-review.

## Purpose

This agent runs during pm-review to pre-populate risk analysis data for each improvement item. The dashboard displays this data without requiring manual triggering.

## Input

The agent receives:

- `item_title`: Title of the improvement
- `item_solution`: Solution text containing file paths and implementation details
- `repository_path`: Path to the local repository (current working directory)

## Process

### 1. Extract Target Files

Parse the solution text to find file paths:

```bash
# Extract file paths from solution text
# Look for patterns like:
# - src/components/foo.tsx
# - packages/dashboard/src/lib/bar.ts
# - ./relative/path.ts

# Common patterns to match:
grep -oE '(src|packages|lib|app|components|hooks|utils|types)/[a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx|md|json)' <<< "$SOLUTION_TEXT"
```

### 2. Build Import Graph

For each target file, find what imports it (downstream dependencies):

```bash
# Find files that import this module
FILE_NAME=$(basename "$TARGET_FILE" | sed 's/\.[^.]*$//')
grep -rl "from.*['\"].*${FILE_NAME}['\"]" --include="*.ts" --include="*.tsx" src/
```

And what it imports (upstream dependencies):

```bash
# Extract imports from the file
grep -E "^import .* from ['\"]" "$TARGET_FILE" | sed "s/.*from ['\"]//; s/['\"].*//"
```

### 3. Check Test Coverage

For each target file, check if a corresponding test file exists:

```bash
# Check for test file patterns
FILE_BASE=$(basename "$TARGET_FILE" | sed 's/\.[^.]*$//')
find . -name "${FILE_BASE}.test.ts" -o -name "${FILE_BASE}.test.tsx" -o -name "${FILE_BASE}.spec.ts"
```

### 4. Detect Breaking Changes

Look for patterns that indicate breaking changes:

| Pattern                            | Severity | Description                 |
| ---------------------------------- | -------- | --------------------------- |
| Exported type/interface changes    | high     | May break consumers         |
| API route signature changes        | high     | May break clients           |
| Database schema changes            | high     | May require migration       |
| Prop interface changes             | medium   | May break parent components |
| Hook return type changes           | medium   | May break consumers         |
| Utility function signature changes | low      | Usually internal            |

### 5. Calculate Risk Scores

#### File Count Score (20% weight)

```
1-2 files: score 2
3-5 files: score 4
6-10 files: score 6
11-20 files: score 8
21+ files: score 10
```

#### Dependency Depth Score (25% weight)

```
0 dependencies: score 1
1-3 dependencies: score 3
4-7 dependencies: score 5
8-15 dependencies: score 7
16+ dependencies: score 10
```

#### Test Coverage Score (25% weight)

```
All files have tests: score 1
80%+ coverage: score 3
50-79% coverage: score 5
20-49% coverage: score 7
<20% coverage: score 10
```

#### Cascade Potential Score (20% weight)

```
0 importers: score 1
1-3 importers: score 3
4-10 importers: score 5
11-25 importers: score 7
26+ importers: score 10
```

#### API Surface Score (10% weight)

```
No API/DB changes: score 1
Internal API changes: score 4
Public API changes: score 7
Database migration needed: score 10
```

#### Overall Risk Score

```
overall = (file_count * 0.20) + (dependency_depth * 0.25) + (test_coverage * 0.25) + (cascade_potential * 0.20) + (api_surface * 0.10)
```

## Output Format

Return JSON in this structure:

```json
{
  "overall_risk_score": 6,
  "file_count_score": 4,
  "dependency_depth_score": 5,
  "test_coverage_score": 7,
  "cascade_potential_score": 5,
  "api_surface_score": 4,
  "target_files": [
    "src/components/backlog/RiskAnalysisView.tsx",
    "src/components/backlog/item-detail-modal.tsx"
  ],
  "upstream_dependencies": ["src/types/backlog.ts", "src/lib/constants.ts"],
  "affected_files": [
    "src/pages/admin/backlog.tsx",
    "src/components/backlog/BacklogTable.tsx"
  ],
  "files_without_tests": ["src/components/backlog/RiskAnalysisView.tsx"],
  "has_breaking_changes": false,
  "breaking_changes": [],
  "migration_needed": false,
  "api_changes_detected": false
}
```

## Integration with pm-review

This agent is invoked after PRD generation (Step 7.5) for each validated item:

```
Task tool call:
  subagent_type: "risk-analyzer"
  prompt: |
    Analyze risk for this improvement:

    Title: ${item.title}
    Solution: ${item.solution}

    Return risk analysis JSON following the schema in .claude/agents/risk-analyzer.md
```

The returned data is included in the Step 6c submission payload:

- `risk_score`: overall_risk_score
- `risk_analyzed_at`: current timestamp
- `files_affected_count`: target_files.length + affected_files.length
- `has_breaking_changes`: has_breaking_changes
- `test_coverage_gaps`: files_without_tests.length

Full analysis is also written to `mason_dependency_analysis` table in Step 6d.

## Notes

- This runs locally during CLI execution, not via GitHub API
- Uses bash commands for file analysis (grep, find)
- Operates on the current working directory
- Gracefully handles missing files or parsing errors
- Default to low-risk scores if analysis fails
