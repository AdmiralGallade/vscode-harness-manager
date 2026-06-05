# Dev-Wiki Agent Lifecycle

Portable protocol for projects with `.dev-wiki/`. Follow at session start automatically — no explicit command needed.

## Session Start

Read silently (inject into context, do NOT print contents to user):
1. `.dev-wiki/_CURRENT_STATE.md` — project state, active phase, next action, decisions
2. `.dev-wiki/tasks.md` — active phase section (locate via `<!-- phase:phase-NN-... -->` comment)
3. `.claude/rules/active-phase.md` — phase constraints and scope (compaction anchor)
4. `.claude/rules/active-knowledge.md` — phase-scoped wiki knowledge (skip if absent)

**Breadcrumbs:** If `.dev-wiki/.pending-commit` exists: read it, match committed files against open tasks in tasks.md, mark matching tasks `[x]`, delete the file. If `.dev-wiki/.session-end` exists: delete it (prior session ended without debrief — note to user). If `.dev-wiki/.stale-queue` exists and non-empty: emit "Stale queue has N entries — run `/dev-scan`." Do not auto-process.

## Planning Detection

Count task states (`- [ ]` open, `- [x]` done, `- [blocked:` blocked) in the active phase section:

| Open | Done | Suggest |
|------|------|---------|
| 0 | 0 | "Phase needs planning. Run `/dev-plan`." |
| 0 | >0 | "Phase may be complete. Run `/dev-debrief` then `/dev-plan`." |
| >0 | any | "Continue implementation. X/Y tasks remaining." |

## Context Summary

**Planning mode** (no open tasks):
```
[dev-wiki] Project state loaded.
NEXT ACTION: <from _CURRENT_STATE.md Recommended Next Action>
ACTIVE PHASE: <title> | TASKS: <done>/<total>
PLANNING: <suggestion from detection above>
```

**Execution mode** (has open tasks — the common case):
```
[dev-wiki] Execution mode. Resuming <phase title>.
NEXT TASK: <first open task description>
  SCOPE: <file globs from task>
  SUCCESS: <testable criterion from task>
PROGRESS: <done>/<total> tasks
Work this task following TDD (RED → GREEN → REFACTOR). Mark [x] in tasks.md when done.
BLOCKED: After 3 failed attempts → mark [blocked:] in tasks.md, ask user.
```

## Compaction Recovery

After context compaction, re-read `.claude/rules/active-phase.md` and `.dev-wiki/tasks.md`. Find next uncompleted task. State: "Resuming task: \<description\>. Scope: \<scope\>."

**Commands:** `/dev-plan` plan · `/dev-debrief` capture · `/dev-check` validate · `/dev-scan` analyze · `/dev-init` bootstrap
