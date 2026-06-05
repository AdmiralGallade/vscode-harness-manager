#!/bin/bash
# dev-wiki-scope-check.sh (PreToolUse for Write|Edit)
# Warns when editing files outside the active task's scope.
# Reads tool_input JSON from stdin to get file_path.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
[ -d "$ROOT/.dev-wiki" ] && [ -f "$ROOT/.dev-wiki/tasks.md" ] || exit 0

# Parse file_path from stdin JSON
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path' 2>/dev/null)
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"$//')
fi
[ -z "$FILE_PATH" ] && exit 0

# Always allow dev-wiki state, project rules, and knowledge wiki paths
case "$FILE_PATH" in
  "$ROOT/.dev-wiki/"* | "$ROOT/.claude/rules/"* | "$ROOT/wiki/"* ) exit 0 ;;
esac

# Find first open task in tasks.md
TASK_LINE=$(grep -m1 '^- \[ \]' "$ROOT/.dev-wiki/tasks.md" 2>/dev/null)
if [ -z "$TASK_LINE" ]; then
  echo '[dev-wiki:scope-check] No open tasks in tasks.md.'
  exit 0
fi

# Extract scope field: between "| scope:" and "| success:" (or end of line)
SCOPE_RAW=$(echo "$TASK_LINE" | sed -n 's/.*| scope: *\(.*\)| success:.*/\1/p')
[ -z "$SCOPE_RAW" ] && exit 0

# Strip backticks, split by comma, check each glob
SCOPE_CLEAN=$(echo "$SCOPE_RAW" | sed 's/`//g')
MATCHED=false
IFS=',' read -ra GLOBS <<< "$SCOPE_CLEAN"
for GLOB in "${GLOBS[@]}"; do
  GLOB=$(echo "$GLOB" | sed 's/^ *//;s/ *$//')
  [ -z "$GLOB" ] && continue
  # Expand ~ to $HOME
  GLOB="${GLOB/#\~/$HOME}"
  # Expand relative paths to project root
  [[ "$GLOB" != /* ]] && GLOB="$ROOT/$GLOB"
  # Bash glob match
  if [[ "$FILE_PATH" == $GLOB ]]; then
    MATCHED=true
    break
  fi
done

if [ "$MATCHED" = false ]; then
  echo "[dev-wiki:scope-check] $FILE_PATH is outside active task scope."
fi

exit 0
