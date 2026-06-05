# Research Pause Specification

Companion to `dev-plan/SKILL.md`. Defines the save/resume protocol for when planning discovers the user needs research before committing to a phase direction.

---

## Breadcrumb Format

File: `$WIKI/.planning-pause` (YAML)

```yaml
phase_target: 70
candidates_explored:
  - "SHA256 content-hash caching — rejected: stale-queue skips *.md files"
  - "Full RAG — deferred: premature at 169 articles per wiki-retrieval-architecture"
rejected_directions:
  - "SHA256 caching: low value for Markdown-only project"
paused_at: "2026-04-22T10:00:00"
paused_reason: "User needs RAG research before committing to phase direction"
```

Required fields: `phase_target`, `candidates_explored`, `rejected_directions`, `paused_at`, `paused_reason`. `candidates_explored` captures options presented with their status. `rejected_directions` captures explicitly rejected approaches with reasoning.

## Save Protocol (triggered from Step 5)

When the user's answer indicates they need research:

1. Write `.planning-pause` breadcrumb with current state
2. Emit: "Planning paused. Research first, then run `/dev-plan --resume` to continue from Step 5 with saved context."
3. STOP (do not proceed to Step 6)

## Resume Protocol (triggered from Pre-check 0)

When invoked with `--resume` and `.planning-pause` exists:

1. Read `.planning-pause` breadcrumb
2. Read `$WIKI/_CURRENT_STATE.md` and `$WIKI/tasks.md` (minimal state load)
3. Read the target phase article if it exists
4. Present saved candidates and rejected directions to the user:
   "Resuming Phase N planning. Previously explored: [candidates]. Rejected: [directions]. What direction now?"
5. Continue from Step 5 (ask user questions) with the saved context
6. Delete `.planning-pause` after the user provides a non-pause answer (i.e., Step 6 begins). If the user pauses again, the save protocol overwrites the breadcrumb.

If `--resume` is used but `.planning-pause` does not exist: "No planning pause found. Running full /dev-plan." Continue with normal Pre-checks.

## Lifecycle

- Created by: Step 5 save protocol
- Read by: Pre-check 0 resume protocol
- Deleted by: Resume protocol (after Step 6 begins), or manually by user
- Survives: session boundaries, context compaction
- Does NOT survive: `/dev-init` (which resets all state)
