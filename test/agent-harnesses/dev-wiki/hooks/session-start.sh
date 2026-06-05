#!/bin/bash
# session-start.sh (SessionStart)
# Checks dev-wiki and knowledge-wiki state at session start,
# emitting context hints for Claude to act on.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# --- Dev Wiki checks ---
if [ -d "$ROOT/.dev-wiki" ]; then
  echo '[dev-wiki] Development lifecycle system active.'
  echo ''
  echo 'SESSION START: Read .dev-wiki/AGENTS.md and follow its session-start protocol to auto-load project state.'
  if [ -f "$ROOT/.dev-wiki/.session-end" ]; then
    echo '[dev-wiki] Previous session ended. Unprocessed state available.'
  elif [ -f "$ROOT/.dev-wiki/.pending-commit" ]; then
    echo '[dev-wiki] Unprocessed commit data from previous session.'
  fi
fi

# --- Knowledge Wiki checks ---
if [ -d "$ROOT/wiki" ] && [ -f ~/.claude/skills/knowledge-wiki/session-context.md ]; then
  cat ~/.claude/skills/knowledge-wiki/session-context.md 2>/dev/null
else
  echo '[knowledge-wiki] No wiki found. If this project involves learnings, patterns, or domain knowledge worth preserving, consider running /wiki-init.'
fi

exit 0
