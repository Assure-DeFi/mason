#!/bin/bash

# Lint Check Hook (PostToolUse)
# Runs ESLint on modified TypeScript/JavaScript files
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

# Check if file path is set and is a JS/TS file
if [[ -n "$FILE_PATH" && "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  # Check if we're in a directory with eslint config
  if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    # Run eslint on the specific file (faster than full project)
    LINT_OUTPUT=$(npx eslint "$FILE_PATH" --format compact 2>&1)
    LINT_EXIT_CODE=$?

    if [ $LINT_EXIT_CODE -eq 0 ]; then
      echo '{"decision": "continue", "reason": "ESLint: No issues"}' >&2
    else
      # Count errors and warnings
      ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "Error -" || echo "0")
      WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -c "Warning -" || echo "0")
      echo "{\"decision\": \"continue\", \"reason\": \"ESLint: $ERROR_COUNT error(s), $WARNING_COUNT warning(s)\"}" >&2
    fi
  fi
fi

exit 0
