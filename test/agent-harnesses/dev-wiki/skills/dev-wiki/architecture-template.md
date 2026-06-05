# architecture-template.md

Template for `_ARCHITECTURE.md`, the 7-section structural snapshot of the project. Consumed by `dev-scan`, `dev-debrief`, `dev-context`, and `dev-plan`.

## _ARCHITECTURE.md Template

7-section structural snapshot. Filter out noise directories: `__pycache__`, `.venv`, `venv`, `node_modules`, `.git`, `.dev-wiki`, `.tox`, `dist`, `build`, `.mypy_cache`, `.pytest_cache`, `*.egg-info`.

```markdown
# Architecture: <project-name>

> Last updated: <ISO-timestamp> by /<skill-name>

## Directory Layout

<project-root>/
  <dir>/                # <purpose> (<N> files)

## Module Responsibilities

| Module | Purpose | Key Entry Points | Inputs | Outputs |
|--------|---------|-----------------|--------|---------|

Inputs/Outputs columns track DATA dependencies (config files, data files, APIs, env vars consumed/produced), not code imports. Leave empty for pure-logic modules with no data I/O.

## Dependencies

| Package | Version | Role |
|---------|---------|------|

## Data Flow

This section tracks DATA dependencies across modules — what each module reads (config files, data files, APIs, databases, env vars) and what it writes (output files, DB records, artifacts, API calls). This is distinct from code-level imports tracked in `## Module Responsibilities` and file articles.

| Module | Reads (data) | Writes (data) | Env Vars | Notes |
|--------|-------------|---------------|----------|-------|
| <module> | <config.json, input.csv> | <output.db, report.html> | <DB_URL, API_KEY> | <pipeline stage, optional> |

Populate incrementally: `/dev-scan` seeds from static analysis where possible; `/dev-debrief` updates when data flow changes are observed during a session. Leave rows empty for modules with no data I/O. For complex data pipelines, add a prose paragraph below the table describing the end-to-end flow.

## Test Organization

| Directory | What It Tests | Count |
|-----------|---------------|-------|

## Development Toolchain

| Category | Tool | Config Path | Status |
|----------|------|-------------|--------|

Categories: Testing, Type Checking, Linting/Formatting, Dependency Management, Build System, Virtual Environment. Status: `detected`, `not detected`, or `configured (no files)`. Written by `/dev-scan` toolchain detection. Updated by `/dev-debrief` when tools change. Read by `/dev-context` (HEALTH line) and `/dev-plan` (pre-implementation gate). If not yet scanned, omit this section entirely (do not write an empty table).

## Related

- <cross-wiki links or "None yet">
```
