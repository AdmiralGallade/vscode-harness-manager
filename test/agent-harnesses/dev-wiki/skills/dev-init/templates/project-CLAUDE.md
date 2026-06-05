# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

Project entry point loaded when Claude Code's CWD is in this repo. Composes with the global `~/.claude/CLAUDE.md` per the composition contract (project rules win for the same concern; different concerns layer additively). Kept ≤80 lines per the harness composition invariant.

## Identity

- **Project:** {{PROJECT_NAME}}
- **Primary language:** {{PRIMARY_LANGUAGE}}

## Project Scope

Replace this paragraph with the project's purpose, target users, and any out-of-scope notes that future sessions should respect from turn 1.

## Project Rule Modules

The following modules under `.claude/rules/` apply to this project. Each is small and single-purpose; add domain-specific modules as the project grows (e.g., `api-conventions.md`, `db-patterns.md`).

- `.claude/rules/` — project-specific behavioral rules (project-only — overrides global on same concern)

## Dynamic State (do not edit by hand)

These files are written and pruned by skills; treat as machine-generated:

- `.claude/rules/active-phase.md` — owned by `/dev-plan` and `/dev-debrief`; current phase scope and constraints
- `.claude/rules/active-knowledge.md` — owned by `/dev-plan`; phase-distilled wiki knowledge
- `.claude/rules/working-knowledge.md` — owned by `/wiki-query`, written at phase debrief; cross-phase facts with usage decay

## Project Pointers

{{HAS_DEV_WIKI}}- **Dev-wiki:** `.dev-wiki/` — project lifecycle (phases, decisions, journal, status). Run `/dev-context` at session start.
{{HAS_KNOWLEDGE_WIKI}}- **Knowledge wiki:** `wiki/` — domain knowledge consumed by `/dev-plan` and `/wiki-query`.

## Precedence

When this file's content conflicts with `~/.claude/CLAUDE.md` on the same concern, this file wins (specificity rule, empirically verified — see the composition contract precedence test). When concerns are different, both apply.
