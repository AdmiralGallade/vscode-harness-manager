---
name: dev-check
description: "Validate dev wiki integrity and fix drift. Run when state feels stale, after long breaks, or when drift warnings appear. Do NOT use for knowledge wiki health (use wiki-lint) or for session startup (use AGENTS.md)."
reads: [$WIKI/_CURRENT_STATE.md, $WIKI/_ARCHITECTURE.md, $WIKI/tasks.md, $WIKI/articles/phases/*, $WIKI/index.md, $ROOT/.claude/rules/active-phase.md, $ROOT/.claude/rules/active-knowledge.md, $ROOT/.claude/rules/working-knowledge.md]
writes:
  # Tier 1 — auto-apply
  - index.md
  - $ROOT/.claude/rules/active-phase.md
  - $ROOT/.claude/rules/active-knowledge.md
  # Tier 2 — user-gated
  - _CURRENT_STATE.md(Active Phase)
  - articles/phases/*(frontmatter status)
  - tasks.md(completed phase [x])
dispatches: []
tier: simple-orchestration
---

# dev-check

Diagnose dev wiki structural integrity and state consistency, then offer to auto-fix issues. Two phases: DIAGNOSE (read-only) then REPAIR (user-gated). Single-agent, 9 core checks.

---

## When to Use

- State feels stale or inconsistent after a long break
- After manual edits to `.dev-wiki/` files
- Before starting a new phase (sanity check)
- Periodically, as general wiki hygiene

---

## Pre-checks

1. Locate project root: `ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)`. Check `$ROOT/.dev-wiki/_CURRENT_STATE.md`. If missing: "No dev wiki found. Run `/dev-init`." STOP.
2. Set `WIKI=$ROOT/.dev-wiki`.

---

## Phase 1: DIAGNOSE (read-only)

Run all 9 checks. Use Glob for file discovery, Read for content — never Bash find/ls/cat. If any check fails to execute, skip it with `SKIPPED: <reason>`. Collect findings: ERROR, WARNING, INFO.

### Structural Checks

**S1: Active phase exists**
Read `_CURRENT_STATE.md`, extract `[[phase-slug|...]]` from `## Active Phase`. Glob `articles/phases/<phase-slug>.md` to verify it exists on disk. No active phase referenced = pass.
Severity: ERROR

**S2: active-phase.md sync**
Read `$ROOT/.claude/rules/active-phase.md`, extract `Phase:` field. Compare against active phase in `_CURRENT_STATE.md`. Must match.
Severity: ERROR

**S4: Single active phase**
Glob `articles/phases/*.md`, read each frontmatter. Count `status: active`. 0 or 1 = valid. >1 = error.
Severity: ERROR

**S7: Index completeness**
Read `index.md`, extract listed article paths. Glob `articles/**/*.md` for files on disk. Report phantoms (in index, not on disk) and missing (on disk, not in index).
Severity: WARNING

**S10: Active knowledge phase match**
Read `$ROOT/.claude/rules/active-knowledge.md` (skip if absent). Extract `## Phase: N` line. Compare against active phase in `_CURRENT_STATE.md`. Mismatch = error.
Severity: ERROR

### State Consistency Checks

**C1: Task-phase alignment**
Read `tasks.md`, extract phase section headers. For each, verify the phase article exists in `articles/phases/` via Glob.
Severity: ERROR

**C2: Completed phase tasks**
For each phase article with `status: completed`, check its tasks.md section. All tasks should be `[x]`. Flag `[ ]` or `[blocked:` in completed phases.
Severity: WARNING

**C7: Zombie active phase**
For each phase article with `status: active`, check its tasks in `tasks.md`. If ALL tasks are `[x]`, flag as zombie — should have been marked completed.
Severity: WARNING

### Working Knowledge Check

**W1: Working knowledge entry count**
Read `$ROOT/.claude/rules/working-knowledge.md` (skip if absent). Count `- [uses:` lines. If >100, flag.
Severity: WARNING

### Cognitive Load Check

**CL1: Per-invocation line count**
For each skill dir in `~/.claude/skills/dev-{plan,debrief,init,scan,check,wiki}/`: count lines in SKILL.md + all companion .md files (`wc -l *.md`). Report total. Flag any skill exceeding 600 lines (lite-mode cognitive load threshold, informed by context degradation research).
Severity: WARNING

### Diagnosis Output

```
Dev Wiki Health Check

ERRORS (must fix):
  <check-id>: <description>

WARNINGS (should fix):
  <check-id>: <description>

Summary: N errors, M warnings
```

Omit empty buckets. If all pass: "All checks passed. Wiki is consistent."

---

## Phase 2: REPAIR (user-gated)

If 0 errors and 0 warnings, skip: "No fixes needed." STOP.

### Tier 1 — Auto-apply (deterministic, safe)

| Fix | Trigger | Action |
|-----|---------|--------|
| Rebuild index.md | S7 phantoms/missing | Regenerate from articles on disk |
| Sync active-phase.md | S2 mismatch | Rewrite from phase article (source of truth) |
| Delete mismatched active-knowledge | S10 mismatch | Delete file; `/dev-plan` regenerates |

Report: `[ok] <description>`

### Tier 2 — User approval required

| Fix | Trigger | Action |
|-----|---------|--------|
| Mark zombie phase completed | C7 | Set `status: completed` in frontmatter |
| Complete phase tasks | C2 | Mark remaining tasks `[x]` in completed phases |
| Create missing phase article | S1 | Scaffold from tasks.md header |
| Prune working-knowledge | W1 | Remove lowest-count entries to 100 |

Present numbered options. User responds: "all" / numbers / "skip".

After repairs, append to `log.md`: `[<timestamp>] CHECK -- N errors, M warnings fixed`

---

## Integration

`/dev-context` (now AGENTS.md) runs fast-lint at session start: S1, S2, S4, C1 only. `/dev-check` is the full 9-check diagnostic, invoked explicitly.

---

## Tool Standards

- **Glob** for file discovery (not find/ls via Bash)
- **Grep** for content search (not grep/rg via Bash)
- **Read** for reading files (not cat/head/tail via Bash)
- **Bash** reserved for git and system commands with no dedicated tool
