# Size Budgets

Shared reference for all dev-wiki skills that write articles and living documents.

| Artifact | Target | Hard Cap | Overflow Action |
|----------|--------|----------|-----------------|
| `_CURRENT_STATE.md` | 80 lines | 100 lines | Truncate journal to 3, decisions to 3 |
| `_ARCHITECTURE.md` | 60-80 lines | 100 lines | Collapse test org, reduce tree depth |
| `tasks.md` | 60 lines active | 120 with collapsed | Collapse completed phases into `<details>` |
| Decision article | 30-60 lines | 80 lines | Trim consequences, link to related |
| Phase article | 40-80 lines | 120 lines | Summarize scope, reduce notes |
| Journal entry | 20-40 lines | 60 lines | Summarize, don't enumerate every change |
| Status snapshot | 30-50 lines | 80 lines | Drop least-useful sections |
| File article | 30-60 lines | 80 lines | Drop Key Logic, cap Exports to 10, cap Dependents to 10 |
| Module article | 20-40 lines | 60 lines | Cap Files to 15 with "...and N more", trim Dependencies |
| `active-phase.md` | 10-15 lines | 20 lines | Trim to essential constraints only |
| `active-knowledge.md` | 30 lines | 40 lines | Re-distill if >30, hard-fail if >40 |
| `working-knowledge.md` | 100 entries | 210 lines | LRU eviction at entry cap, 7-day decay |
| `schema.md` | 30-50 lines | 80 lines | Condense conventions |
