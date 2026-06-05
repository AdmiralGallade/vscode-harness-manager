# Dev Wiki Implementation Discipline

## Task Workflow
Before writing ANY implementation code:
1. Verify tasks.md has open tasks for the active phase
2. Pick the NEXT uncompleted task (work in order)
3. State which task you are working on
4. Follow the TDD cycle in the task description (RED -> GREEN -> REFACTOR -> VERIFY)
5. VERIFY: Tiered verification sequence (tiered, cheapest first):
   a. **Precondition check:** Task has a `success:` field. If absent, emit "No success: field — verification skipped" and proceed to 5.5.
   b. **Structural checks (Tier 0):** If success field includes file-existence or schema checks, run those first. These are cheapest and catch format errors early.
   c. **Referential checks (Tier 1):** If success field includes cross-reference or link-integrity checks, run next. These catch broken dependencies.
   d. **Behavioral checks (Tier 2):** Run remaining success field commands (functional correctness, test pass).
   e. **Regression check:** If prior tasks in this phase have cheap success criteria (file-existence, grep), re-run them to verify no regressions. Skip expensive checks (test suites, builds). If any regression found, fix before proceeding.
   - If all tiers pass → proceed to step 6
   - If any fail → fix the issue and re-run the failed tier
   - Compose tiers with `&&` in success criteria for single-command verification
6. When done, mark it [x] in tasks.md BEFORE moving to next
7. After ALL tasks in the active phase are marked [x], run the Post-Implementation Self-Check from `~/.claude/skills/dev-plan/implementation-guide.md`, then proceed to `/dev-debrief` (which includes a size-gated review gate: L/Standard phases get unified reviewer dispatch; S/M Lite phases rely on self-check as the quality gate). Standard: all 7 self-check categories; Lite: categories 1-2 only. Fix findings inline; escalate after 3 attempts per finding.

## Blocked Tasks
After 3 failed attempts on a task:
1. Mark it [blocked: what failed] in tasks.md
2. Ask the user: skip or abort phase
3. Do NOT silently skip or move to the next task

The 3-attempt counter is shared across the entire task lifecycle (RED + GREEN + VERIFY). It does NOT reset at VERIFY entry.

Severity guides response urgency: if the blocked task involves shared state or irreversible actions, escalate immediately rather than exhausting all 3 attempts. If the task is isolated and low-risk, use all 3 attempts with different approaches.

## Escape Hatches (explain in commit message when used)
- SECURITY: Fix a vulnerability immediately, log as unplanned task
- DEPENDENCY: Do prerequisites first, add to tasks.md retroactively
- USER OVERRIDE: Follow explicit user instructions, note the deviation
- DISCOVERY: Add preconditions discovered during implementation

## Knowledge Routing

When an obstacle surfaces a reusable insight (applicable across projects), use `/wiki-capture` to send it to the knowledge wiki inbox. When the finding is project-specific lifecycle context (blocked-task reason, scope-shift rationale), it belongs in the dev-wiki journal — captured automatically at next `/dev-debrief`.

## Safety Awareness

When an action could affect shared state (git push, file deletion, external API calls), verify the action matches the current task scope. If the action seems disproportionate to the task, pause and confirm with the user. Reference: `/dev-harness H6` for full safety layer audit.

## Do NOT
- Work on tasks out of order without an escape hatch reason
- Add scope beyond tasks.md (suggest for next /dev plan instead)
- Start a new phase without running /dev plan first
- Start implementing without open tasks (run /dev plan first)

## Hook Responses
When you see [dev-wiki:post-commit]:
1. Read .dev-wiki/.pending-commit
2. Check tasks.md — mark matching tasks [x]
3. Continue with user's work (don't launch full wiki update)

When you see [dev-wiki:stop]:
1. If /dev debrief was NOT run, remind user:
   "Consider running /dev-debrief to capture this session's work."

When you see [dev-wiki:scope-check]:
The hook emits two distinct warnings:

**"No open tasks in tasks.md"** — no `- [ ]` tasks exist at all:
1. STOP and tell the user: "No open tasks in tasks.md. Run /dev-plan to create a plan before implementing."

**"<file> is outside active task scope"** — file doesn't match the current task's `scope:` globs:
1. Pause and verify you are working on the correct task
2. False positives to continue through: test files matching a scope pattern, config files modified as side effects, files in .dev-wiki/ or .claude/rules/ or wiki/ (auto-allowed by hook)
3. If NOT a false positive (genuinely out-of-scope edit), note the deviation and consider whether the task scope needs updating or you are drifting

When significant architectural decisions are made during planning:
1. Suggest: "We made key decisions. Want me to run /dev debrief to capture them?"

## Post-Compaction Recovery
After context compaction:
1. Re-read .dev-wiki/_CURRENT_STATE.md and .dev-wiki/tasks.md
2. Find the next uncompleted task in tasks.md for the active phase
3. Parse its enriched fields (TDD cycle, scope, success criteria, size)
4. Read .claude/rules/active-phase.md for phase constraints
5. State: "Resuming task: <description>. Scope: <scope>. TDD: <test spec>."
6. If task reached GREEN/REFACTOR but is not marked [x], re-enter at VERIFY (run success: field) rather than re-implementing
7. Continue implementation from that task, following the TDD cycle
