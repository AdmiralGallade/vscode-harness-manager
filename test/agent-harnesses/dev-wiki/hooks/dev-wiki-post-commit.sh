#!/bin/bash
# dev-wiki-post-commit.sh (PostToolUse for Bash)
# Detects git commit commands and records commit data for the dev wiki.
# Reads tool input from stdin JSON to check if the command was a git commit.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Only proceed if dev-wiki exists
[ -d "$ROOT/.dev-wiki" ] || exit 0

# Read stdin JSON and extract the command field
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Fallback: if jq is not available, try grep-based extraction
if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Only proceed if this was a git commit command
echo "$COMMAND" | grep -q 'git commit' || exit 0

# Gather commit data (all with error suppression)
HASH=$(git -C "$ROOT" log -1 --format='%H' 2>/dev/null)
MSG=$(git -C "$ROOT" log -1 --format='%s' 2>/dev/null)
TIME=$(git -C "$ROOT" log -1 --format='%aI' 2>/dev/null)
STAT=$(git -C "$ROOT" diff --stat HEAD~1..HEAD 2>/dev/null || echo '(first commit or diff unavailable)')

# Write pending commit data
printf 'commit: %s\nmessage: %s\ntime: %s\nfiles:\n%s\n' \
  "$HASH" "$MSG" "$TIME" "$STAT" > "$ROOT/.dev-wiki/.pending-commit"

# Append to session buffer
printf '\n---\ncommit: %s\nmessage: %s\ntime: %s\nfiles:\n%s\n' \
  "$HASH" "$MSG" "$TIME" "$STAT" >> "$ROOT/.dev-wiki/.session-buffer"

echo "[dev-wiki:post-commit] Commit recorded: $MSG"
