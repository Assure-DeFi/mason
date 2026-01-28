#!/bin/bash

# Type-Check Hook (PostToolUse)
# Runs TypeScript type-checker on modified TS/TSX files
#
# Input (via stdin): JSON with tool_input containing file_path
# Output: JSON feedback message to stderr

# Read JSON from stdin
INPUT=$(cat)

# Extract file path from tool_input.file_path using jq if available
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
else
  # Fallback: basic grep extraction
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
fi

# Check if file path is set and is a TypeScript file
if [[ -n "$FILE_PATH" && "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  # Check if we're in a directory with tsconfig.json
  if [ -f "tsconfig.json" ]; then
    # Run tsc in noEmit mode to check types (limit output for performance)
    TSC_OUTPUT=$(npx tsc --noEmit 2>&1 | head -30)
    TSC_EXIT_CODE=${PIPESTATUS[0]}

    if [ $TSC_EXIT_CODE -eq 0 ]; then
      echo '{"decision": "continue", "reason": "TypeScript: No type errors"}' >&2
    else
      # Count errors
      ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS")
      echo "{\"decision\": \"continue\", \"reason\": \"TypeScript: $ERROR_COUNT type error(s) found\"}" >&2
    fi
  fi
fi

exit 0
