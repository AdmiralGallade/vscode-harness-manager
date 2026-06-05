# state-template.md

Template for `_CURRENT_STATE.md`, the 7-section living project state document. Consumed by `dev-debrief`, `dev-plan`, and `AGENTS.md`.

## _CURRENT_STATE.md Template

7-section living document. Rewrite fully on each update (do NOT patch).

```markdown
# Project: <project-name>

> Last updated: <ISO-timestamp> by /<skill-name>

## Recommended Next Action

<One concrete sentence: what the developer should do next when they resume.>

## Active Phase

**[[<phase-slug>|<Phase Title>]]** (status: <status>)

Entry criteria: MET | NOT MET
Exit criteria: <current state of exit criteria>

Progress: ~<percentage>% (<brief description>)

## Active Phase Contract

Phase: N - Name
Tasks: X (see tasks.md)
Transition: continue | new-session | subagent
Abort: if blocked >3 attempts, ask user: skip or abort

## Recent Decisions

| Decision | Confidence | Date |
|----------|------------|------|
| [[<decision-slug>]] | <confidence> | <date> |

## Blockers and Open Questions

- <Question or blocker with context> (raised <date>)

## Key Artifacts

| Path | Purpose | Last Modified |
|------|---------|---------------|
| <path> | <purpose> | <date> |

## Session Journal (last 5)

- [<date>] [[<journal-slug>]] -- <brief description>

## Cross-References

- <Cross-wiki links if applicable>
```

### Per-Section Ownership

Section-pivoted aggregate view. The per-skill `## Section Ownership` blocks in consumer SKILL.md files are the authoritative source for owned-sections enumeration; this table derives a section-indexed view for template consumers. Update SKILL.md blocks FIRST when ownership shifts; refresh this table second (derived view).

| Section | OWNS (primary writer) | MAY APPEND / UPDATE |
|---------|----------------------|---------------------|
| Recommended Next Action | dev-debrief (full + quick modes) | — |
| Active Phase | dev-plan (rewrites status active, ~0%) | dev-debrief (flips status active → completed at phase close) |
| Active Phase Contract | dev-plan (rewrites at phase plan) | — |
| Recent Decisions | dev-plan (rewrites at phase plan) | — |
| Blockers and Open Questions | dev-plan (appends `[planning]` items, never removes) | — |
| Key Artifacts | dev-debrief (full mode rewrite) | — |
| Session Journal (last 5) | dev-debrief (full + quick modes; keeps last 5) | — |
| Cross-References | dev-debrief (full mode rewrite) | — |

**Drift-prevention contract.** When a SKILL.md `## Section Ownership` block adds, removes, or reassigns an owned section, edit that SKILL.md first; this table second. Reverse order risks silent paired-enumeration drift — always update the authoritative source first, then the derived view. Single source of truth: SKILL.md blocks.
