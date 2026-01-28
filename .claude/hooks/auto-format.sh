#!/bin/bash

# Auto-Format Hook (PostToolUse)
# Runs prettier on modified TypeScript/JavaScript files
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
if [[ -n "$FILE_PATH" && "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|css|scss|md)$ ]]; then
  # Check if prettier is available and file exists
  if command -v npx &> /dev/null && [ -f "$FILE_PATH" ]; then
    # Run prettier on the file
    if npx prettier --write "$FILE_PATH" 2>/dev/null; then
      echo "{\"decision\": \"continue\", \"reason\": \"Formatted $(basename "$FILE_PATH") with Prettier\"}" >&2
    fi
  fi
fi

exit 0
