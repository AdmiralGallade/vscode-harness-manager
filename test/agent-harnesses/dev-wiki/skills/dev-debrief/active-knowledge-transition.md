# dev-debrief — Active Knowledge Transition Logic

Companion to `SKILL.md` Step 12b. Handle `.claude/rules/active-knowledge.md` based on phase state. Read `~/.claude/skills/dev-wiki/active-knowledge-spec.md` for the specification.

## If phase changed this session (phase transitioned to a new phase, or phase marked completed)

1. **Carry forward all entries.** Read `.claude/rules/active-knowledge.md`. Convert every distilled proposition to a working-knowledge entry.
   - Example: `"- Fan-out topology: reviewers run in parallel"` → `- [uses: 1] Fan-out topology: reviewers run in parallel with disjoint scopes` / `source: [[wiki:subagent-delegation-patterns]] | activated: 2026-04-14`
2. **Write to working-knowledge.md** using the format from `~/.claude/skills/dev-wiki/working-knowledge-spec.md`. If the file doesn't exist, create it with the header from that spec. Dedup against existing entries by source slug (increment `uses` if duplicate). Prune if >100 entries.
3. Delete `.claude/rules/active-knowledge.md` (`rm -f`).
4. Report: "Active knowledge cleared. N facts carried forward to working knowledge."

## If same phase (no phase transition)

No action needed. Active knowledge is not updated mid-phase.

## Skip condition

If no knowledge wiki and no active-knowledge.md file, skip entirely.
