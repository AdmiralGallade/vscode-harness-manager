# dev-debrief — Architecture Staleness Detection

Companion to `SKILL.md` Step 9a. Check whether `_ARCHITECTURE.md` may have drifted during this session. This catches a known blind spot: skill files at `~/.claude/skills/` and the companion files under `~/.claude/skills/dev-wiki/` are outside the project root, so the stale-queue hook cannot track them. See [[architecture-drift-root-cause]].

## Procedure

1. Parse `> Last updated:` timestamp from `$WIKI/_ARCHITECTURE.md`.
2. Use Bash `stat` to get the modification time of each skill file that the architecture doc references (Glob `~/.claude/skills/dev-*/SKILL.md`, `~/.claude/skills/dev-scan/*.md`, `~/.claude/skills/dev-wiki/*.md`).
3. If ANY skill file has a modification time **after** the architecture doc's `Last updated` timestamp, emit:
   ```
   WARNING: _ARCHITECTURE.md may be stale — skill files modified after last scan.
   Modified: <list of files with newer mtimes>
   Run /dev-scan to refresh _ARCHITECTURE.md.
   ```
4. If no skill files are newer, skip silently.

## Mode Coverage

This check runs in both full and quick debrief modes (add after QD Step 3 for quick mode).
