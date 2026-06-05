# Post-Implementation Self-Check Checklist

Deterministic checks run after all phase tasks are marked [x], before /dev-review. For S/M Lite phases, self-check IS the review gate (dev-review passes through). Each check is a concrete command or procedure — no subjective judgement.

## 0. Checklist Hygiene (conditional)

**Skip:** if `self-check-checklist.md` is NOT among the phase scope files.

For this file (`self-check-checklist.md`) when modified:
- Use Grep tool: pattern `~/` on this file — flag bare `~` in any command examples (must use `$HOME`; `~` doesn't expand in bracket tests).
- Use Grep tool: pattern `grep ` (lowercase, with trailing space) on this file — verify each occurrence is either (a) inside a `grep -q` success criterion, (b) preceded by "Use Grep tool:", or (c) a check-procedure command (`grep -P`, `grep -c`, `grep '^...'`) that extracts or validates content. Flag only bare `grep` used as a search instruction where the Grep tool should be used instead.
- For each `## N.` heading: verify at least one line below it contains a concrete command (`grep`, `wc`, Glob, Grep tool reference) before the next `## N+1.` heading.

## 1. Cross-Reference Resolution

For each file modified in this phase:
- Use Grep tool: pattern `\[\[([^\]|]+)` on each modified file to extract wiki-link targets. For each target, verify the referenced file exists on disk (Glob `**/articles/**/<target>.md` or companion in same directory).
- Use Grep tool: pattern `Read .+\.md` on each modified file to extract Read references to companion files. Verify each target exists (Glob the path).
- Use Grep tool: pattern `Step \d+` on each modified file to extract step references. Verify each referenced step number exists as a heading in the same file.
- For phases modifying status articles with roll-up counts (e.g., `## Summary` table in wiki-implementation-gap-audit.md): use Grep tool on the article body to count occurrences of each classification (IMPLEMENTED, PARTIAL, GAP, N/A, STALE), then verify each count matches the corresponding value in the Summary table. Flag mismatches as MEDIUM.

## 2. Line Count vs Budget

For each SKILL.md modified in this phase:
- `wc -l <file>` — compare against tier cap: single-shot ≤100, simple orchestration ≤160, complex orchestration ≤250. Tier is determined by the skill's existing classification.
- For companion files: `wc -l <file>` — verify ≤80 lines (reference artifact) or ≤100 lines (prompt companion).

For living documents modified:
- `wc -l .dev-wiki/_CURRENT_STATE.md` ≤100, `_ARCHITECTURE.md` ≤100. For `tasks.md`: only the active phase section counts against the ≤60 budget (completed phases are collapsed in `<details>`).

## 3. Metadata Completeness

For each SKILL.md modified:
- `grep -q '^description:' <file>` — frontmatter has trigger description.
- If skill writes shared files: `grep -q 'writes:' <file>` — has writes: metadata.
- If skill writes shared files: `grep -q '## Section Ownership' <file>` — has ownership block.

For each companion `.md` file modified (non-SKILL.md files in skill directories):
- `wc -l <file>` after stripping frontmatter — verify ≥5 non-frontmatter lines or `grep -c '^##' <file>` ≥1 heading. Empty stubs fail.

For each phase/decision article created:
- `grep -q '^title:\|^category:\|^tags:\|^created:\|^status:' <file>` — required frontmatter fields present.

## 4. Step/Numbering Continuity

For each SKILL.md modified that uses numbered steps:
- Use Grep tool: pattern `###?\s+Step\s+[\d.]+` on each modified file to extract step headings. Verify sequential (no gaps: 1,2,3 not 1,2,4).
- Use Grep tool: pattern `Step \d+` for internal step references — every referenced number must exist as a heading.
- For tables with row counts: verify claimed count matches actual rows (`grep -c '^|' <table-section>`).

## 5. Scope Verification

Compare files actually modified during the phase against declared scope globs in the phase article:
- `grep '^scope:' .dev-wiki/articles/phases/<phase>.md` — extract declared scope globs.
- List files modified: collect from each task's `scope:` field in tasks.md, plus any DISCOVERY additions. For git-tracked projects, `git log --name-only --format="" <phase-start-sha>..HEAD` captures all committed changes.
- Flag any modified file NOT matching a declared scope glob. Justify with DISCOVERY escape hatch or flag as out-of-scope.

## 6. Convention Consistency

For reviewer prompts modified:
- `grep -P '\d+-\d+.*accept' <file>` — verify threshold uses 9-10 (not 8-10).
- `grep -P '\d+-\d+.*revise' <file>` — verify threshold uses 6-8 (not 5-7).
- `grep -P '\d+-\d+.*reject' <file>` — verify threshold uses 1-5 (not 1-4).

For wiki links in knowledge wiki articles:
- `grep -P '\[\[wiki:' wiki/articles/**/*.md` — intra-wiki links must use `[[slug]]` not `[[wiki:slug]]`.

For test commands in tasks.md:
- `grep '~/' .dev-wiki/tasks.md` — flag bare `~/` in test commands (use `$HOME` instead; `~` doesn't expand in bracket tests).

For ceremony annotations in SKILL.md files:
- `grep -P '\*\(Lite:' <file>` — verify annotations use `*(Lite: skip)*` or `*(Lite: simplified)*` (consistent casing and format).

For hooks/enforcement files modified alongside ceremony-aware skills:
- If a ceremony-aware skill (one with `*(Lite:` annotations) is in phase scope, check hooks files (e.g., `dev-wiki-hooks.md`) also in scope for `*(Lite:` annotations where ceremony-conditional behavior exists.

## 7. Dependency Coverage *(Lite: skip)*

**Skip:** if project has <10 source files OR no `.dev-wiki/articles/files/` directory exists.

For each scope file (created/modified, excluding tests, config, generated, and binary files):
- Verify file article exists: Glob `.dev-wiki/articles/files/<path-slug>.md` (path-slug per `~/.claude/skills/dev-wiki/slugification.md`).
- Bidirectional check: if file A's `imports` includes path B, read B's article and verify `imported_by` includes A's path. Flag mismatches.
- Coupling nexus: if any scope file has `imports` ≥5 AND `imported_by` ≥5, note as refactor candidate in phase journal soft observations.
