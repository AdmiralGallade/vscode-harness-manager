#!/bin/bash
# session-stop.sh (Stop)
# Saves session breadcrumb for dev-wiki and emits knowledge-wiki reminder.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# --- Dev Wiki breadcrumb ---
if [ -d "$ROOT/.dev-wiki" ]; then
  ENDED=$(date -u +%Y-%m-%dT%H:%M:%S)
  RECENT=$(git -C "$ROOT" log --oneline -5 2>/dev/null || echo 'no git')
  PENDING=$([ -f "$ROOT/.dev-wiki/.pending-commit" ] && echo 'yes' || echo 'no')
  BUFFER=$([ -f "$ROOT/.dev-wiki/.session-buffer" ] && echo 'yes' || echo 'no')
  DEBRIEFED=$(grep -q "$(date +%Y-%m-%d).*DEBRIEF" "$ROOT/.dev-wiki/log.md" 2>/dev/null && echo 'yes' || echo 'no')

  printf 'ended: %s\npending_commit: %s\nsession_buffer: %s\ndebriefed: %s\nrecent_commits:\n%s\n' \
    "$ENDED" "$PENDING" "$BUFFER" "$DEBRIEFED" "$RECENT" > "$ROOT/.dev-wiki/.session-end"

  echo '[dev-wiki:stop] Session breadcrumb saved.'
fi

# --- Project Wiki reminder ---
if [ -d "$ROOT/wiki" ] && [ -d "$ROOT/wiki/articles" ]; then
  echo '[knowledge-wiki] Session ending. Review your recent work for uncaptured learnings. Run /wiki-capture in your next session to preserve insights.'
fi

exit 0
