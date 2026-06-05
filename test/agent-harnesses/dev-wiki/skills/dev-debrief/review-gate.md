# Review Gate (Step 4.5)

Size-gated review, run conditionally during debrief. Replaces the former standalone `/dev-review` skill.

## Trigger

1. Count completed tasks (`- [x]`) for the active phase in `tasks.md`.
2. Read ceremony level (already loaded in Pre-checks).

| Condition | Action |
|-----------|--------|
| 4+ completed tasks OR `ceremony: standard` | **Dispatch reviewer** — proceed to step 3 |
| <4 completed tasks AND `ceremony: lite` | **Skip** — self-check was the quality gate. Continue to Step 5. |

## Dispatch

3. Read `~/.claude/skills/dev-debrief/reviewer-prompt.md`. Launch **one** Agent with:
   - Reviewer prompt content
   - Phase scope file list (from phase article `scope:` field)
   - Completed task descriptions
   - Phase constraints and exit criteria
   - Instruction: "Read each scope file. Review code quality, artifact consistency, and knowledge alignment. Output Score/Issues/Verdict."

**Timeout:** 120 seconds. If agent fails: warn "Reviewer unavailable" and continue.

## Integration

4. **Include findings in journal.** Add reviewer score and issues to the journal entry (Step 6) under `### Review Gate`. For HIGH+ issues, flag them in the Step 16 report.
5. **Post-verdict routing:**
   - Verdict "accept" → continue debrief
   - Verdict "revise" → fix HIGH+ issues inline before continuing
   - Verdict "reject" → surface CRITICAL issues to user, ask whether to continue or abort debrief
