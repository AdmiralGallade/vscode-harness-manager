# scaffold-claude-md (companion to /dev-init)

trigger: read this file when the user opts in to the "Scaffold project CLAUDE.md?" prompt at dev-init Step 13b. Self-describing per the Phase 17 companion convention — invocation logic and file-output spec live here, not in `dev-init/SKILL.md`.

## Purpose

Author a project-level `$ROOT/CLAUDE.md` from `~/.claude/skills/dev-init/templates/project-CLAUDE.md`, substituting placeholders interactively. Produces the project entry point that composes with `~/.claude/CLAUDE.md` per the composition contract (project rules win for same concern; different concerns layer additively).

## Pre-checks

1. Verify template exists: `ls ~/.claude/skills/dev-init/templates/project-CLAUDE.md`. If missing, abort with: "Template missing. Cannot scaffold project CLAUDE.md."
2. Check for existing `$ROOT/CLAUDE.md`: if present, ask user "Overwrite existing CLAUDE.md? (y/n)". Abort on no.

## Placeholder Collection

Read the template, find all `{{PLACEHOLDER}}` tokens, and prompt the user for each:

| Placeholder | Prompt | Default suggestion |
|---|---|---|
| `{{PROJECT_NAME}}` | "Project name?" | basename of `$ROOT` |
| `{{PROJECT_DESCRIPTION}}` | "One-sentence project description?" | (none — required) |
| `{{PRIMARY_LANGUAGE}}` | "Primary language?" | infer from manifest (pyproject.toml→Python, package.json→TypeScript/JavaScript, Cargo.toml→Rust, etc.) |
| `{{HAS_DEV_WIKI}}` | (auto-detect) | `true` if `.dev-wiki/` exists, `false` otherwise |
| `{{HAS_KNOWLEDGE_WIKI}}` | (auto-detect) | `true` if `wiki/schema.md` exists or registered in `~/.claude/wikis.json`, `false` otherwise |

Auto-detected booleans skip the prompt unless detection fails.

## Substitution

For each `{{HAS_*}}` boolean, apply line-level substitution:
- If `true`: keep the line, strip the `{{HAS_*}}` token (the line becomes a real bullet).
- If `false`: drop the entire line.

For other placeholders, replace inline.

## Write

Write the substituted result to `$ROOT/CLAUDE.md`. Verify size: `wc -l CLAUDE.md` ≤ 80 lines per the harness composition invariant (project CLAUDE.md ≤80 lines). If over: report and prompt user to trim.

## Post-write Validation

Optional but recommended: invoke `/dev-harness H1` (when available) on the new file to confirm coherence (≤80 lines, imports resolve, no `## Phase` headers).

## Report to user

```
Scaffolded $ROOT/CLAUDE.md from template (N lines, {{PLACEHOLDERS}} substituted).
Next: review imports section, add project-specific rule modules under .claude/rules/ as needed.
```
