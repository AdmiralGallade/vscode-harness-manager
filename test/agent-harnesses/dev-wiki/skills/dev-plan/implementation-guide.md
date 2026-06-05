# Implementation Guide

Extracted from dev-plan Step 10. Read when the user chooses option A or C in Step 9.

## Option A: Continue in This Session

Follow TDD cycle embedded in each task: RED (write test, verify fail) -> GREEN (implement, verify pass) -> REFACTOR -> VERIFY (run `success:` field commands; iterate if fail; if no `success:` field, emit "No success: field — verification skipped"). Mark `[x]` in `tasks.md` only after VERIFY passes, before moving to next task.

**Deviation & Escalation Protocols:** Permitted deviations from plan (explain in commit message): **SECURITY** (fix vulnerability immediately), **DEPENDENCY** (do prerequisite first), **USER OVERRIDE** (follow user, note deviation), **DISCOVERY** (add precondition to tasks.md). After 3 failed attempts on a task: mark `[blocked: <what failed>]` in `tasks.md`. Ask user: skip or abort phase. Do NOT silently skip.

**After all tasks marked [x]:** Run the Post-Implementation Self-Check (below) before proceeding to `/dev-debrief`.

## Option C: Subagent-Driven Parallel

Identify tasks with disjoint file sets. Construct enriched prompts per task with scope, constraints, success criteria, and TDD cycle.

**Error handling:** Set a 120-second timeout per subagent. Collect all results before applying. Check for file conflicts (multiple subagents writing the same file) — if conflicts found, report to user and apply non-conflicting results only. Report individual subagent failures: "Task N failed: [error]. Remaining tasks succeeded." Do NOT retry failed subagents automatically.

**Success-criterion validation:** Before marking any task complete, run its `success:` field commands. If a subagent's success criterion fails, report to user — do NOT auto-iterate (subagent isolation requires re-dispatch, which is the user's choice).

After all complete, update `tasks.md`, run full test suite, resolve conflicts.

**After all tasks marked [x]:** Run the Post-Implementation Self-Check (below). For Option C, report self-check findings to the user rather than auto-iterating — consistent with Option C's no-auto-retry constraint.

---

## Eval-Driven Development (Optional)

If your project uses eval-driven development (`.claude/evals/` directory exists):

1. **Before implementing each task:** Check if capability eval criteria should be defined for the changed functionality. Write eval definitions before code per EDD principles.
2. **After completing tasks:** Run regression baseline check if `baseline.json` exists. Compare pass rates and cost against thresholds.
3. **Reference:** `/eval` skill for eval definition, run, and report commands. See `~/.claude/skills/eval-harness/eval-patterns.md` for metric taxonomy and threshold templates.

Skip this section if the project has no `.claude/evals/` directory.

---

## Post-Implementation Self-Check *(Lite: simplified — categories 1-2 only)*

Runs after the last task in the active phase is marked `[x]`, before `/dev-debrief`. Purpose: catch mechanical and cross-layer issues that per-task VERIFY cannot detect (cross-file consistency, metadata completeness, convention alignment).

### Procedure

1. **Read** `~/.claude/skills/dev-plan/self-check-checklist.md` for the full checklist.
2. **Determine ceremony level.** Standard: run all 7 categories. Lite: run categories 1-2 only (cross-reference resolution + line count vs budget).
3. **Identify scope files.** Collect all files modified during this phase (from task `scope:` fields and any DISCOVERY additions).
4. **Run each category's checks** against the scope files. Record findings as: `[category] <file>: <issue>`.

### Handling Findings

**Option A (auto-iterate):**
1. Fix each finding inline using Edit tool.
2. Re-run the checklist category that had findings.
3. Repeat until clean OR 3 fix attempts per finding exhausted.
4. After 3 failed attempts on a finding: surface to user — `"Self-check finding unfixable after 3 attempts: <finding>. Options: (a) fix manually, (b) accept with acknowledged gap."` Do NOT silently drop findings.

**Option C (report to user):**
1. Collect all findings across all categories.
2. Report to user as a structured list: `"Self-check found N issues across M categories: <list>."`
3. User decides which to fix. Do NOT auto-iterate.

### When Self-Check Passes

Report: `"Self-check clean (N categories, M files checked). Ready for /dev-debrief."` Proceed to `/dev-debrief` (S/M Lite phases: pass-through; L/Standard phases: reviewer dispatch).

### Skip Conditions

- Phase has 0 completed tasks (nothing to check).
- User explicitly requests skip: `"Skipping self-check per user request."` Proceed to `/dev-debrief`.
