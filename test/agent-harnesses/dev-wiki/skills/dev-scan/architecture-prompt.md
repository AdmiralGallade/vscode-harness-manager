# Architecture Synthesis Prompt

Subagent prompt template for rewriting `_ARCHITECTURE.md` from scan findings. Read by dev-scan SKILL.md Step 6, Subagent A.

## Prompt

Rewrite `<WIKI_PATH>/_ARCHITECTURE.md` using the scan findings below.

Read `~/.claude/skills/dev-wiki/architecture-template.md` for formatting conventions (header style, noise filter list). Use the 10 sections below instead of the template's 6-section structure — this prompt extends the template.

### Scan Findings

<SCAN_FINDINGS>

### Python Context (Optional)

<PYTHON_CONTEXT>

If present, contains Python-specific findings from python-scan-profile.md and python-memory-checks.md. Include these findings in the Known Issues section (as Python-specific issues) and the Development Toolchain section (as Python toolchain details). If `<PYTHON_CONTEXT>` is empty or absent, skip this section.

### Required Sections (10 total — extends Section G)

Write ALL of these sections:

1. **Directory Layout** — deep tree with purpose annotations. Mark hub modules with importer counts.
2. **Module Responsibilities** — table: module, purpose, key entry points, inputs, outputs. Inputs/outputs are data dependencies (config files, env vars, databases, APIs), not code imports.
3. **Cross-File Dependency Map** — tiered: hub modules (10+ importers), shared infra (5-9), internal helpers (2-4).
4. **Cross-Package Coupling** — bidirectional import edges between packages.
5. **Dependencies** — internal module graph + external packages. Mark dead deps with `(unused)`.
6. **Data Flow** — structured table: `| Module | Reads (data) | Writes (data) | Env Vars | Notes |`. Populate by inferring data dependencies from imports, entry points, config file references, database connections, API calls, and env var usage. For modules with no detectable data I/O, write "—" in each column. Supplement with 1-2 sentences of prose if the data flow has non-obvious interactions.
7. **Known Issues** — severity-tagged, linked to files. From the Issues section of scan findings.
8. **Test Organization** — test dirs, frameworks, coverage metrics.
9. **Development Toolchain** — table with columns: Category, Tool, Config Path, Status. Categories: Testing, Type Checking, Linting/Formatting, Dependency Management, Build System, Virtual Environment. Status is one of: `detected (config path)`, `not detected`, `configured but no files` (e.g., pytest config exists but no test files). Include key settings where available (e.g., strict mode, coverage thresholds). From the Toolchain Findings section of scan findings. If no toolchain findings provided, write "Not scanned" and skip the table.
10. **Related** — cross-wiki links or "None yet".

### Constraints

- Write to: `<WIKI_PATH>/_ARCHITECTURE.md`
- Include `> Last updated: <TODAY> by /dev-scan` header
- Target 60-80 lines, hard cap 100 lines (see `~/.claude/skills/dev-wiki/size-budgets.md`)
- Do NOT create any files other than `_ARCHITECTURE.md`
- Do NOT modify source code
