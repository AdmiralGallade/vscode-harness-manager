# Debrief Finalization — Steps 11, 13, 14, and 15

Companion file for dev-debrief SKILL.md. Contains mechanical finalization steps that run during full debrief. Read at two points: Step 11 (before Step 12), and Steps 13-15 (after Step 12b). Step 12 (active-phase.md rewrite) is handled inline in SKILL.md.

**Variables:** `$WIKI = $ROOT/.dev-wiki`, `$ROOT = project root` (defined in SKILL.md Step 2).

---

## Step 11: Create Status Snapshot

Use the Glob tool to check if `$WIKI/articles/status/$(date +%Y-%m-%d)-codebase-snapshot.md` exists. If none, create one with file metrics, module structure, dependency versions, test status, and recent commits (last 5 from `git log`).

**Scan article integration:** If `$WIKI/articles/status/*-scan.md` files exist from a prior `/dev-scan`, reference them in the snapshot rather than duplicating their content. The snapshot should summarize scan findings (module count, issue counts, hub modules), not replicate the full dependency maps.

Read `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

## Step 13: Rebuild index.md *(Lite: skip)*

Use the Glob tool to scan all files under `$WIKI/articles/`. Rebuild `$WIKI/index.md` with By Category, By Hierarchy, and Recent sections. Sort phases by numeric prefix, journal/status by date descending. Recent: last 10 articles by date.

## Step 14: Append to log.md

`[<ISO-timestamp>] DEBRIEF -- <N> decisions, 1 journal, tasks updated, state refreshed`

## Step 15: Clean Up Breadcrumbs

```bash
rm -f "$WIKI/.pending-commit" "$WIKI/.session-buffer" "$WIKI/.session-end"
```
