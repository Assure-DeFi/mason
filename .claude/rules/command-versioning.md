# Command Versioning Rules

These rules apply to ALL Mason command files (`/pm-review`, `/execute-approved`, etc.).

## When to Update Versions

ANY change to `/pm-review` or `/execute-approved` commands MUST:

1. **Bump version** in YAML frontmatter (semver: MAJOR.MINOR.PATCH)
   - MAJOR: Breaking changes, new required fields
   - MINOR: New features, non-breaking additions
   - PATCH: Bug fixes, documentation

2. **Update ALL three locations**:
   - `packages/mason-commands/versions.json` - manifest with version + required_minimum
   - `packages/mason-commands/commands/<command>.md` - source file
   - Local `.claude/commands/<command>.md` - for testing

3. **Set `required_minimum`** when changes affect data structure or behavior

## Version Manifest Structure

The `versions.json` file in `packages/mason-commands/` contains:

```json
{
  "manifest_version": 2,
  "commands": {
    "pm-review": {
      "version": "1.2.0",
      "file_path": "commands/pm-review.md",
      "required_minimum": "1.2.0",
      "breaking_reason": "Risk analysis integration - data structure changes"
    },
    "execute-approved": {
      "version": "1.0.0",
      "file_path": "commands/execute-approved.md",
      "required_minimum": "1.0.0",
      "breaking_reason": null
    }
  }
}
```

**Fields:**

- `version`: Current version of the command
- `file_path`: Path to the command file within the package
- `required_minimum`: Minimum version required (blocks execution if below)
- `breaking_reason`: Human-readable reason for the version requirement

## Pre-Check Pattern (MANDATORY)

Every Mason command MUST include this blocking version check at the start of its Pre-Check section:

```bash
# === VERSION ENFORCEMENT (BLOCKING) ===
COMMAND_NAME="pm-review"  # or "execute-approved"
LOCAL_VERSION=$(grep -m1 "^version:" ".claude/commands/${COMMAND_NAME}.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
REMOTE=$(curl -fsSL --connect-timeout 3 "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/versions.json" 2>/dev/null)
REMOTE_VERSION=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".version // \"\"" 2>/dev/null)
REQUIRED_MIN=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".required_minimum // \"\"" 2>/dev/null)
BREAKING_REASON=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".breaking_reason // \"\"" 2>/dev/null)

# Block if below required minimum
if [ -n "$REQUIRED_MIN" ] && [ -n "$LOCAL_VERSION" ]; then
  if [ "$(printf '%s\n' "$REQUIRED_MIN" "$LOCAL_VERSION" | sort -V | head -n1)" = "$LOCAL_VERSION" ] && \
     [ "$LOCAL_VERSION" != "$REQUIRED_MIN" ]; then
    echo "❌ REQUIRED UPDATE: Your ${COMMAND_NAME} v${LOCAL_VERSION} is below minimum required v${REQUIRED_MIN}"
    [ -n "$BREAKING_REASON" ] && echo "   Reason: $BREAKING_REASON"
    echo ""
    echo "   Run: /mason-update"
    echo ""
    # STOP - do not continue with outdated version
    return 1 2>/dev/null || exit 1
  fi
fi

# Notify if optional update available (non-blocking)
if [ -n "$REMOTE_VERSION" ] && [ -n "$LOCAL_VERSION" ] && [ "$LOCAL_VERSION" != "$REMOTE_VERSION" ]; then
  echo "📦 Update available: v${LOCAL_VERSION} → v${REMOTE_VERSION}. Run /mason-update to update."
fi
# === END VERSION ENFORCEMENT ===
```

## Checklist Before Committing Command Changes

- [ ] Bumped version in frontmatter
- [ ] Updated versions.json with new version
- [ ] Set required_minimum if breaking/important change
- [ ] Added breaking_reason description
- [ ] Updated BOTH source and local command files
- [ ] Tested version enforcement locally

## Version Comparison Logic

The version check uses semantic version comparison via `sort -V`:

- `1.0.0` < `1.1.0` < `1.2.0`
- If local version is BELOW required_minimum, execution is BLOCKED
- If local version equals or exceeds required_minimum, execution proceeds
- If local version differs from remote but meets minimum, a non-blocking update notification is shown

## Forcing Updates

When making a critical change that requires all users to update:

1. Bump the `version` in all three locations
2. Set `required_minimum` to the new version
3. Add a descriptive `breaking_reason`
4. Commit and push - all users with older versions will be blocked until they run `/mason-update`
