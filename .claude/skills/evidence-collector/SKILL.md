## <!-- INITIALIZED: true -->

name: evidence-collector
description: Standardized evidence collection skill for PM review agents. Provides consistent patterns for gathering, formatting, and verifying evidence across all categories.

---

# Evidence Collector Skill

This skill provides standardized evidence collection patterns for all PM review agents. Ensures consistent, verifiable evidence that supports improvement recommendations.

## Evidence Collection Protocol

### Phase 1: Discovery Evidence

When discovering an issue, collect initial evidence:

```json
{
  "discovery_evidence": {
    "source": "grep|glob|read|manual",
    "search_pattern": "<pattern-used>",
    "files_searched": ["<list>"],
    "matches_found": [
      {
        "file": "src/api/route.ts",
        "line": 45,
        "content": "<matched-content>",
        "context": "<surrounding-lines>"
      }
    ],
    "discovery_timestamp": "<ISO-8601>"
  }
}
```

### Phase 2: Verification Evidence

After discovery, verify the issue exists:

```json
{
  "verification_evidence": {
    "verification_method": "file_read|git_check|pattern_match|ast_analysis",
    "verified_at": "<ISO-8601>",
    "verification_result": "confirmed|refuted|inconclusive",
    "verification_details": {
      "file_exists": true,
      "pattern_confirmed": true,
      "git_tracked": true,
      "not_in_gitignore": true
    }
  }
}
```

### Phase 3: Impact Evidence

Quantify the impact of the issue:

```json
{
  "impact_evidence": {
    "affected_files": ["<list>"],
    "affected_functions": ["<list>"],
    "usage_count": N,
    "downstream_impact": ["<components-affected>"],
    "user_facing": true|false,
    "data_risk": "none|low|medium|high|critical"
  }
}
```

---

## Category-Specific Evidence Templates

### Security Evidence

```json
{
  "security_evidence": {
    "vulnerability_class": "A01_broken_access_control",
    "owasp_category": "A01:2021 - Broken Access Control",
    "cwe_id": "CWE-639",
    "attack_vector": "<description-of-exploitation>",
    "severity": "critical|high|medium|low",
    "exploitability": {
      "requires_auth": true|false,
      "network_accessible": true|false,
      "user_interaction": true|false
    },
    "git_verification": {
      "file_tracked": true,
      "not_ignored": true,
      "command_used": "git ls-files <file>"
    },
    "remediation": {
      "fix_location": "src/api/route.ts:45",
      "fix_code": "<suggested-fix>",
      "effort_estimate": "hours|days|weeks"
    }
  }
}
```

### Performance Evidence

```json
{
  "performance_evidence": {
    "issue_type": "n_plus_one|missing_index|bundle_size|render_blocking",
    "measurement_method": "<how-to-measure>",
    "baseline_metric": {
      "value": N,
      "unit": "ms|KB|count|requests"
    },
    "expected_improvement": {
      "value": N,
      "unit": "ms|KB|count|requests",
      "percentage": "X%"
    },
    "code_pattern": {
      "file": "src/lib/db.ts",
      "line": 23,
      "pattern": "N+1 query in loop",
      "fix_pattern": "Use batch query with IN clause"
    }
  }
}
```

### UX Evidence

```json
{
  "ux_evidence": {
    "journey_traced": true,
    "friction_point": {
      "step": "checkout → payment",
      "issue": "No loading feedback during payment processing",
      "user_impact": "Users click submit multiple times"
    },
    "friction_score": 7,
    "cognitive_load": {
      "decisions_required": 3,
      "fields_to_complete": 8,
      "navigation_steps": 4
    },
    "accessibility": {
      "wcag_violations": ["missing-alt-text", "low-contrast"],
      "keyboard_navigable": false,
      "screen_reader_friendly": false
    }
  }
}
```

### UI Evidence

```json
{
  "ui_evidence": {
    "design_system_check": {
      "uses_design_tokens": false,
      "hardcoded_values": ["#333333", "16px"],
      "inconsistent_patterns": ["button-styles", "spacing"]
    },
    "visual_issues": [
      {
        "component": "Button",
        "file": "src/components/Button.tsx",
        "issue": "Hardcoded color instead of theme token",
        "fix": "Replace #333 with var(--color-text-primary)"
      }
    ],
    "responsive_check": {
      "breakpoints_tested": ["mobile", "tablet", "desktop"],
      "issues": ["Overflow on mobile at 320px"]
    }
  }
}
```

### API Evidence

```json
{
  "api_evidence": {
    "endpoint": "POST /api/users",
    "issues": {
      "missing_auth": true,
      "missing_validation": true,
      "missing_rate_limit": true,
      "missing_pagination": false
    },
    "request_analysis": {
      "params_validated": false,
      "body_validated": false,
      "dangerous_operations": ["DELETE without auth"]
    },
    "response_analysis": {
      "error_format_consistent": false,
      "data_exposure_risk": ["password_hash returned"]
    }
  }
}
```

### Data Evidence

```json
{
  "data_evidence": {
    "schema_issues": {
      "missing_indexes": ["user_id on orders"],
      "missing_constraints": ["foreign_key on user_id"],
      "type_mismatches": []
    },
    "query_analysis": {
      "n_plus_one_patterns": ["getUser in loop"],
      "missing_limits": ["SELECT * without LIMIT"],
      "unoptimized_joins": []
    },
    "migration_safety": {
      "data_loss_risk": false,
      "downtime_required": false,
      "rollback_plan": "<description>"
    },
    "rls_audit": {
      "tables_checked": ["users", "orders"],
      "rls_enabled": { "users": true, "orders": false },
      "policies_verified": { "users": true, "orders": false }
    }
  }
}
```

### Code Quality Evidence

```json
{
  "code_quality_evidence": {
    "complexity_metrics": {
      "cyclomatic_complexity": 15,
      "cognitive_complexity": 23,
      "lines_of_code": 450,
      "nesting_depth": 5
    },
    "code_smells": [
      {
        "type": "long_method",
        "file": "src/lib/processor.ts",
        "method": "processData",
        "lines": 180
      }
    ],
    "duplication": {
      "duplicated_blocks": 3,
      "files_affected": ["a.ts", "b.ts", "c.ts"],
      "suggested_abstraction": "Extract to shared utility"
    },
    "tech_debt": {
      "todo_count": 12,
      "fixme_count": 5,
      "hack_count": 2
    }
  }
}
```

---

## Evidence Collection Commands

### Quick Evidence Collection (Tier A)

```bash
# Find all occurrences of a pattern
grep -rn "pattern" --include="*.ts" --include="*.tsx" .

# Get file context (5 lines before/after)
grep -B5 -A5 "pattern" <file>

# Check git tracking
git ls-files <file>
git check-ignore -q <file>

# Find related files
find . -name "*related*" -type f

# Count occurrences
grep -c "pattern" <file>
```

### Deep Evidence Collection (Tier B - Explore Agent)

```
Invoke Explore agent for:
- Import/dependency graph analysis
- Cross-file pattern detection
- Architectural impact assessment
- Test coverage analysis
```

---

## Evidence Validation Rules

### Required Evidence by Category

| Category     | Required Evidence Fields                                  |
| ------------ | --------------------------------------------------------- |
| Security     | git_verification, attack_vector, owasp_category           |
| Performance  | measurement_method, baseline_metric, expected_improvement |
| UX           | journey_traced, friction_score, user_impact               |
| UI           | design_system_check, visual_issues                        |
| API          | endpoint, issues object, request_analysis                 |
| Data         | schema_issues OR query_analysis, rls_audit if applicable  |
| Code Quality | complexity_metrics, code_smells                           |
| Feature      | user_value, technical_feasibility                         |

### Evidence Quality Score

Calculate evidence quality (0.0 - 1.0):

```
evidence_quality = (
  file_references_exist * 0.3 +
  line_numbers_provided * 0.2 +
  fix_location_specified * 0.2 +
  impact_quantified * 0.15 +
  verification_completed * 0.15
)
```

**Reject findings with evidence_quality < 0.6**

---

## Evidence Output Format

Final evidence structure for each finding:

```json
{
  "evidence": {
    "confidence_score": 0.85,
    "evidence_quality": 0.78,
    "verification_tier": "tier2",
    "category_evidence": {
      /* category-specific */
    },
    "discovery_evidence": {
      /* how found */
    },
    "verification_evidence": {
      /* how verified */
    },
    "impact_evidence": {
      /* scope of impact */
    }
  }
}
```

---

## Usage Instructions

1. **Discovery**: Use grep/glob to find potential issues
2. **Verification**: Run verification checks (git, context, mitigations)
3. **Impact**: Trace affected files and downstream components
4. **Format**: Structure evidence using category-specific template
5. **Validate**: Check evidence quality score >= 0.6
6. **Include**: Attach evidence to finding before submission
