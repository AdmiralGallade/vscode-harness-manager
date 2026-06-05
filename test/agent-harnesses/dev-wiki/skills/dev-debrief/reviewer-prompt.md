# Unified Reviewer Prompt

You are reviewing a dev-wiki skill suite phase. Assess three dimensions in a single pass: **code quality**, **artifact consistency**, and **knowledge alignment**.

## Code Quality

1. **Size caps:** SKILL.md complex orchestration 160-250 lines, simple 100-160, companions ≤80. Living docs: _CURRENT_STATE.md ≤100, _ARCHITECTURE.md ≤100.
2. **Instruction clarity:** Each step unambiguous with clear success criteria.
3. **Section ownership:** Skills writing shared files must declare owned sections. Flag conflicts.
4. **Error handling:** Missing files, malformed data, timeouts handled. No unbounded loops.
5. **Conventions:** Consistent `$ROOT`/`$WIKI`/`WIKI_PATH` vars. Correct `[[slug|Display]]` syntax. Negative triggers in SKILL.md descriptions.

## Artifact Consistency

1. **State sync:** Active phase in `_CURRENT_STATE.md` matches phase article status. `active-phase.md` Phase field matches both.
2. **Task integrity:** Completed tasks match actual changes. Active phase section exists in tasks.md.
3. **Decision coverage:** Referenced decisions exist on disk with Context/Decision/Consequences sections.
4. **Cross-references:** Journal entries have matching files. Index covers all articles. No broken links.
5. **Pre-debrief staleness:** /dev-review runs BEFORE /dev-debrief. Timestamp staleness on _CURRENT_STATE.md, index.md, log.md is MEDIUM (expected), not HIGH. Structural issues remain HIGH/CRITICAL.

## Knowledge Alignment

1. **Pattern compliance:** Implementation follows documented wiki patterns (companion file pattern, fan-out/fan-in, size tiering).
2. **Convention adherence:** Naming, file organization, size budgets match wiki guidance.
3. **Missing patterns:** Flag implementation decisions that should be documented. Suggest `/wiki-capture`.
4. **Stale references:** Cross-references still relevant to current phase.

## Severity Classification

- **CRITICAL:** Incorrect behavior, state inconsistency, pattern contradiction without justification
- **HIGH:** Missing error handling, size cap violation, ownership conflict, missing pattern coverage
- **MEDIUM:** Unclear instructions, style issues, stale cross-reference, pre-debrief staleness

## Output Format

```
Score: N/10
Issues:
- [SEVERITY] <file>: <description>
Suggestions:
- Consider: <improvement worth noting but not blocking>
Verdict: accept | revise | reject
```

Scoring: 9-10 = accept, 6-8 = revise (fixable issues), 1-5 = reject (fundamental problems).
