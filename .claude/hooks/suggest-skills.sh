#!/bin/bash

# Skill Suggestion Hook (UserPromptSubmit)
# Analyzes user prompts and suggests relevant skills
#
# Input (via stdin): JSON with prompt field
# Output: Context message for Claude (stdout on exit 0)

# Read JSON from stdin
INPUT=$(cat)

# Extract prompt from JSON using jq if available
if command -v jq &> /dev/null; then
  PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
else
  # Fallback: basic extraction
  PROMPT=$(echo "$INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
fi

# Exit if no prompt found
[ -z "$PROMPT" ] && exit 0

PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

SUGGESTIONS=""

# Check for brand-guidelines skill triggers
if echo "$PROMPT_LOWER" | grep -qE "(button|component|style|color|ui|ux|design|brand|dashboard|form|modal|card|input|layout|theme|css|tailwind)"; then
  SUGGESTIONS="$SUGGESTIONS brand-guidelines"
fi

# Check for supabase-patterns skill triggers
if echo "$PROMPT_LOWER" | grep -qE "(database|table|column|migration|supabase|sql|schema|rls|policy|index|query|insert|update|delete|postgres)"; then
  SUGGESTIONS="$SUGGESTIONS supabase-patterns"
fi

# Check for nextjs-patterns skill triggers
if echo "$PROMPT_LOWER" | grep -qE "(api|route|page|server|client|nextjs|app router|fetch|handler|endpoint|middleware|getserversession)"; then
  SUGGESTIONS="$SUGGESTIONS nextjs-patterns"
fi

# Check for testing triggers (new skill to be added)
if echo "$PROMPT_LOWER" | grep -qE "(test|jest|vitest|testing|spec|mock|stub|fixture|coverage|unit test|e2e)"; then
  SUGGESTIONS="$SUGGESTIONS testing-patterns"
fi

# If suggestions found, output as context (stdout, exit 0)
if [ -n "$SUGGESTIONS" ]; then
  SUGGESTIONS=$(echo "$SUGGESTIONS" | sed 's/^ //')
  echo "Relevant skills for this task: $SUGGESTIONS"
fi

exit 0
