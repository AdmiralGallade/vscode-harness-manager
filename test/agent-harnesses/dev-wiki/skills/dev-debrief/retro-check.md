# Retro Check (Step 12c)

Lightweight retrospective analysis, run conditionally during debrief. Replaces the former standalone `/dev-retro` skill. Analyzes only the 3 highest-signal dimensions (retired dims 4-9 per v2 redesign item 7).

## Trigger

Count completed phases: Glob `$WIKI/articles/phases/*.md`, read frontmatter, count those with `status: completed`. If count > 0 AND count % 5 == 0: run retro check. Otherwise skip.

## Analysis (Dims 1-3 Only)

Read the **last 10 journal entries** (by filename date sort, most recent first) and the **last 10 decision articles** (by `created:` date). **Budget:** At most 22 file reads.

### Dimension 1: Recurring Blockers
Scan for: blocked tasks, permission errors, subagent failures, repeated workarounds. A blocker is "recurring" if it appears in 2+ journal entries.

### Dimension 2: Decision Reversals
Scan for: decisions made then later overridden, confidence downgrades, approaches abandoned. Cross-reference decision articles with journal "Problems Solved" sections.

### Dimension 3: User Corrections
Scan for: user overrides of agent decisions, restorations of prior state, "user requested" changes. This is the highest-signal dimension — it reveals preference/reliability gaps.

## Output

Include findings in the debrief journal entry (Step 6) under `### Retro Check (Phases N-M)`:

```markdown
### Retro Check (Phases N-M)

| Dimension | Findings | Signal |
|-----------|----------|--------|
| 1. Recurring Blockers | N | high/low/none |
| 2. Decision Reversals | N | high/low/none |
| 3. User Corrections | N | high/low/none |

Recommendations:
- <actionable suggestion grounded in findings>
```

If all dimensions show "none", emit: "Retro check: no systemic issues in last 10 phases." and skip the table.

If findings are systemic (2+ high-signal dimensions), add to Step 16 report: "Retro check flagged systemic issues. Consider a dedicated improvement phase."
