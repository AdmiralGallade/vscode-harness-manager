# task-schema.md

Task schema for `tasks.md` entries — format template, field definitions, task states, size guidelines, task ordering, and plan review dimensions. Consumed by `dev-plan` (task generation) and `dev-check` (validation).

## Task Schema

Each task in `tasks.md` follows this format:

```
- [ ] <Description>: test <what to test> (RED), implement <what to build> (GREEN), <refactor note> (REFACTOR) | scope: <globs> | success: <criterion> | size: S
```

Valid size values: `S` (<5 tool calls), `M` (5-20), `L` (20-50). Use exactly one letter — do NOT write `S|M|L` as the `|` character is the field delimiter.

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| Description | Yes | What the task accomplishes |
| RED | Yes | What test to write and what it should assert |
| GREEN | Yes | What implementation makes the test pass |
| REFACTOR | No (skip for S) | What to clean up after GREEN passes |
| scope | Yes | File globs this task touches (subset of phase scope) |
| success | Yes | Testable criterion -- must be falsifiable and verifiable by running a command (see Verification Guidance below) |
| size | Yes | S (<5 tool calls), M (5-20), L (20-50) |
| data_contract | No | OPTIONAL. What data this task reads and writes beyond code files. Format: `data_contract: reads <config.json, $DB_URL env>, writes <output.csv, cache/>`. Omit for pure-code tasks with no data I/O. Helps track data flow at task granularity per `architecture-template.md` conventions. |

### Task States

| State | Syntax | Meaning |
|-------|--------|---------|
| Pending | `- [ ]` | Not yet started |
| Done | `- [x]` | Completed, verified |
| Blocked | `- [blocked: reason]` | Stuck, needs user input |

### Size Guidelines

- **S (Small):** Single test + single implementation file. Config changes, utility functions, type definitions.
- **M (Medium):** Multiple test cases + implementation spanning 2-3 files. Standard feature work.
- **L (Large):** Complex feature with integration tests. At most 1 per phase. Consider splitting if possible.

### Verification Guidance for Success Criteria

Success criteria are the primary quality lever — they are spec-derived (written before implementation), so they provide context isolation that prevents tautological verification. Strengthen them using tiered checks:

| Tier | What it checks | Tools | Use when |
|------|---------------|-------|----------|
| **Tier 0: Structural** | Schema, frontmatter, file existence | `test -f`, `yq`, `jq` | Always — cheapest, catches format errors |
| **Tier 1: Referential** | Cross-references, link integrity, imports | `grep -q`, custom link checks | Files with cross-references or dependencies |
| **Tier 2: Behavioral** | Functional correctness, test pass, no regressions | test runners, bash assertions | Code changes, complex logic |

**Falsifiability rule:** Every success criterion must be falsifiable — construct a plausible bad output that would FAIL the criterion. If you cannot, the criterion is too vague.

**Prefer structure-aware tools over grep** for structured data: `yq` for YAML frontmatter, `jq` for JSON config. Grep is line-bound and cannot validate multi-line structures — use three-layer verification (structural/referential/behavioral) for non-code outputs.

**Compose multiple tiers** with `&&` — a criterion that checks structural validity AND behavioral correctness catches more failures than either alone.

### Task Ordering

Order tasks by dependency. If task B depends on task A, A comes first. Independent tasks can be in any order.

### Plan Review Dimensions

Applied by the plan reviewer subagent (Step 7.5) before tasks are committed. Knowledge completeness is the primary gate — checked first because insufficient knowledge produces both approach and task-level gaps.

| # | Dimension | Pass Criterion | Severity if Failed |
|---|-----------|---------------|-------------------|
| 1 | Knowledge completeness | ≥70% key concepts have wiki coverage or gaps noted | CRITICAL |
| 2 | Task completeness | All enriched fields present (description, TDD, scope, success, size) | HIGH |
| 3 | Exit criteria coverage | Bidirectional: every criterion ↔ ≥1 task | CRITICAL |
| 4 | Knowledge alignment | Tasks reflect retrieved wiki patterns | HIGH |
| 5 | Size compliance | ≤1 L task, tags present, sizes reasonable | HIGH |
| 6 | Dependency ordering | No task references output of a later task | HIGH |
| 7 | Scope precision | File globs, not vague descriptions; subset of phase scope | MEDIUM |

See `~/.claude/skills/dev-plan/plan-reviewer-prompt.md` for the full reviewer checklist.
