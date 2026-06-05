#!/bin/bash
# stale-queue.sh (PostToolUse for Edit|Write)
# Appends changed source file paths to .dev-wiki/.stale-queue for
# incremental refresh at next session start. See Section R of dev-wiki-reference.md.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Only proceed if dev-wiki exists
[ -d "$ROOT/.dev-wiki" ] || exit 0

# Read stdin JSON and extract file_path
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Fallback: grep-based extraction
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

[ -z "$FILE_PATH" ] && exit 0

# Convert to project-relative path
REL_PATH="${FILE_PATH#$ROOT/}"

# Skip if path is still absolute (file is outside project root)
[[ "$REL_PATH" == /* ]] && exit 0

# Skip dev-wiki, claude config, wiki, and all markdown files
case "$REL_PATH" in
  .dev-wiki/*|.claude/*|wiki/*) exit 0 ;;
  *.md) exit 0 ;;
esac

# Skip Section Q exclusion patterns
case "$REL_PATH" in
  node_modules/*|.git/*|dist/*|build/*|__pycache__/*) exit 0 ;;
  .venv/*|venv/*|.tox/*|*.egg-info/*|.mypy_cache/*|.pytest_cache/*) exit 0 ;;
esac

# Skip binary extensions (Section Q)
case "$REL_PATH" in
  *.png|*.jpg|*.gif|*.ico|*.woff|*.ttf|*.pdf) exit 0 ;;
  *.pyc|*.o|*.so|*.dylib|*.class|*.jar) exit 0 ;;
esac

QUEUE="$ROOT/.dev-wiki/.stale-queue"

# Hard cap: 200 entries
if [ -f "$QUEUE" ]; then
  COUNT=$(wc -l < "$QUEUE" | tr -d ' ')
  if [ "$COUNT" -ge 200 ]; then
    echo "[dev-wiki:stale-queue] Queue full (200 entries). Entry dropped: $REL_PATH"
    exit 0
  fi
  # Best-effort dedup
  grep -qxF "$REL_PATH" "$QUEUE" 2>/dev/null && exit 0
fi

# Append to queue
echo "$REL_PATH" >> "$QUEUE"

exit 0
