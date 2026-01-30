# Command Versioning Rules

These rules apply to ALL Mason command files. **EVERY change to these commands MUST include a version bump.**

## Version-Controlled Commands

The following commands are centrally distributed and version-controlled:

| Command             | Source File                                            | Description                        |
| ------------------- | ------------------------------------------------------ | ---------------------------------- |
| `/pm-review`        | `packages/mason-commands/commands/pm-review.md`        | PM review and backlog generation   |
| `/execute-approved` | `packages/mason-commands/commands/execute-approved.md` | Execute approved backlog items     |
| `/mason-update`     | `packages/mason-commands/commands/mason-update.md`     | Update commands to latest versions |

## CRITICAL: When to Update Versions

**ANY change to ANY of these commands MUST:**

1. **Bump version** in YAML frontmatter (semver: MAJOR.MINOR.PATCH)
   - MAJOR: Breaking changes, new required fields
   - MINOR: New features, non-breaking additions
   - PATCH: Bug fixes, documentation

2. **Update ALL THREE locations**:
   - `packages/mason-commands/versions.json` - manifest with version + required_minimum
   - `packages/mason-commands/commands/<command>.md` - source file
   - Local `.claude/commands/<command>.md` - for testing

3. **Set `required_minimum`** when changes affect data structure or behavior

**Why this matters:** Setting `required_minimum` forces existing users to auto-update before their next execution. Without this, users may run outdated commands and miss critical fixes.

## Version Manifest Structure

The `versions.json` file in `packages/mason-commands/` is the source of truth:

```json
{
  "manifest_version": 2,
  "commands": {
    "pm-review": {
      "version": "1.2.0",
      "file_path": "commands/pm-review.md",
      "required_minimum": "1.2.0",
      "breaking_reason": "Risk analysis integration"
    },
    "execute-approved": {
      "version": "1.1.0",
      "file_path": "commands/execute-approved.md",
      "required_minimum": "1.1.0",
      "breaking_reason": "Execution logging for dashboard"
    },
    "mason-update": {
      "version": "1.0.0",
      "file_path": "commands/mason-update.md",
      "required_minimum": null,
      "breaking_reason": null
    }
  }
}
```

**Fields:**

- `version`: Current version of the command
- `file_path`: Path to the command file within the package
- `required_minimum`: Minimum version required (triggers auto-update if below)
- `breaking_reason`: Human-readable reason for the version requirement

## Auto-Update Pattern (MANDATORY)

Every Mason command (except mason-update itself) MUST include this auto-update check at the start:

```bash
# === VERSION ENFORCEMENT (AUTO-UPDATE) ===
COMMAND_NAME="pm-review"  # or "execute-approved"
LOCAL_VERSION=$(grep -m1 "^version:" ".claude/commands/${COMMAND_NAME}.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
REMOTE=$(curl -fsSL --connect-timeout 3 "https://raw.githubusercontent.com/Assure-DeFi/mason/main/packages/mason-commands/versions.json" 2>/dev/null)
REMOTE_VERSION=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".version // \"\"" 2>/dev/null)
REQUIRED_MIN=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".required_minimum // \"\"" 2>/dev/null)
BREAKING_REASON=$(echo "$REMOTE" | jq -r ".commands.\"${COMMAND_NAME}\".breaking_reason // \"\"" 2>/dev/null)

# Check if below required minimum
VERSION_OUTDATED=false
if [ -n "$REQUIRED_MIN" ] && [ -n "$LOCAL_VERSION" ]; then
  if [ "$(printf '%s\n' "$REQUIRED_MIN" "$LOCAL_VERSION" | sort -V | head -n1)" = "$LOCAL_VERSION" ] && \
     [ "$LOCAL_VERSION" != "$REQUIRED_MIN" ]; then
    VERSION_OUTDATED=true
    echo "⚠️  Command outdated: v${LOCAL_VERSION} → v${REQUIRED_MIN} required"
    [ -n "$BREAKING_REASON" ] && echo "   Reason: $BREAKING_REASON"
    echo "   Auto-updating..."
  fi
fi
# === END VERSION ENFORCEMENT ===
```

**CRITICAL: If `VERSION_OUTDATED=true`, the agent MUST:**

1. Immediately invoke `/mason-update` using the Skill tool
2. Wait for update to complete
3. Re-read the command file (it will have new content)
4. Continue execution with the updated command

Do NOT ask the user - just auto-update and continue.

## Checklist Before Committing Command Changes

- [ ] Bumped version in YAML frontmatter
- [ ] Updated versions.json with new version
- [ ] Set required_minimum if this is an important change
- [ ] Added breaking_reason description
- [ ] Updated BOTH source and local command files
- [ ] Tested version enforcement locally

## Version Comparison Logic

The version check uses semantic version comparison via `sort -V`:

- `1.0.0` < `1.1.0` < `1.2.0`
- If local version is BELOW required_minimum → **AUTO-UPDATE triggered**
- If local version equals or exceeds required_minimum → Execution proceeds
- If local version differs from remote but meets minimum → Non-blocking update notification shown

## Forcing Updates to All Users

When making a change that ALL users must have:

1. Bump the `version` in all three locations
2. Set `required_minimum` to the new version
3. Add a descriptive `breaking_reason`
4. Commit and push

**Result:** All users with older versions will automatically update before their next command execution.

## Example: Adding a New Feature

Say you add a new logging feature to `/execute-approved`:

1. Edit `packages/mason-commands/commands/execute-approved.md`:
   - Add your feature
   - Update frontmatter: `version: 1.1.0` → `version: 1.2.0`

2. Edit `packages/mason-commands/versions.json`:

   ```json
   "execute-approved": {
     "version": "1.2.0",
     "required_minimum": "1.2.0",
     "breaking_reason": "Added execution logging feature"
   }
   ```

3. Copy changes to `.claude/commands/execute-approved.md` for testing

4. Commit: `feat: Add execution logging to /execute-approved (v1.2.0)`

Now every user running `/execute-approved` with v1.1.0 will auto-update to v1.2.0 first.
