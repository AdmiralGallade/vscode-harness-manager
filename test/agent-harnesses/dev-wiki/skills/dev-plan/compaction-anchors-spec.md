# Compaction Anchors and Error Handling

Companion to `dev-plan/SKILL.md`. Behavioral reference for compaction anchor design and error handling. Steps 8f-8g in SKILL.md contain the orchestration logic; this companion provides the specification and rationale.

---

## Anchor Types

Three anchors survive context compaction and restore session state:

### 1. Phase Context Anchor — `active-phase.md`

**Location:** `$ROOT/.claude/rules/active-phase.md` (rules layer, auto-loaded every turn)
**Owner:** `/dev-plan` (writes), `/dev-debrief` (updates status)
**Contents:** Phase number, objective, scope (file globs), key constraints, exit criteria, abort rule.
**Budget:** 10-15 lines, ~50 tokens/turn.

The agent reads this after compaction to know what phase it is in and what constraints apply, without re-reading the full phase article.

### 2. Knowledge Anchor — `active-knowledge.md`

**Location:** `$ROOT/.claude/rules/active-knowledge.md` (rules layer, auto-loaded every turn)
**Owner:** `/dev-plan` (writes at Step 8f-bis)
**Contents:** 2-5 distilled knowledge propositions from cross-wiki retrieval, each passing 2-of-3 activation filters (multi-turn, non-obvious, phase-dependent).
**Budget:** 20-30 lines, ~150 tokens/turn. Hard cap: 40 lines.

Prevents the agent from losing phase-specific domain knowledge after compaction. Facts that fail the phase-dependent filter but pass multi-turn + non-obvious are candidates for working-knowledge instead.

### 3. Task State Anchor — TodoWrite

**Location:** Harness-managed task list (re-injected automatically after compaction)
**Owner:** `/dev-plan` (creates at Step 8g), implementation workflow (updates status)
**Contents:** Each task description embeds scope, constraints, and TDD cycle.
**Budget:** ~8 tasks, ~100 tokens/turn.

## Size Budgets

| Anchor | Target Lines | Hard Cap | Per-Turn Cost |
|--------|-------------|----------|---------------|
| `active-phase.md` | 10-15 | 20 lines | ~50 tokens |
| `active-knowledge.md` | 20-30 | 40 lines | ~150 tokens |
| TodoWrite tasks | N/A | ~8 tasks | ~100 tokens |
| **Combined** | | | **~300 tokens/turn** |

Design principle: every line must carry information the agent cannot derive from code or git history. Phase identity: yes. Full task list: no (use TodoWrite). Architecture overview: no (read the file).

## Recovery Protocol

After context compaction, the agent restores working context in ~5 tool calls:

1. **Read** `active-phase.md` — phase identity, scope, constraints
2. **Read** `_CURRENT_STATE.md` — project state, next action, blockers
3. **Read** `tasks.md` — find next uncompleted task for active phase
4. **Read** `active-knowledge.md` — domain knowledge for current phase
5. **Check** TodoWrite — in-progress task state

This sequence fully restores working context. The agent then states: "Resuming task: <description>. Scope: <scope>. TDD: <test spec>."

## Error Handling

| Error | Response |
|-------|----------|
| No `.dev-wiki/` | "Run `/dev init` first." STOP. |
| Open tasks exist | "Phase N has X open tasks. Continue implementation." STOP. |
| User rejects approach | Revise and re-present (max 3 rounds). |
| No phases defined | "Run `/dev init`." STOP. |
| Approach reviewer timeout | Proceed without critique. Warn: "Approach reviewer unavailable." |
| Plan reviewer timeout | Accept draft tasks without review score. Warn: "Plan reviewer unavailable." |
| active-knowledge >40 lines | Skip writing. Report: "Active knowledge exceeds 40-line cap. Skipping." |
| working-knowledge >100 entries or >210 lines | Evict lowest-count entries (ties: oldest activated date) until within cap. |
| active-knowledge.md absent at recovery | Skip Step 4 in recovery protocol. Warn: "No active-knowledge.md — domain knowledge may be stale." |
