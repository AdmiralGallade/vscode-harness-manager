# Project CLAUDE.md Refresh Check

Companion for dev-debrief Step 8.5. Checks whether the project-level `./CLAUDE.md` needs refreshing and performs the refresh if triggered. See `~/.claude/skills/dev-wiki/claude-md-lifecycle.md` for the full convention.

## Scope

- **Reads:** `$ROOT/CLAUDE.md` (the project CLAUDE.md, not the global `~/.claude/CLAUDE.md`)
- **Writes:** `$ROOT/CLAUDE.md` (machine-refreshable sections only)
- **Skip if:** no `$ROOT/CLAUDE.md` exists (not all projects have one)

## Procedure

1. **Read** `$ROOT/CLAUDE.md`. If the file does not exist, skip this entire procedure silently.

2. **Check triggers** (any one is sufficient to proceed with refresh):
   - **Rules changed:** Compare `ls $ROOT/.claude/rules/*.md 2>/dev/null` against the file list in `## Project Rule Modules`. If files were added or removed, trigger fires.
   - **Scope changed:** If the project's primary language, wiki name, or major scope description has changed (compare `## Project Scope` or `## Identity` against current `$WIKI/schema.md` identity fields). This check is heuristic — only fire on clear mismatches.
   - **Pointers stale:** Check paths referenced in `## Project Pointers` (e.g., `.dev-wiki/`, `wiki/`, `~/.claude/skills/...`). If a referenced path no longer exists, trigger fires.
   - **User request:** The user explicitly asked to refresh CLAUDE.md (passed as context by dev-debrief).

3. **If no trigger fires:** Skip. Report: `"CLAUDE.md: no refresh needed."` Return.

4. **Refresh machine sections only.** Rewrite these sections from current state:
   - `## Project Rule Modules` — regenerate from `ls $ROOT/.claude/rules/*.md`, **excluding** dynamic files (`active-*.md`, `working-knowledge.md`) which belong in Dynamic State.
   - `## Dynamic State` — regenerate from `ls $ROOT/.claude/rules/active-*.md` and `$ROOT/.claude/rules/working-knowledge.md`
   - `## Project Pointers` — regenerate from directory existence checks (`$ROOT/.dev-wiki/`, `$ROOT/wiki/`, etc.)
   - `## Project Scope` — refresh **only** machine sub-fields (primary language, wiki name) by comparing against `$WIKI/schema.md`. Leave human-authored purpose prose untouched.
   
   **NEVER touch** `## Identity` or `## Precedence`. For `## Project Scope`, only refresh the machine sub-fields listed above — do NOT rewrite purpose prose.

5. **Size guard.** Count lines of the refreshed file. If >80 lines: warn `"CLAUDE.md refresh would exceed 80-line cap (currently N lines). Skipping auto-refresh; consider manual edit to trim."` and revert to the original file content. Do NOT write the oversized version.

6. **Write** the refreshed `$ROOT/CLAUDE.md`. Report: `"CLAUDE.md refreshed: <sections updated>."` 
