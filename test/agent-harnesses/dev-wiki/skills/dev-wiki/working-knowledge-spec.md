# working-knowledge-spec.md

Specification for `.claude/rules/working-knowledge.md` — usage-tracked cross-phase knowledge.

**Location:** `.claude/rules/working-knowledge.md`
**Ownership:** Shared. `/wiki-query` (activate + increment), `/dev-debrief` (carry-forward from active-knowledge), `/dev-plan` (seeding).

### Entry Format

Each entry is exactly 2 lines:
1. `- [uses: N] <distilled proposition>` — fact with usage counter
2. `  source: [[wiki:<slug>]] | activated: YYYY-MM-DD` — indented metadata

Optional: append `| last_decay: YYYY-MM-DD | tier: 3` for project-specific facts.

Sorted by usage count descending. Ties broken by most recent `activated:` date.

### Constraints

- Max 100 entries, 210-line hard cap (~800 tokens)
- Dedup before inserting: if same `source:` slug exists, increment `uses` instead
- Pruning at cap: remove lowest-count entries (ties: oldest activated date) until at 100
- No automatic decay — usage counts persist until manually pruned

### When to Activate

After `/wiki-query` answers a substantive question (>3 sentences, 2+ articles), offer activation. Max 3-5 propositions per event. Each must be multi-turn useful OR non-obvious from a single file read.

### What Belongs Here

Cross-project reusable patterns about HOW to do work, and cross-phase non-obvious project facts (multi-module, not derivable from one file). If `_ARCHITECTURE.md` or a single file captures it, don't duplicate here.

**Cross-reference:** `active-knowledge-spec.md` for phase-scoped knowledge with different lifecycle.
