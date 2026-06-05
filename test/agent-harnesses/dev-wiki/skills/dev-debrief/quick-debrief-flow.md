# Quick Debrief Flow (Score < 5)

Companion to dev-debrief SKILL.md. Contains the full quick-debrief procedure (QD Steps 1-6). Loaded when significance score < 5.

### QD Step 1: Update tasks.md
Use the Read tool on `$WIKI/tasks.md`. Cross-reference with session buffer commits and conversation to mark completed tasks `[x]`. Add any discovered tasks.

### QD Step 2: Append 3-Line Journal Entry
Create a minimal journal entry at `$WIKI/articles/journal/<today>-<slug>.md`. Read `~/.claude/skills/dev-wiki/journal-templates.md` for the quick journal template and `~/.claude/skills/dev-wiki/slugification.md` for the slugification algorithm.

### QD Step 3: Refresh _CURRENT_STATE.md Next Action
Use the Read tool on `$WIKI/_CURRENT_STATE.md`. Update ONLY `## Recommended Next Action` and the `> Last updated` timestamp. Do not rewrite the entire file.

### QD Step 3a: Architecture Staleness Detection
Run the same check as full debrief Step 9a (compare skill file mtimes against `_ARCHITECTURE.md` `Last updated` timestamp). Emit warning if stale.

### QD Step 4: Append to log.md
`[<ISO-timestamp>] DEBRIEF-QUICK -- tasks updated, quick journal, next action refreshed`

### QD Step 5: Clean Up Breadcrumbs
```bash
rm -f "$WIKI/.pending-commit" "$WIKI/.session-buffer" "$WIKI/.session-end"
```

### QD Step 6: Report to User
`Quick debrief done. Tasks: X completed, Y remaining. Next: "<next action>"`
