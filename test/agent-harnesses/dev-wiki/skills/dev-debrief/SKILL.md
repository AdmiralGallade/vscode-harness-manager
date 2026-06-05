---
name: dev-debrief
description: "Use when a session ends with meaningful work. Tiered capture: full (30-60s) or quick (10-15s) mode. Do NOT use at session start (use dev-context) or to fix wiki structural issues (use dev-check)."
reads: [$WIKI/_CURRENT_STATE.md, $WIKI/_ARCHITECTURE.md, $WIKI/tasks.md, $WIKI/articles/phases/*, $ROOT/CLAUDE.md]
writes: [$WIKI/_CURRENT_STATE.md(Next Action, Journal, Key Artifacts, Cross-References), $WIKI/articles/journal/*, $WIKI/articles/decisions/*, $WIKI/log.md, $WIKI/index.md, $ROOT/.claude/rules/active-knowledge.md, $ROOT/.claude/rules/working-knowledge.md, $ROOT/CLAUDE.md]
dispatches: [unified-reviewer]
tier: complex-orchestration
---

# dev-debrief

Tiered session capture. Auto-detects session significance to choose between a full debrief (30-60s) or a quick debrief (10-15s). Full mode analyzes the conversation, extracts architectural decisions, creates a rich journal entry, and refreshes every living document. Quick mode updates tasks, writes a 3-line journal, and refreshes the next action.

This is a **single-agent skill** -- Claude does all work directly. No subagents.

---

## Section Ownership — _CURRENT_STATE.md

This skill OWNS and rewrites these sections (preserve all others verbatim):
- `## Recommended Next Action`
- `## Session Journal (last 5)`
- `## Key Artifacts`
- `## Cross-References`

Quick debrief: updates ONLY `## Recommended Next Action` and the `> Last updated` timestamp.
Full debrief: rewrites all 4 owned sections. Preserve Active Phase, Contract, Decisions, and Blockers verbatim.

---

## When to Use

- Before ending a meaningful development session
- Before context window gets full (~75% usage)
- After completing a significant piece of work
- Before a long break

**Not needed when:** The session was purely conversational with no code changes or decisions.

---

## Pre-checks

**Ceremony level:** Read `$WIKI/config.md` for `ceremony:` (lite|standard). Phase frontmatter overrides. Default: lite. Steps marked *(Lite: skip)* or *(Lite: simplified)* below are affected.

1. **Discover dev wiki.** Run `git rev-parse --show-toplevel 2>/dev/null || pwd` to find `$ROOT`. Check if `$ROOT/.dev-wiki/` exists. If not: "No dev wiki found. Run `/dev-init` to set one up." STOP.

2. **Verify living documents.** Use the Glob tool to check for `_CURRENT_STATE.md`, `_ARCHITECTURE.md`, `tasks.md`, `index.md`, and `log.md` under `.dev-wiki/`. Note any missing ones -- they will be created fresh.

3. **Ensure article directories exist:**
   ```bash
   mkdir -p "$ROOT/.dev-wiki/articles/decisions" "$ROOT/.dev-wiki/articles/journal" "$ROOT/.dev-wiki/articles/phases" "$ROOT/.dev-wiki/articles/status"
   ```

---

## Step 1: Significance Detection

Scan the conversation context and session buffer for these signals:

| Signal | Points |
|--------|--------|
| Decisions detected in conversation | +3 each |
| Commits made this session | +1 each |
| Architectural changes (new modules, changed dependencies, structural reorg) | +5 |
| Blocked tasks (tasks marked `[blocked:` this session) | +2 each |
| Phase transition (phase status changed this session) | +5 |
| Session >30 minutes (estimate from conversation length/depth) | +2 |
| <5 tool calls total in session | -3 |

| Score | Mode | Time Budget |
|-------|------|-------------|
| >= 5 | Full debrief | 30-60 seconds |
| < 5 | Quick debrief | 10-15 seconds |

Report: "Significance score: N. Running [full/quick] debrief."

---

## Quick Debrief Flow (Score < 5)

Read `~/.claude/skills/dev-debrief/quick-debrief-flow.md` for the full quick debrief procedure (QD Steps 1-6).

---

## Full Debrief Flow (Score >= 5)

Throughout this flow, `$ROOT` is the project root. `$WIKI` is `$ROOT/.dev-wiki`. Today's date is `$(date +%Y-%m-%d)`.

### Step 2: Read Existing State

Use the Read tool for each of these files (skip any that do not exist):

- `$WIKI/_CURRENT_STATE.md` -- current project state
- `$WIKI/_ARCHITECTURE.md` -- project structure
- `$WIKI/tasks.md` -- tactical task list
- `$WIKI/schema.md` -- project identity and conventions

Use the Glob tool to list all files in `$WIKI/articles/phases/` and `$WIKI/articles/decisions/`, then Read each. Collect existing decision titles and aliases into a dedup list.

**Budget:** Read at most 10 articles total: active phase article + 5 most recent decisions (by `updated:` date) + 4 most recent journals. Skip status snapshots.

### Step 3: Read Session Buffer

If `$WIKI/.session-buffer` exists, use the Read tool on it. Contains accumulated commit data from PostCommit hooks. If missing, conversation analysis in Step 4 is the primary source.

### Step 4: Analyze Conversation

Analyze the **full conversation in your context window** to extract:

1. **Decisions made** -- choices where alternatives were discussed, one chosen with rationale, agreement reached
2. **Open questions** -- raised but NOT resolved during this session
3. **Problems encountered and solutions found** -- including dead ends explored
4. **Tasks completed** -- cross-reference with `tasks.md`
5. **New tasks discovered** -- not previously tracked
6. **Architectural changes** -- new modules, changed dependencies, structural reorganization
7. **Escape hatches used** -- valid types: **SECURITY** (fix vulnerability), **DEPENDENCY** (prerequisite first), **USER OVERRIDE** (follow user, note deviation), **DISCOVERY** (add precondition). Note type and justification for each deviation.
8. **Health delta** -- if `## Development Toolchain` exists in `_ARCHITECTURE.md`, compare session-end state against baseline: test count changes (new tests added/removed), type errors introduced/resolved, lint violations, tools added/removed. Include delta in journal entry under `## Health Delta` if any changes occurred.
9. **Soft observations / Phase N+1 candidates** -- if the session produced a validation-status article OR surfaced uncovered patterns, populate the optional `## Soft Observations / Phase N+1 Candidates` section in the journal entry per `~/.claude/skills/dev-wiki/journal-templates.md`. Source: bullet list of (observation, suggested next-phase framing, evidence link). Downstream phases use this section as their refinement-phase candidate source as refinement-phase candidates.

### Step 4.5: Review Gate (Conditional)

Read `~/.claude/skills/dev-debrief/review-gate.md` for the full size-gated review procedure. Replaces the former standalone `/dev-review` skill. Size gate: 4+ tasks OR ceremony: standard → dispatch unified reviewer; otherwise skip (self-check was the quality gate). Include findings in journal entry (Step 6) under `### Review Gate`.

### Step 5: Extract Decisions *(Lite: skip)*

For each candidate decision from Step 4, read `~/.claude/skills/dev-wiki/decision-template.md` for the full decision extraction criteria (inclusion, exclusion, signal detection, confidence levels, noise prevention).

For each qualifying decision, create a file at `$WIKI/articles/decisions/<slug>.md`. Read `~/.claude/skills/dev-wiki/slugification.md` for the slugification algorithm and `~/.claude/skills/dev-wiki/decision-template.md` for the article template.

### Step 6: Create Journal Entry *(Lite: simplified — key facts only)*

Create ONE journal entry at `$WIKI/articles/journal/<today>-<slug>.md`. Read `~/.claude/skills/dev-wiki/journal-templates.md` for the rich journal template and `~/.claude/skills/dev-wiki/slugification.md` for slugification.

If a journal file for today with the same slug exists, append a numeric suffix.

### Step 6a: Activation Quality Logging

If `$ROOT/.claude/rules/active-knowledge.md` exists:

1. Count source sections (`###` headings under `## Phase:`) in active-knowledge.md.
2. For each entry, extract its `from:` slug (e.g., `[[wiki:some-slug]]` → `some-slug`).
3. Check if the slug was referenced in this session's conversation context (approximate literal match — search for the slug string in conversation artifacts, commit messages, or tool outputs from this session).
4. Compute approximate hit rate: entries referenced / total entries.
5. Append to the journal entry (Step 6) under `### Activation Quality`:
   ```
   Active knowledge: N entries, M referenced (~X% approximate hit rate, literal match).
   ```
   If hit rate < 60%, add: `Consider pruning low-relevance entries in next /dev-plan.` (>60% is healthy activation.)

If active-knowledge.md does not exist, skip this step.

### Step 6b: Capture Check (wiki-capture surfacing)

If the journal entry (Step 6) has a non-empty `## Soft Observations` section, count the bullet entries (`-` lines).
Emit: `"N soft observations found — any worth capturing to the knowledge wiki? Run /wiki-capture for each reusable insight. (y/n)"`. Advisory — the user may have already captured insights in-session. If no Soft Observations section or section is empty, skip silently.

### Step 7: Update tasks.md

Use the Read tool on `$WIKI/tasks.md`. Apply changes:

1. **Mark completed tasks** `[x]` by cross-referencing Step 4
2. **Add discovered tasks** under the appropriate phase heading
3. **Mark blocked tasks** `[blocked: reason]`
4. **Reorder** -- active phase first, then upcoming. Completed phases collapsed.

Read `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

### Step 8: Rewrite _CURRENT_STATE.md

Rewrite `$WIKI/_CURRENT_STATE.md` respecting section ownership. Rewrite owned sections (Recommended Next Action, Session Journal, Key Artifacts, Cross-References) from scratch. Preserve sections owned by other skills (Active Phase, Active Phase Contract, Recent Decisions, Blockers and Open Questions) verbatim. **Lite:** Rewrite only Recommended Next Action and Session Journal; preserve Key Artifacts and Cross-References verbatim. Read `~/.claude/skills/dev-wiki/state-template.md` for the 7-section template and `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

### Step 8.5: Project CLAUDE.md Refresh Check

Read `~/.claude/skills/dev-debrief/claude-md-refresh.md` for the full refresh procedure. Skip if no project `./CLAUDE.md` exists.

### Step 9: Update _ARCHITECTURE.md

Only update if structural changes occurred this session OR if the `## Development Toolchain` section needs updating (tools added/removed, config paths changed). When updating, rewrite the full file. Read `~/.claude/skills/dev-wiki/architecture-template.md` for the template and `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

To scan the codebase structure, use the Glob tool with patterns like `$ROOT/src/**/*` or `$ROOT/**/*.py` (adjust for the project's language). Do NOT use `find` commands.

### Step 9a: Architecture Staleness Detection

Read `~/.claude/skills/dev-debrief/architecture-staleness-check.md` for the full procedure (catches skill files at `~/.claude/skills/` that are outside the stale-queue pipeline; runs in both full and quick debrief modes).

### Step 10: Update Phase Articles *(Lite: simplified — frontmatter status only)*

Use the Glob tool to list phase articles in `$WIKI/articles/phases/`. For each:

- If phase became active this session, update `status: active`
- If all tasks completed AND exit criteria met, do NOT auto-complete -- note it in the report for user confirmation
- If new blocker discovered, update `status: blocked`

Phase transitions `active` -> `completed`: ALWAYS ask user, never auto-transition.

### Step 11: Create Status Snapshot

Read `~/.claude/skills/dev-debrief/debrief-finalization.md` Step 11 instructions.

### Step 12: Update .claude/rules/active-phase.md

Always rewrite `$ROOT/.claude/rules/active-phase.md` in full debrief mode. Format: Phase, Objective, Scope, Key constraints, Exit criteria, Abort rule. Keep to 10-15 lines, 20 line hard cap per `~/.claude/skills/dev-wiki/size-budgets.md`.

### Step 12b: Validate/Transition active-knowledge.md

Read `~/.claude/skills/dev-debrief/active-knowledge-transition.md` for the carry-forward logic. Two paths: phase-changed (carry forward entries to working-knowledge, delete active-knowledge.md) and same-phase (no action). Skip if no knowledge wiki and no active-knowledge.md.

### Step 12c: Retro Check (Conditional)

Read `~/.claude/skills/dev-debrief/retro-check.md` for the lightweight retrospective procedure. Replaces the former standalone `/dev-retro` skill. Triggers when completed phase count % 5 == 0. Analyzes dims 1-3 only (blockers, reversals, corrections). Include findings in journal entry.

### Steps 13-15: Index Rebuild, Log, Breadcrumb Cleanup

Read `~/.claude/skills/dev-debrief/debrief-finalization.md` Steps 13 *(Lite: skip Step 13)*, 14, and 15 instructions.

### Step 16: Report to User

```
Session debriefed (full):
- Decisions captured: N (list titles)
- Journal: <journal entry title>
- Tasks: X completed, Y added, Z blocked
- Open questions: N carried forward
- Escape hatches used: <list or "none">
- Next action: "<recommended next action>"
```

If a phase may be ready for completion, add a note. If `active-phase.md` was updated, note that too.
If any artifact path from the session matches `~/.claude/skills/`, append: "Skill files were modified. Run `/dev-scan` to refresh `_ARCHITECTURE.md`."
If all phase tasks are marked `[x]` in tasks.md, append: "Phase N complete. Run `/dev-plan` for Phase N+1."

---

## Stop Hook Interaction

If `/dev-debrief` was run this session, the Stop hook detects a `DEBRIEF` entry in `log.md` with today's date. It writes `.session-end` with `debriefed: yes`. The next session's `/dev-context` skips breadcrumb processing for debriefed sessions.

---

## Error Handling

- **Missing living document:** Create it fresh during the relevant step. Log a warning.
- **Malformed frontmatter:** Skip the article, note it in report, continue.
- **No git repository:** Skip git-dependent ops. Rely on conversation analysis. Note in report.
- **Empty conversation:** "No significant session activity detected. Skipping debrief." STOP.
- **File write failure:** Report the failure and continue with remaining steps.

---

## Time Budget

Full debrief: 30-60 seconds. Quick debrief: 10-15 seconds.
