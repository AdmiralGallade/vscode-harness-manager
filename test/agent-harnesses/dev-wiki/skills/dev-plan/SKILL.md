---
name: dev-plan
description: "Use when .dev-wiki/ exists for phase planning. MUST BE USED instead of brainstorming in .dev-wiki/ projects. Do NOT use for mid-phase task changes (edit tasks.md directly)."
reads: [$WIKI/_CURRENT_STATE.md, $WIKI/_ARCHITECTURE.md, $WIKI/tasks.md, $WIKI/articles/phases/*, $WIKI/articles/decisions/*]
writes: [$WIKI/_CURRENT_STATE.md(Active Phase, Contract, Decisions, Blockers), $WIKI/tasks.md, $WIKI/articles/phases/*, $WIKI/articles/decisions/*, $ROOT/.claude/rules/active-phase.md, $ROOT/.claude/rules/active-knowledge.md, $ROOT/.claude/rules/working-knowledge.md(seed cross-phase entries, decay, sort)]
dispatches: [plan-reviewer, approach-reviewer]
tier: complex-orchestration
---

# dev-plan

Plan one phase at a time, informed by accumulated wiki knowledge. Replaces brainstorming for projects with a `.dev-wiki/` directory. Reads project state, asks targeted questions, proposes an approach, writes the plan to the wiki with compaction anchors. **Single-agent** -- Claude does all work directly (unless user chooses option C in Step 9).

---

## Section Ownership — _CURRENT_STATE.md

This skill OWNS and rewrites these sections (preserve all others verbatim):
- `## Recommended Next Action`
- `## Active Phase`
- `## Active Phase Contract`
- `## Recent Decisions`

May APPEND to: `## Blockers and Open Questions` (planning questions only — do not rewrite or remove existing entries).
May SEED: `.claude/rules/working-knowledge.md` (Step 8f-ter, user-gated). wiki-query also writes this file (Steps 7a, 8) — caps are idempotent.

---

## Hard Gate

<HARD-GATE>
Do NOT write any implementation code, scaffold any module, or invoke any
implementation tool until the user has approved the approach in Step 7.
This applies to EVERY phase regardless of perceived simplicity.
</HARD-GATE>

---

**Anti-pattern:** Every phase goes through this process -- even trivial ones. The plan can be short (3-5 tasks), but you MUST present it and get approval. Do NOT skip, combine, or shortcut steps.

**Triggers:** `/dev context` suggests `/dev plan` when: active phase has 0 open tasks, all tasks are done, or user invokes it directly. If no `.dev-wiki/` exists: "No dev wiki found. Run `/dev init` first." STOP.

---

## Pre-checks

0. **Resume check.** If invoked with `--resume` and `$ROOT/.dev-wiki/.planning-pause` exists, read `~/.claude/skills/dev-plan/research-pause-spec.md` and follow the resume protocol (skip to Step 5 with saved state). Delete `.planning-pause` after the user provides a non-pause answer (i.e., Step 6 begins).

1. **Discover dev wiki.** Run `git rev-parse --show-toplevel 2>/dev/null || pwd` to find `$ROOT`. Check `$ROOT/.dev-wiki/_CURRENT_STATE.md`. If missing: "No dev wiki found. Run `/dev init` first." STOP.

2. **Verify living documents.** Confirm `_CURRENT_STATE.md`, `_ARCHITECTURE.md`, `tasks.md` exist under `.dev-wiki/`. If any are missing, note which ones -- they will be created during Step 8.

3. **Determine target phase.** Use the Read tool on `_CURRENT_STATE.md`:
   - If active phase has open tasks: "Phase N has X open tasks. Continue implementation." STOP.
   - If active phase has all tasks done: target = next phase (N+1).
   - If active phase has 0 tasks: target = active phase (needs planning).
   - If no active phase: target = first `not-started` phase.
   - If no phases at all: "No phases defined. Run `/dev init` or create phases manually." STOP.

4. **Ensure article directories exist:** `mkdir -p "$ROOT/.dev-wiki/articles/decisions" "$ROOT/.dev-wiki/articles/phases"`

Throughout this flow, `$ROOT` is the project root. `$WIKI` is `$ROOT/.dev-wiki`. Today's date is `$(date +%Y-%m-%d)`.

### Step 0.5: Ceremony Level Detection

Read `$WIKI/config.md` for `ceremony:` value (lite or standard). If absent, default to `lite`. Check target phase article frontmatter for `ceremony:` override (frontmatter wins). Precedence: phase frontmatter > config.md > default (lite). Steps marked *(Lite: skip)* below are skipped under lite ceremony. Under lite, task schema is simplified: `- [ ] <Description> | scope: <globs> | success: <criterion>` (no TDD cycle fields).

---

## Orchestration Flow

### Step 1: Load Wiki State

Read silently -- do NOT print contents to the user. Required: `$WIKI/_CURRENT_STATE.md`, `$WIKI/_ARCHITECTURE.md`, `$WIKI/tasks.md`, target phase article (Glob `$WIKI/articles/phases/`). Optional: last 5 decision articles (Glob `$WIKI/articles/decisions/`, Read 5 most recent).

**Missing phase article:** If no article exists for the target phase, warn: "No article for Phase N. Creating a stub." Create a minimal phase article using the template from `~/.claude/skills/dev-wiki/phase-template.md` with `status: not-started` and empty scope/exit_criteria, then proceed.

**Budget:** Read at most 10 files in this step.

### Step 2: Load Cross-Wiki Knowledge (Multi-Wiki, Index-Then-Retrieve)

Discover relevant wikis, then retrieve articles from each:

1. **Discover wikis.** Read `~/.claude/wikis.json`. Collect all registered wikis. Always include the CWD wiki (`$ROOT/wiki/`) if it exists. For other registered wikis, score relevance: match wiki `description` keywords against phase objective and scope (+1 per keyword match), then read each wiki's `schema.md` and score +1 per custom tag overlap and +1 per hierarchy root keyword overlap with phase objective/scope. Include the top 1-2 scoring non-CWD wikis (skip score-0). Cap: 3 wikis total.
2. **Index each wiki.** For each selected wiki, read its `index.md` and `schema.md` (hierarchy roots, domain tags). Skip wikis missing `index.md`.
3. **Match articles by relevance** across all selected wikis. Score each article: frontmatter `tags` overlap with phase tags (+2 each), hierarchy root membership (+1), title keyword overlap with phase objective (+1 each). Rank descending across all wikis, skip score-0.
4. Read the top 3-5 articles by combined score.

If no articles score >0 across all wikis, emit: `"Cross-wiki retrieval: N wikis scored, 0 relevant articles found."` and continue (planning proceeds without wiki knowledge).

If no `~/.claude/wikis.json` and no `$ROOT/wiki/`, skip. **Budget:** 5 articles initially (Step 2.5 may expand to 14 via iterative loop).

### Step 2.5: Iterative Knowledge Completeness Check *(Lite: skip)*

Read `~/.claude/skills/dev-plan/iterative-retrieval-spec.md` for the full loop protocol. Extract concepts (frozen set), then iterate up to 3 rounds until coverage ≥ 70% or no new articles. Pass unfillable gaps to Step 4 as design questions. If Step 2 was skipped (no wikis), skip this step.

### Step 3: Explore Phase Scope (Bounded)

Extract the `scope` field (file globs) from the phase article. Glob each pattern to identify files in scope.

**Code article path (preferred):** Glob `$WIKI/articles/files/*.md` and `$WIKI/articles/modules/*.md`. If articles exist, use them instead of raw file reads:

1. Read module articles matching the phase scope — extract `internal_deps`, `dependents`, `files` for structural overview
2. Read file article frontmatter for scope files — extract `exports`, `imports`, `imported_by` for dependency data
3. **Blast radius (bidirectional, 2-level):** Follow both `imports` (upstream risk: could dependencies break us?) and `imported_by` (downstream risk: will changes break consumers?) chains 2 levels deep. Include files whose `data_reads` overlap with scope files' `data_writes`. Flag high-fanout files (5+ in either direction) for careful task ordering.
4. **Refactor advisory + task priorities:** If any scope file has imports≥5 AND imported_by≥5, emit: *"Coupling nexus: <file> (N upstream, M downstream). Consider splitting before modifying."* Cross-reference module `## Key Patterns` and `## Issues` for task ordering (HIGH issues → early tasks).

**Raw file fallback:** If no code articles exist, Read at most 10 files, 150 lines each. Note code structure, test coverage, naming conventions, dependencies. If greenfield, note "no existing code."

**Budget:** Cap total exploration at ~5000 tokens.

### Step 3.5: Pre-Implementation Validation Gate *(Lite: skip)*

Read `## Development Toolchain` from `$WIKI/_ARCHITECTURE.md`. If present, check: (1) test framework exists if TDD tasks planned — surface as Step 5 question if missing, (2) type checker/linter — note as non-blocking warnings if absent. If section absent: `"Toolchain status unknown — run /dev-scan."` (non-blocking). Optional: run lightweight tool checks (pytest --co, mypy --version, tsc --noEmit) if tools detected. **Budget:** Max 3 Bash calls.

### Step 4: Identify Design Questions (Targeted)

Based on Steps 1-3, identify design questions. These are NOT open-ended brainstorming questions -- they are targeted, constrained by prior decisions and wiki knowledge.

For each question, check: Does a prior decision already answer this? Does a knowledge wiki article provide guidance? Is this genuinely open?

**PERSIST immediately:** Write identified questions to `_CURRENT_STATE.md` under `## Blockers and Open Questions` as `- [planning] <question text> (raised <today>)`.

### Step 5: Ask User Goal-Oriented Questions

The wiki provides domain knowledge; the user provides **intent**. Three question types: **Goal** ("Should this produce a prototype or a design doc?"), **Constraint** ("Are we allowed to change the ownership contract?"), **Priority** ("If we can only fit 3 of 4, which do we drop?"). 1-3 questions total *(Lite: 0-1)*, one at a time, A/B/C choices preferred. Zero questions is valid if prior decisions fully constrain the approach.

**Research pause:** If the user's answer reveals they need to research a topic before committing to a direction (e.g., "I need to learn about X first"), read `~/.claude/skills/dev-plan/research-pause-spec.md` and follow the save protocol. This preserves planning state so `/dev-plan --resume` can skip Steps 1-4 after research completes.

### Step 6: Propose Approach

Based on user's answers (or prior constraints), propose the approach for THIS PHASE ONLY.

- **1-2 options with trade-offs.** Lead with your recommendation.
- **Reference knowledge wiki patterns** where applicable (`[[wiki:slug|Display]]` links).
- **Reference prior decisions** that constrain this phase.
- **YAGNI ruthlessly.** If not in exit criteria, it does not belong.

**PERSIST immediately:** Write draft decision article at `$WIKI/articles/decisions/<slug>.md` with `confidence: low`. Read `~/.claude/skills/dev-wiki/decision-template.md` for the decision article template.

### Step 6.1: Contradiction Check (Inline) *(Lite: skip)*

Search for wiki knowledge that might contradict the proposed approach. Serial inline (not subagent).

1. Extract 3-5 key claims from the proposed approach.
2. Search wiki indexes for tag-overlapping articles NOT in the Step 2/2.5 retrieval set.
3. **HARD skip:** If 0 unread articles found, proceed to Step 6.5.
4. Read up to 3 new articles. Flag contradictions or better alternatives.
5. If contradictions found, revise approach before dispatching the reviewer.

### Step 6.5: Automatic Approach Critique *(Lite: skip)*

Before presenting to the user, critique the approach using a subagent:

1. **Read** `~/.claude/skills/dev-plan/approach-reviewer-prompt.md`.
2. **Dispatch** Agent with: approach-reviewer prompt + proposed approach + phase article (objective, exit criteria) + top 3-5 articles from Steps 2/2.5 + prior decision articles (Step 1).
3. **Collect** Score/Issues/Suggestions/Verdict. **Timeout:** 120 seconds.
4. **Handle verdict:**
   - Score 9-10 (accept): Proceed to Step 7 with approach as-is.
   - Score 6-8 (revise): Incorporate reviewer feedback into approach, then proceed to Step 7.
   - Score 1-5 (reject): Surface CRITICAL issues to user alongside the approach in Step 7.
5. **Graceful fallback:** If companion file missing or subagent times out, proceed to Step 7 without critique. Warn: `"Approach reviewer unavailable — presenting uncritiqued approach."`

Include the reviewer's findings (score + key issues) when presenting to the user in Step 7.

### Step 7: User Approves Approach

Present the approach (with Step 6.5 reviewer findings, if available) and wait for explicit approval.

<HARD-GATE>
Do NOT write any implementation code until the user has approved.
A vague "sure" counts as approval. Silence does NOT.
</HARD-GATE>

If the user requests changes, revise, update the draft decision article, and re-present. **Maximum 3 revision rounds.** After 3: proceed with the best available version and note unresolved concerns in the phase article.

### Step 7.5: Draft Tasks and Review Plan Quality *(Lite: skip — merge into Step 7)*

1. **Draft tasks** in conversation context (do NOT write to files yet). Follow `~/.claude/skills/dev-plan/task-schema.md` enriched task schema *(Lite: simplified — description+scope+success only)*: each task needs description, TDD cycle, scope, success, size.
2. **Dispatch plan reviewer subagent.** Read `~/.claude/skills/dev-plan/plan-reviewer-prompt.md`. Launch Agent with the prompt + phase article (objective, exit criteria) + retrieved wiki articles + drafted tasks. Collect Score/Issues/Verdict. **Timeout:** 120 seconds. If subagent fails or times out: accept draft tasks without review score. Warn: `"Plan reviewer unavailable — proceeding without quality gate."`
3. **Handle verdict:**
   - Score 9-10 (accept): Proceed to Step 7.6.
   - Score 6-8 (revise): Fix flagged issues in the draft, re-review once. If still ≤8, accept best version.
   - Score 1-5 (reject): Surface specific CRITICAL issues to the user. Do NOT auto-accept. User decides: fix issues or proceed with acknowledged gaps.

### Step 7.6: Present Reviewed Plan to User *(Lite: skip — single gate at Step 7)*

Present the drafted tasks AND the reviewer's findings as a single report. This is a **second approval gate** — the user has already approved the approach (Step 7), now they approve the detailed plan.

Wait for explicit approval before proceeding to Step 8. If user requests changes, revise tasks and run Step 7.5 once more (one additional subagent review). Present result. Proceed to Step 8 regardless of outcome.

### Step 8: Write to Dev Wiki

All wiki artifacts are updated atomically. Follow this order:

#### 8a: Finalize Decision Articles *(Lite: skip)*
Update draft decisions: set `confidence` to `medium`/`high`, set `source: plan`. Create additional articles for new decisions from Steps 5-7.

#### 8b: Write Tasks to tasks.md
Write tasks for the target phase (see `~/.claude/skills/dev-plan/task-schema.md` for enriched task schema, `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets). Each task MUST include TDD cycle (RED/GREEN/REFACTOR), scope, success criterion, and size *(Lite: simplified — description+scope+success only)*. Order by dependency. At most 1 L task per phase.

#### 8c: Update _CURRENT_STATE.md
Rewrite `## Recommended Next Action`, `## Active Phase` (status: active, ~0%), `## Active Phase Contract`, `## Recent Decisions`, and `## Blockers and Open Questions` (remove resolved `[planning]` questions). Read `~/.claude/skills/dev-wiki/state-template.md` for the template.

#### 8d: Update _ARCHITECTURE.md
Only update if the approach changes project structure. If no structural changes, skip.

#### 8e: Update Phase Article
Set `status: active`, `updated: <today>`. If creating a new phase article, read `~/.claude/skills/dev-wiki/phase-template.md` for the template.

#### 8f: Write Compaction Anchor -- active-phase.md
Do NOT create any other hooks or rules files beyond `active-phase.md` and `active-knowledge.md` (Steps 8f and 8f-bis). Ensure `$ROOT/.claude/rules/` exists (`mkdir -p`). Write `$ROOT/.claude/rules/active-phase.md` with: Phase, Objective, Scope (file globs), Key constraints (from decisions), Exit criteria, Abort rule. Size: 10-15 lines, ~50 tokens.

#### 8f-bis: Write Compaction Anchor -- active-knowledge.md *(Lite: skip)*

Distill cross-wiki articles from Step 2 and phase decisions from Steps 5-7 into `.claude/rules/active-knowledge.md`. Read `~/.claude/skills/dev-wiki/active-knowledge-spec.md` for the template, evaluation criteria, and size budget.

**Process:** (1) Extract 2-5 key propositions per source. (2) Evaluate each: must pass 2 of 3 filters from `~/.claude/skills/dev-wiki/active-knowledge-spec.md` (multi-turn, non-obvious, phase-dependent) -- drop the rest. (3) Assemble using the template. (4) Count lines: if >30 re-distill; if still >40: skip writing active-knowledge.md, report: "Active knowledge exceeds 40-line cap. Skipping." Continue with Step 8g. (5) Write to `$ROOT/.claude/rules/active-knowledge.md`, overwriting any prior phase file.

**Skip:** If no knowledge wiki and no new decisions in Steps 5-7, skip entirely. Delete any prior-phase file if it exists; if absent, skip silently.

#### 8f-ter: Seed Working Knowledge (Cross-Phase Facts)

After writing active-knowledge.md, evaluate retrieved facts from Step 2 that were NOT included in active-knowledge (failed phase-dependent filter but passed multi-turn + non-obvious). These are cross-phase facts useful beyond this phase. If any exist, offer: `"N cross-phase facts available for working knowledge. Activate? (y/n)"`. On confirmation: (1) read existing `.claude/rules/working-knowledge.md` if it exists, (2) dedup new entries against existing by source slug — if match, increment `uses` instead of inserting, (3) append genuinely new entries as `[uses: 1]` with `activated: <today>`, (4) sort all entries by usage count descending, (5) prune if >100 entries — remove lowest-count (ties: oldest activated date) until at 100. Skip if no cross-phase facts found.

#### 8g: Mirror Tasks to TodoWrite (Compaction Anchor)
Write each task to TodoWrite with embedded constraints. Set all to `pending`. Set first to `in_progress` only if user will continue in this session (determined in Step 9).

#### 8h: Append to log.md; 8i: Update index.md
`[<ISO-timestamp>] PLAN -- Phase N planned, X tasks, Y decisions`. Add new decision articles and update the phase article entry in index.md.

### Step 9: Implementation Transition Gate

Present options: **A)** Continue this session (≤5 tasks), **B)** Fresh session with `/dev context` (6+ tasks), **C)** Subagent-driven parallel (independent tasks). Set `Transition:` in contract accordingly. For A/C, proceed to Step 10. For B, STOP.

### Step 10: Begin Implementation

Read `~/.claude/skills/dev-plan/implementation-guide.md` for Option A or C instructions.

---

## Tool Standards

- **Glob** for file discovery (not find/ls via Bash)
- **Grep** for content search (not grep/rg via Bash)
- **Read** for reading files (not cat/head/tail via Bash)
- **Bash** reserved for git, build tools, and system commands with no dedicated tool

> Compaction anchors and error handling extracted to companion. See `dev-plan/compaction-anchors-spec.md`.
