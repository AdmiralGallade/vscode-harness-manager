# claude-md-lifecycle.md

Lifecycle specification for the project-level `./CLAUDE.md` — ownership, refresh triggers, update scope, size guard, and lifecycle stages. Consumed by `dev-debrief` (refresh check) and `dev-init` (scaffold).

## Project CLAUDE.md Lifecycle

Defines how the project-level `./CLAUDE.md` is maintained through the dev-wiki lifecycle. The project CLAUDE.md is scaffolded once by `/dev-init` and then must be kept in sync as rules, scope, and conventions evolve across phases.

### Ownership

**Primary owner:** `/dev-debrief` — performs a periodic refresh check at full-debrief Step 8.5. Reads the current project CLAUDE.md and compares machine-generated sections against actual state. If drift detected, refreshes those sections only.

**Scaffolder:** `/dev-init` — creates the initial file from `scaffold-claude-md.md` template. Never touches it again after creation.

**All other skills:** Read-only. No skill other than `/dev-debrief` may write to project CLAUDE.md.

### Triggers for Refresh

A `/dev-debrief` refresh check fires when ANY of:
1. `.claude/rules/` has modules added or removed since last refresh (compare file list against `## Project Rule Modules` section)
2. Project scope or identity changed (new primary language, renamed project, shifted purpose)
3. `## Project Pointers` section references stale paths (wiki directory moved, skill directory renamed)
4. User explicitly requests: "refresh CLAUDE.md"

If no trigger fires, skip the refresh (most debriefs will skip).

### Update Scope — Human vs Machine Sections

Project CLAUDE.md has two kinds of content. Refresh MUST NOT touch human-authored sections.

```markdown
<!-- human-authored: do not auto-refresh -->
## Identity                    <!-- written once by user/dev-init; never auto-updated -->
## Precedence                  <!-- written once; never auto-updated -->

<!-- machine-refreshable: dev-debrief may update -->
## Project Rule Modules        <!-- derived from ls .claude/rules/*.md -->
## Dynamic State               <!-- derived from ls .claude/rules/active-*.md + working-knowledge.md -->
## Project Pointers            <!-- derived from directory existence checks -->
## Project Scope               <!-- partially machine: primary language, wiki name; partially human: purpose prose -->
```

### Size Guard

Project CLAUDE.md MUST stay ≤80 lines after any refresh (harness composition invariant). If a refresh would push past 80 lines, `/dev-debrief` MUST warn: "CLAUDE.md refresh would exceed 80-line cap. Skipping auto-refresh; consider manual edit to trim." and skip the refresh.

### Lifecycle Stages

```
/dev-init (scaffold) → user edits Identity/Precedence → phases run → /dev-debrief (periodic refresh of machine sections) → compaction (Layer 2 survival) → next session (/dev-context loads)
```

The project CLAUDE.md survives context compaction as Layer 2 (project rules). It is re-read at every session start. This makes it the most persistent project-level artifact after `.dev-wiki/` itself.
